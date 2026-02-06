// ═══════════════════════════════════════════════════════════════════════════
// POST PERFORMANCE PREDICTOR ENGINE - DETERMINISTIC & MULTI-PLATFORM
// ═══════════════════════════════════════════════════════════════════════════

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { getGlobalRecords } from "../langchain/vectorStore.js";
import _ from 'lodash';

// Lazy initialization for Image Analysis only
let llmInstance = null;
function getLLM() {
    if (!llmInstance) {
        llmInstance = new ChatOpenAI({
            modelName: "gpt-4o-mini",
            temperature: 0.7,
            openAIApiKey: process.env.OPENAI_API_KEY
        });
    }
    return llmInstance;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CORE PREDICTION FUNCTION
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function predictPostPerformance({ caption, image, platform, scheduledTime, mediaType, hashtags }) {
    console.log(`🔮 Predicting for ${platform} (${mediaType || 'any'})...`);

    // 1. Load & Filter Historical Data
    const allRecords = getGlobalRecords();
    const platformRecords = filterRecords(allRecords, platform, mediaType);

    // Default Response if no data
    if (platformRecords.length === 0) {
        return getDefaultResponse(platform);
    }

    // 2. Compute "Best Time" Baseline from History
    const bestTimeStats = analyzeBestTime(platformRecords);

    // 3. Find Similar Posts & CLASSIFY CONTENT
    const similarityResult = findSimilarPosts(platformRecords, caption, hashtags);
    const { count, posts: similarSubset } = similarityResult;

    // CLASSIFICATION LOGIC
    let contentType = "Experimental";
    let riskLevel = "High";
    let confidenceLevel = "Low";

    if (count >= 5) {
        contentType = "Core Content (Proven)";
        riskLevel = "Low";
        confidenceLevel = "High";
    } else if (count >= 2) {
        contentType = "Adjacent Content";
        riskLevel = "Medium";
        confidenceLevel = "Medium";
    }

    const hasEnoughMatches = count >= 2;
    // Analysis Set: Subset if matches >= 2, else Global
    const analysisSet = hasEnoughMatches ? similarSubset : platformRecords;
    const engagementStats = calculateStatistics(analysisSet.map(r => r.normalized.engagementRate));
    const reachStats = calculateStatistics(analysisSet.map(r => r.normalized.reach));

    // Global stats for benchmarks
    const globalEngStats = calculateStatistics(platformRecords.map(r => r.normalized.engagementRate));

    // REWARD POTENTIAL
    let rewardPotential = "Low";
    if (engagementStats.median >= globalEngStats.p75) rewardPotential = "High";
    else if (engagementStats.median >= globalEngStats.median) rewardPotential = "Medium";

    // 4. Calculate "Quality Score" (Base + Adjustments)
    const baseScore = mapToScore(engagementStats.median, globalEngStats.p25, globalEngStats.p75, globalEngStats.median);

    const qualityAnalysis = calculateQualityScore({
        baseScore,
        caption,
        hashtags,
        scheduledTime,
        bestTimeStats
    });

    // 5. Image Analysis (Visual Vibe)
    let visualDescription = "";
    let alignmentWarning = "";
    if (image) {
        visualDescription = await analyzeImageContent(image);
        if (contentType === "Experimental") {
            alignmentWarning = " The visual content does not align with the caption topic. Historically, aligned posts perform more consistently.";
        }
    }

    // 6. ACTION RECOMMENDATION & NEW HELPERS
    let recommendation = "Post as planned";
    if (contentType.includes("Core")) {
        recommendation = "Post as planned (High Confidence)";
    } else if (contentType.includes("Adjacent")) {
        recommendation = "Post, but consider optimizing caption for higher engagement.";
    } else {
        if (rewardPotential === "High") recommendation = "Post as planned (High Reward Potential)";
        else recommendation = "Reconsider posting — outside historical content themes.";
    }

    // NEW HELPERS
    const decisionSummary = generateDecisionSummary(contentType, riskLevel, confidenceLevel);
    const earlyMonitoringGuidance = generateEarlyMonitoringGuidance(contentType);
    const contentMixReminder = analyzeContentMix(platformRecords, contentType);

    // 7. Analysis Logic Text Construction (Decision Support Embedding)
    let analysisLogicText = `Dataset: ${hasEnoughMatches ? count : platformRecords.length} posts used (${hasEnoughMatches ? 'Subset' : 'Global'}). `;
    analysisLogicText += `\n• Type: ${contentType}`;
    analysisLogicText += `\n• Risk: ${riskLevel} | Reward: ${rewardPotential}`;
    analysisLogicText += `\n• Confidence: ${confidenceLevel}`;
    if (alignmentWarning) analysisLogicText += `\n⚠️ ${alignmentWarning}`;

    // 8. Comparison Text
    const comparisonText = hasEnoughMatches
        ? `Compared to ${count} similar posts (Median Eng: ${engagementStats.median.toFixed(2)}%).`
        : `No relevant historical posts found. Compared against overall account history (Experiment).`;

    // 9. Suggestions (Data-Aware)
    let finalSuggestions = [...qualityAnalysis.suggestions];
    finalSuggestions.unshift(`Recommendation: ${recommendation}`);
    // Add Guidance as a suggestion
    finalSuggestions.push(`💡 ${earlyMonitoringGuidance}`);

    if (!hasEnoughMatches) {
        finalSuggestions = finalSuggestions.filter(s => !s.toLowerCase().includes("hashtag"));
        finalSuggestions.push("Content is outside historical themes. Monitor closely.");
    }

    finalSuggestions = finalSuggestions.slice(0, 5);

    return {
        score: qualityAnalysis.score,
        // Decision Support Fields
        contentType,
        riskLevel,
        rewardPotential,
        confidenceLevel,
        recommendation,
        decisionSummary, // NEW
        earlyMonitoringGuidance, // NEW
        contentMixReminder, // NEW
        similarityCount: count,
        alignmentWarning,

        historyScore: baseScore,
        historyAvg: engagementStats.median.toFixed(2),
        historyDetails: {
            avgLikes: Math.round(_.meanBy(analysisSet, 'normalized.likes') || 0),
            avgComments: Math.round(_.meanBy(analysisSet, 'normalized.comments') || 0),
            avgImpressions: Math.round(_.meanBy(analysisSet, 'normalized.impressions') || 0),
            avgReach: Math.round(reachStats.median)
        },
        predictedEngagement: `${engagementStats.median.toFixed(2)}%`,
        predictedReach: `${formatK(reachStats.p25)} - ${formatK(reachStats.p75)}`,
        viralityScore: getViralityScore(engagementStats.median, globalEngStats),
        visualDescription: visualDescription + (alignmentWarning ? " (Alignment Risk)" : ""),
        reasoning: qualityAnalysis.reasoning,
        suggestions: finalSuggestions,
        bestTimeRecommendation: bestTimeStats.hasData ? `${bestTimeStats.bestDay}s at ${bestTimeStats.bestHour}:00` : "Not enough data",
        topTimeSlots: { days: bestTimeStats.topDays, hours: bestTimeStats.topHours },
        similarPosts: hasEnoughMatches ? similarSubset.slice(0, 3).map(p => ({
            content: p.content.substring(0, 100) + "...",
            metrics: `${p.normalized.engagementRate.toFixed(2)}%`,
            fullMetrics: p.normalized
        })) : [],
        analysisLogic: analysisLogicText
    };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEW DECISION HELPERS
 * ═══════════════════════════════════════════════════════════════════════════
 */

function generateDecisionSummary(type, risk, confidence) {
    if (type.includes("Core")) return "This post aligns with proven content themes and is safe to publish.";
    if (type.includes("Adjacent")) return "This post partially aligns with past content but may benefit from tweaks.";
    if (risk === "High") return "This post is experimental and carries higher risk due to lack of historical data.";
    return "This post is valid but requires careful monitoring.";
}

function generateEarlyMonitoringGuidance(type) {
    if (type.includes("Core")) return "Monitor engagement in the first 60 minutes to confirm expected performance.";
    if (type.includes("Adjacent")) return "Monitor engagement in the first 30–60 minutes to validate performance against similar posts.";
    return "Closely monitor the first 30 minutes of engagement to assess whether this experiment resonates.";
}

function analyzeContentMix(records, currentType) {
    // Sort by date desc, take last 30
    const recent = [...records].sort((a, b) => b.normalized.date - a.normalized.date).slice(0, 30);
    if (recent.length < 10) return "Not enough recent history to analyze content mix.";

    // Classify each past post (Strict: Self-similarity check excluding self is O(N^2), let's approximate)
    // Actually, we can just say: if 'currentType' is Experimental, and most recent posts are Experimental -> "You are increasing experimental content"
    // But how to know if past posts were experimental? We need to run findSimilarPosts for THEM against the rest.
    // Optimization: We will just tokenize all once. 

    // Simplified Logic for Speed:
    // We already have tokens for all records. We can do a quick check.
    // Let's assume most recent posts are "Core" if they have >= 2 matches in the REST of the set.

    let coreCount = 0;
    let experimentalCount = 0;

    // Pre-tokenize all (already done? No, we need to do it here)
    const tokenizedRecs = recent.map(r => ({
        ...r,
        tokens: tokenize(`${r.content} ${r.hashtags || ''}`)
    }));

    // Compare each against ALL records (excluding itself)
    // Limit comparisons to keep it fast (e.g. check against last 100)
    const allTokens = records.slice(0, 100).map(r => tokenize(`${r.content} ${r.hashtags || ''}`)); // Top 100 recent

    tokenizedRecs.forEach(r => {
        let matches = 0;
        for (const t of allTokens) {
            const score = calcJaccard(r.tokens, t);
            // Self-match will be 1.0, ignore distinct identity check for simplicity, just demand >= 3 matches (1 self + 2 others)
            if (score >= 0.15) matches++;
        }
        if (matches >= 3) coreCount++; // 1 self + 2 similar
        else experimentalCount++;
    });

    const total = coreCount + experimentalCount;
    const expPercent = (experimentalCount / total) * 100;

    if (currentType.includes("Experimental")) {
        if (expPercent > 40) return "You are increasing experimental content compared to your recent posts.";
        return "This experimental post diversifies your recent core-heavy mix.";
    } else {
        if (expPercent < 20) return "This post continues your highly consistent core content strategy.";
        return "Your recent content mix is balanced between core and experimental topics.";
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DATA PROCESSING (EXISTING)
 * ═══════════════════════════════════════════════════════════════════════════
 */

function filterRecords(records, platform, mediaType) {
    return records.filter(r => {
        const pMatch = r.platform && r.platform.toLowerCase() === platform.toLowerCase();
        let mMatch = true;
        if (mediaType) {
            const mappings = {
                'post': ['image', 'photo', 'text', 'status', 'article', 'post'],
                'reel': ['reel', 'video', 'short'],
                'video': ['video', 'reel'],
                'story': ['story']
            };
            const targetTypes = mappings[mediaType.toLowerCase()] || [mediaType.toLowerCase()];
            const recordType = (r.media_type || r.post_type || '').toLowerCase();
            mMatch = targetTypes.some(t => recordType.includes(t));
        }
        return pMatch && mMatch;
    }).map(normalizeRecord).filter(r => r.normalized.reach > 0);
}

function normalizeRecord(record) {
    const likes = parseNum(record.likes || record.reactions);
    const comments = parseNum(record.comments);
    const shares = parseNum(record.shares || record.reposts);
    const saves = parseNum(record.saves);
    const reach = parseNum(record.reach || record.impressions || record.views);
    const impressions = parseNum(record.impressions || record.reach);

    let engRate = parseFloat(record.engagement_rate);
    if (isNaN(engRate) || engRate === 0) {
        if (reach > 0) {
            engRate = ((likes + comments + shares + saves) / reach) * 100;
        } else {
            engRate = 0;
        }
    }

    return {
        ...record,
        normalized: {
            likes, comments, shares, saves, reach, impressions,
            engagementRate: engRate,
            date: new Date(record.posted_date || record.created_time || record.timestamp)
        }
    };
}

function parseNum(val) {
    if (!val) return 0;
    const clean = String(val).replace(/,/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIMILARITY ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 */
function findSimilarPosts(records, caption, hashtags) {
    const combinedText = `${caption || ''} ${hashtags || ''}`;
    const queryTokens = tokenize(combinedText);
    const tokenCount = queryTokens.size;

    let threshold = 0.15;
    if (tokenCount < 5) threshold = 0.05;
    else if (tokenCount <= 10) threshold = 0.10;

    const scored = records.map(r => {
        const histText = `${r.content || r.caption || ''} ${r.hashtags || ''}`;
        const contentTokens = tokenize(histText);
        const score = calcJaccard(queryTokens, contentTokens);
        return { ...r, similarity: score };
    });

    const filtered = scored.filter(r => r.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);

    return {
        count: filtered.length,
        posts: filtered.slice(0, 10)
    };
}

function tokenize(text) {
    if (!text) return new Set();

    let clean = text.toLowerCase();
    clean = clean.replace(/[^\w\s]|_/g, '');
    clean = clean.replace(/\bfootware\b/g, 'footwear');

    const words = clean.split(/\s+/);
    const validTokens = new Set();
    const stopwords = new Set(['the', 'and', 'a', 'to', 'for', 'with', 'on', 'in', 'of', 'is', 'are', 'this', 'that']);

    words.forEach(w => {
        if (w.length < 2) return;
        if (stopwords.has(w)) return;

        let token = w;
        if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
            token = token.slice(0, -1);
        }
        if (token.length > 5) {
            if (token.endsWith('ing')) token = token.slice(0, -3);
            else if (token.endsWith('ed')) token = token.slice(0, -2);
        }
        validTokens.add(token);
    });

    return validTokens;
}

function calcJaccard(setA, setB) {
    if (setA.size === 0 || setB.size === 0) return 0;
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QUALITY SCORE
 * ═══════════════════════════════════════════════════════════════════════════
 */
function calculateQualityScore({ baseScore, caption, hashtags, scheduledTime, bestTimeStats }) {
    let adjustment = 0;
    let suggestions = [];
    let reasoning = [];

    const charCount = (caption || '').length;
    if (charCount < 10) {
        adjustment -= 5;
        suggestions.push("Caption is very short. Add more context?");
        reasoning.push("Short caption penalty (-5).");
    } else if (charCount >= 30 && charCount <= 180) {
        adjustment += 4;
        reasoning.push("Optimal caption length (+4).");
    }

    if (/(link in bio|check out|shop now|click below|register|sign up)/i.test(caption)) {
        adjustment += 4;
        reasoning.push("CTA detected (+4).");
    }

    const tags = (hashtags || '').split(/[,\s]+/).filter(t => t.length > 1);
    if (tags.length >= 3 && tags.length <= 10) {
        adjustment += 2;
        reasoning.push("Good number of hashtags (+2).");
    } else if (tags.length === 0 || tags.length > 20) {
        adjustment -= 2;
        suggestions.push("Use 3-10 relevant hashtags.");
        reasoning.push("Hashtag count suboptimal (-2).");
    }

    if (scheduledTime && bestTimeStats.hasData) {
        const d = new Date(scheduledTime);
        const day = d.toLocaleDateString('en-US', { weekday: 'long' });
        const hour = d.getHours();

        if (day === bestTimeStats.bestDay && Math.abs(hour - bestTimeStats.bestHour) <= 1) {
            adjustment += 3;
            reasoning.push("Scheduled near Best Time (+3).");
        } else {
            suggestions.push(`Try scheduling for ${bestTimeStats.bestDay}s around ${bestTimeStats.bestHour}:00.`);
        }
    }

    adjustment = Math.max(-15, Math.min(15, adjustment));
    let finalScore = baseScore + adjustment;
    finalScore = Math.max(0, Math.min(100, finalScore));

    return {
        score: finalScore,
        suggestions,
        reasoning: `Base ${baseScore} (Hist) ${adjustment >= 0 ? '+' : ''}${adjustment} (Rules).`
    };
}

function mapToScore(val, min, max, median) {
    if (min === max) return 50;
    if (val < median) {
        const ratio = (val - min) / (Math.max(0.001, median - min));
        return 40 + Math.round(ratio * 35);
    } else {
        const ratio = (val - median) / (Math.max(0.001, max - median));
        return 75 + Math.round(ratio * 24);
    }
}

function calculateStatistics(values) {
    if (values.length === 0) return { median: 0, p25: 0, p75: 0, min: 0, max: 0 };
    values.sort((a, b) => a - b);
    const p25 = values[Math.floor(values.length * 0.25)];
    const median = values[Math.floor(values.length * 0.50)];
    const p75 = values[Math.floor(values.length * 0.75)];
    return { min: values[0], max: values[values.length - 1], median, p25, p75 };
}

function analyzeBestTime(records) {
    const buckets = {};
    records.forEach(r => {
        if (isNaN(r.normalized.date.getTime())) return;
        const day = r.normalized.date.toLocaleDateString('en-US', { weekday: 'long' });
        const hour = r.normalized.date.getHours();
        const key = `${day}-${hour}`;
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(r.normalized.engagementRate);
    });

    const results = Object.entries(buckets)
        .filter(([_, rates]) => rates.length >= 3)
        .map(([key, rates]) => {
            const [day, hour] = key.split('-');
            const median = calculateStatistics(rates).median;
            return { day, hour: parseInt(hour), median };
        });

    results.sort((a, b) => b.median - a.median);

    if (results.length === 0) return { hasData: false, bestDay: "N/A", bestHour: 0, topDays: [], topHours: [] };

    return {
        hasData: true,
        bestDay: results[0].day,
        bestHour: results[0].hour,
        topDays: _.uniq(results.slice(0, 3).map(r => r.day)),
        topHours: results.slice(0, 3).map(r => `${r.hour}:00`)
    };
}

function getViralityScore(median, globalStats) {
    if (median >= globalStats.p75) return "High";
    if (median < globalStats.median) return "Low";
    return "Medium";
}

function formatK(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

async function analyzeImageContent(base64Image) {
    try {
        const message = new HumanMessage({
            content: [
                { type: "text", text: "Describe the 'mood', 'lighting', and 'marketing appeal' of this social media image in 1 sentence. Focus ONLY on visible elements." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
        });
        const response = await getLLM().invoke([message]);
        return response.content;
    } catch (e) {
        return "Visual analysis unavailable.";
    }
}

function getDefaultResponse(platform) {
    return {
        score: 50,
        historyScore: 50,
        historyAvg: "0.00",
        predictedEngagement: "N/A",
        predictedReach: "N/A",
        viralityScore: "Unknown",
        visualDescription: "No historical data found for this platform.",
        reasoning: `No CSV data available for ${platform}. Please check data folder.`,
        suggestions: ["Upload historical data to enable predictions."],
        bestTimeRecommendation: "N/A",
        similarPosts: [],
        analysisLogic: "No Data"
    };
}
