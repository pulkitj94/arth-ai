// ═══════════════════════════════════════════════════════════════════════════
// EXPRESS SERVER - SOCIAL MEDIA COMMAND CENTER (ROI & SCENARIO ENABLED)
// ═══════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { parse } from 'csv-parse/sync';
import cron from 'node-cron';
import attributionRoutes from './routes/attribution.js';


// Existing project imports
import chatRoutes from './routes/chat.js';
import predictorRoutes from './routes/predictor.js';
import { initializeVectorStore } from './langchain/vectorStore.js';
import { startCacheCleanup } from './utils/cache.js';
import { startPeriodicAnalytics } from './utils/queryLogger.js';
import { getFileWatcher } from './utils/fileWatcher.js';
import { getQueryProcessor } from './llm/queryProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use('/api/attribution', attributionRoutes);

app.use(express.json({ limit: '50mb' })); // Increased limit for image uploads
app.use('/api/predict', predictorRoutes);

// ═══════════════════════════════════════════════════════════════════════════
// SHARED SIMULATION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

const runSimulationScenario = (scenario = "normal") => {
  const flag = scenario === "normal" ? "--once" : `--${scenario}`;
  console.log(`⚡ [SYSTEM] Triggering Scenario: ${scenario.toUpperCase()}`);

  exec(`python3 ../scripts/mock_streamer.py ${flag}`, (err) => {
    if (err) return console.error(`❌ Scenario ${scenario} failed:`, err);
    console.log(`📝 Mock Data Injected (${scenario}).`);

    exec('python3 ../scripts/sentiment_engine.py', (err2) => {
      if (err2) return console.error("❌ AI Engine Step Failed:", err2);
      console.log("🤖 AI Re-analysis Complete. Dashboard Live.");
    });
  });
};

cron.schedule('0 * * * *', () => {
  runSimulationScenario("normal");
});

// ═══════════════════════════════════════════════════════════════════════════
// NEW: ROI MATRIX ANALYTICS ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/analytics/roi-matrix', async (req, res) => {
  try {
    const dataDir = path.join(__dirname, 'data');

    // 1. Load Ads Data from all platforms
    const adFiles = [
      'facebook_ads_ad_campaigns.csv',
      'instagram_ads_ad_campaigns.csv',
      'google_ads_ad_campaigns.csv'
    ];

    let allAds = [];
    for (const file of adFiles) {
      try {
        const content = await fs.readFile(path.join(dataDir, file), 'utf8');
        const parsed = parse(content, { columns: true, skip_empty_lines: true });
        allAds = [...allAds, ...parsed];
      } catch (e) { console.log(`Note: ${file} not found or empty.`); }
    }

    // 2. Load Sentiment Data
    const sentimentContent = await fs.readFile(path.join(dataDir, 'enriched_comments_sentiment.csv'), 'utf8');
    const comments = parse(sentimentContent, { columns: true, skip_empty_lines: true });

    // 3. Merge Logic: Match Spend to Sentiment by platform and campaign type
    // Group comments by platform to get platform-wide sentiment
    const platformSentiment = {};
    ['Facebook', 'Instagram', 'Google', 'Twitter'].forEach(platform => {
      const platformComments = comments.filter(c =>
        c.platform.toLowerCase().includes(platform.toLowerCase())
      );
      const pos = platformComments.filter(c => c.label === 'positive').length;
      const neg = platformComments.filter(c => c.label === 'negative').length;
      const total = platformComments.length;

      platformSentiment[platform] = {
        nss: total > 0 ? ((pos - neg) / total) * 100 : 0,
        volume: total
      };
    });

    // Create scatter plot data points from ad campaigns with platform sentiment
    const matrix = allAds.map(ad => {
      const platformKey = ad.platform.split(' ')[0]; // Extract "Facebook" from "Facebook Ads"
      const sentiment = platformSentiment[platformKey] || { nss: 0, volume: 0 };

      // Add some variation to sentiment based on campaign type and spend
      // Higher spend campaigns might have slightly different sentiment
      const spendFactor = parseFloat(ad.total_spend) > 50000 ? 1.1 : 0.9;
      const variationFactor = (Math.random() * 0.4 - 0.2); // -20% to +20% variation
      const adjustedSentiment = sentiment.nss * spendFactor * (1 + variationFactor);

      return {
        name: ad.campaign_name,
        spend: parseFloat(ad.total_spend) || 0,
        sentiment: Math.round(Math.max(-100, Math.min(100, adjustedSentiment))),
        volume: Math.max(10, Math.round(sentiment.volume * (parseFloat(ad.total_spend) / 50000))),
        platform: ad.platform,
        clicks: parseInt(ad.clicks) || 0
      };
    }).filter(item => item.spend > 0); // Only show active campaigns

    res.json(matrix);
  } catch (error) {
    console.error("ROI Matrix aggregation failed:", error);
    res.json([]);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EXISTING DASHBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/simulate/trigger', (req, res) => {
  const { scenario } = req.body;
  runSimulationScenario(scenario || "normal");
  res.json({ success: true, message: `Scenario ${scenario} started.` });
});

app.get('/api/sentiment/summary', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(__dirname, 'data', 'platform_sentiment_summary.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (e) { res.status(404).json({ success: false }); }
});

app.get('/api/sentiment/history', async (req, res) => {
  try {
    const fileContent = await fs.readFile(path.join(__dirname, 'data', 'sentiment_history.csv'), 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    const chartData = records.reduce((acc, curr) => {
      const time = curr.timestamp;
      let entry = acc.find(item => item.timestamp === time);
      if (!entry) { entry = { timestamp: time }; acc.push(entry); }
      const pKey = curr.platform.charAt(0).toUpperCase() + curr.platform.slice(1).toLowerCase();
      entry[pKey] = parseFloat(curr.health_score);
      return acc;
    }, []);
    res.json(chartData.slice(-15));
  } catch (e) { res.json([]); }
});

app.get('/api/sentiment/negative-alerts', async (req, res) => {
  try {
    const csvPath = path.join(__dirname, 'data', 'enriched_comments_sentiment.csv');
    const fileContent = await fs.readFile(csvPath, 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    const alerts = records.filter(r => (r.label || "").toLowerCase().includes('neg')).slice(-5).reverse();
    res.json(alerts);
  } catch (error) { res.json([]); }
});

// 📊 NEW: Dashboard Aggregated Stats Endpoint
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const files = [
      'facebook_organic_posts.csv', 'instagram_organic_posts.csv', 'twitter_organic_posts.csv', 'linkedin_organic_posts.csv',
      'facebook_ads_ad_campaigns.csv', 'instagram_ads_ad_campaigns.csv', 'google_ads_ad_campaigns.csv'
    ];

    const range = req.query.range || '30';
    const now = new Date();

    // Define Current Period
    let currentStart = null;
    let currentEnd = new Date(); // Default end is now

    // Define Previous Period
    let prevStart = null;
    let prevEnd = null;

    if (range === 'custom') {
      if (req.query.startDate) currentStart = new Date(req.query.startDate);
      if (req.query.endDate) currentEnd = new Date(req.query.endDate);

      // Calculate duration for previous period
      if (currentStart && currentEnd) {
        const duration = currentEnd - currentStart;
        prevEnd = new Date(currentStart);
        prevStart = new Date(prevEnd - duration);
      }
    } else if (range !== 'all') {
      const days = parseInt(range);
      currentStart = new Date();
      currentStart.setDate(now.getDate() - days);

      prevEnd = new Date(currentStart);
      prevStart = new Date();
      prevStart.setDate(prevEnd.getDate() - days);
    }

    // Metrics Containers
    const currentMetrics = { reach: 0, engagement: 0, impressions: 0, clicks: 0, posts: 0 };
    const prevMetrics = { reach: 0, engagement: 0, impressions: 0, clicks: 0, posts: 0 };

    // Charts Data Containers
    const dailyImpressionsMap = {}; // Date -> Count
    const dailyEngagementMap = {}; // Date -> Count
    const dailyReachMap = {}; // Date -> Count
    const organicDistributionMap = {}; // Platform -> Post Count
    const adsDistributionMap = {}; // Platform -> Campaign Count

    // Top Posts
    let allPosts = [];

    for (const file of files) {
      try {
        const filePath = path.join(__dirname, 'data', file);
        const content = await fs.readFile(filePath, 'utf8');
        const records = parse(content, { columns: true, skip_empty_lines: true });

        // Identify file type
        const isOrganic = file.includes('organic');
        const isAds = file.includes('ads');

        records.forEach(row => {
          // Date Filter Logic
          let dateStr = row.date || row.posted_date || row.start_date || row.timestamp;
          let rowDate = null;

          if (dateStr) {
            // Handle DD-MM-YYYY format (e.g. 15-10-2025)
            if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
              const [d, m, y] = dateStr.split('-');
              rowDate = new Date(`${y}-${m}-${d}`);
            } else {
              // Handle standard YYYY-MM-DD or ISO
              rowDate = new Date(dateStr);
            }
          }

          if (rowDate && !isNaN(rowDate)) {
            // Metrics Extraction
            const impressions = parseInt(row.impressions || row.views || 0);
            const reach = parseInt(row.reach || 0);
            const engagement = parseInt(row.engagement || row.interactions || row.likes || 0) + parseInt(row.comments || 0) + parseInt(row.shares || 0);
            const clicks = parseInt(row.clicks || 0);

            // Check if in Current Period
            const isInCurrent = (!currentStart || rowDate >= currentStart) && (!currentEnd || rowDate <= currentEnd);

            // Check if in Previous Period (only relevant if range isn't 'all')
            const isInPrevious = range !== 'all' && prevStart && prevEnd && (rowDate >= prevStart && rowDate < prevEnd);

            if (isInCurrent) {
              currentMetrics.impressions += impressions;
              currentMetrics.reach += reach;
              currentMetrics.engagement += engagement;
              currentMetrics.clicks += clicks;
              currentMetrics.posts++;

              // Platform Distribution
              const platform = row.platform || file.split('_')[0];
              const pKey = platform.charAt(0).toUpperCase() + platform.slice(1);

              if (isOrganic) {
                organicDistributionMap[pKey] = (organicDistributionMap[pKey] || 0) + 1;
              } else if (isAds) {
                adsDistributionMap[pKey] = (adsDistributionMap[pKey] || 0) + 1;
              }

              // Daily Aggregation (Group by Date)
              if (dateStr) {
                // Determine format
                let dateKey = dateStr;
                if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
                  // normalize to YYYY-MM-DD for sorting
                  const [d, m, y] = dateStr.split('-');
                  dateKey = `${y}-${m}-${d}`;
                }

                if (isInCurrent) {
                  dailyImpressionsMap[dateKey] = (dailyImpressionsMap[dateKey] || 0) + impressions;
                  dailyEngagementMap[dateKey] = (dailyEngagementMap[dateKey] || 0) + engagement;
                  dailyReachMap[dateKey] = (dailyReachMap[dateKey] || 0) + reach;
                }
              }

              // Collect for Top Posts
              if (file.includes('organic')) {
                allPosts.push({
                  title: row.content ? row.content.substring(0, 40) + '...' : (row.caption ? row.caption.substring(0, 40) + '...' : row.campaign_name || 'Untitled Post'),
                  platform: pKey,
                  date: row.date,
                  engagement: engagement,
                  iconType: pKey.toLowerCase(),
                  type: row.media_type ? (row.media_type.charAt(0).toUpperCase() + row.media_type.slice(1)) : 'Post'
                });
              }
            }

            if (isInPrevious) {
              prevMetrics.impressions += impressions;
              prevMetrics.reach += reach;
              prevMetrics.engagement += engagement;
              prevMetrics.clicks += clicks;
            }
          }
        });

      } catch (err) {
        console.warn(`⚠️ Could not read ${file}: ${err.message}`);
      }
    }

    // Calculate Overall Sentiment Score from Summary JSON
    let overallSentiment = 0;
    try {
      const sentData = await fs.readFile(path.join(__dirname, 'data', 'platform_sentiment_summary.json'), 'utf8');
      const sentSummary = JSON.parse(sentData);
      if (sentSummary.length > 0) {
        const totalScore = sentSummary.reduce((acc, curr) => acc + curr.health_score, 0);
        overallSentiment = Math.round(totalScore / sentSummary.length);
      }
    } catch (e) {
      console.warn('⚠️ Could not read sentiment summary for overall score');
    }

    // Helper to calculate trend
    const calculateTrend = (curr, prev) => {
      if (range === 'all') return { val: null, pos: true };
      if (prev === 0) return { val: curr > 0 ? '+100%' : '0%', pos: true };
      const change = ((curr - prev) / prev) * 100;
      return {
        val: (change >= 0 ? '+' : '') + Math.round(change) + '%',
        pos: change >= 0
      };
    };

    const reachTrend = calculateTrend(currentMetrics.reach, prevMetrics.reach);
    const engTrend = calculateTrend(currentMetrics.engagement, prevMetrics.engagement);
    const impTrend = calculateTrend(currentMetrics.impressions, prevMetrics.impressions);

    // Engagement Rate
    const currEngRate = currentMetrics.impressions > 0 ? (currentMetrics.engagement / currentMetrics.impressions) * 100 : 0;
    const prevEngRate = prevMetrics.impressions > 0 ? (prevMetrics.engagement / prevMetrics.impressions) * 100 : 0;
    const rateTrend = calculateTrend(currEngRate, prevEngRate);

    // Format Data for Frontend
    // Helper to format date keys for charts
    const formatChartData = (mapData) => {
      return Object.keys(mapData)
        .sort() // Sort by date YYYY-MM-DD
        .map(dateKey => {
          const dateObj = new Date(dateKey);
          return {
            name: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: mapData[dateKey],
            fullDate: dateKey
          };
        });
    };

    const impressionsChart = formatChartData(dailyImpressionsMap);
    const engagementChart = formatChartData(dailyEngagementMap);
    const reachChart = formatChartData(dailyReachMap);

    // Charts: Platform Distribution
    const totalOrganic = Object.values(organicDistributionMap).reduce((a, b) => a + b, 0);
    const organicDistribution = Object.keys(organicDistributionMap).map(key => ({
      name: key,
      value: organicDistributionMap[key],
      percentage: totalOrganic > 0 ? ((organicDistributionMap[key] / totalOrganic) * 100).toFixed(1) : 0
    }));

    const totalAds = Object.values(adsDistributionMap).reduce((a, b) => a + b, 0);
    const adsDistribution = Object.keys(adsDistributionMap).map(key => ({
      name: key,
      value: adsDistributionMap[key],
      percentage: totalAds > 0 ? ((adsDistributionMap[key] / totalAds) * 100).toFixed(1) : 0
    }));

    // Top Posts
    const topPostsList = allPosts
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5)
      .map(p => ({
        ...p,
        engagement: p.engagement > 1000 ? (p.engagement / 1000).toFixed(1) + 'K' : p.engagement,
        type: p.type
      }));

    res.json({
      kpis: [
        { title: 'Reach', value: currentMetrics.reach > 1000000 ? (currentMetrics.reach / 1000000).toFixed(1) + 'M' : (currentMetrics.reach / 1000).toFixed(1) + 'K', label: 'Reach', trend: reachTrend.val, trendIsPositive: reachTrend.pos, color: 'brand' },
        { title: 'Total Engagement', value: currentMetrics.engagement > 1000 ? (currentMetrics.engagement / 1000).toFixed(0) + 'K' : currentMetrics.engagement, label: 'Total Engagement', trend: engTrend.val, trendIsPositive: engTrend.pos, color: 'accent' },
        { title: 'Impressions', value: currentMetrics.impressions > 1000000 ? (currentMetrics.impressions / 1000000).toFixed(1) + 'M' : (currentMetrics.impressions / 1000).toFixed(1) + 'K', label: 'Impressions', trend: impTrend.val, trendIsPositive: impTrend.pos, color: 'brand' },
        { title: 'Engagement Rate', value: currEngRate.toFixed(2) + '%', label: 'Engagement Rate', trend: rateTrend.val, trendIsPositive: rateTrend.pos, color: 'accent' },
        { title: 'Sentiment Health', value: overallSentiment + '/100', label: 'Overall Sentiment', trend: 'Stable', trendIsPositive: true, color: 'brand' }
      ],
      charts: {
        dailyImpressions: impressionsChart,
        engagementTrend: engagementChart,
        audienceTrend: reachChart,
        organicDistribution: organicDistribution,
        adsDistribution: adsDistribution
      },
      topPosts: topPostsList
    });

  } catch (error) {
    console.error('❌ Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

app.post('/api/sentiment/refresh', (req, res) => {
  exec('python3 ../scripts/sentiment_engine.py', (error) => {
    if (error) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});

app.post('/api/sentiment/generate-reply', async (req, res) => {
  const { comment, platform } = req.body;
  try {
    const prompt = `Reply to this comment on ${platform}: "${comment}". Max 2 sentences.`;
    const reply = await getQueryProcessor().processQuery(prompt);
    res.json({ success: true, reply: reply.response });
  } catch (error) { res.status(500).json({ success: false }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════════════════

app.use('/api/chat', chatRoutes);
app.get('/health', (req, res) => res.json({ status: 'healthy' }));

async function startServer() {
  try {
    await initializeVectorStore();
    startCacheCleanup(10);
    startPeriodicAnalytics();
    const fileWatcher = getFileWatcher();
    fileWatcher.start();
    fileWatcher.onChange(() => getQueryProcessor().clearCache());

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ SERVER READY on http://localhost:${PORT}`);
      console.log(`🕒 Cron Active: Hourly Normal Simulation`);
    });
  } catch (error) { process.exit(1); }
}

startServer();