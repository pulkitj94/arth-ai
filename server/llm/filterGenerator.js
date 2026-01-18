import { ChatOpenAI } from '@langchain/openai';
import { LANGCHAIN_CONFIG } from '../langchain/config.js';
import { getFilterCache } from '../utils/filterCache.js';

/**
 * LLM-based filter generator
 * Uses GPT to intelligently create filter conditions based on user queries
 */
class FilterGenerator {
  constructor() {
    this.llm = null; // Lazy initialization
    this.cache = getFilterCache();
  }

  getLLM() {
    if (!this.llm) {
      this.llm = new ChatOpenAI({
        modelName: LANGCHAIN_CONFIG.llm.modelName,
        temperature: 0.1, // Low temperature for deterministic filter generation
        maxTokens: 1500,
      });
    }
    return this.llm;
  }

  /**
   * Classify query type to apply appropriate filtering strategy
   * FIX 4: Added query type classification
   */
  classifyQueryType(userQuery) {
    const query = userQuery.toLowerCase();

    // Comparative ranking queries
    if (/worst|best|top\s+\d*\s*|bottom|highest|lowest|most|least/i.test(query)) {
      // Check if asking for individual items or categories
      const individualPatterns = /\b(post|campaign|ad|tweet|content|item)\b/i;
      const categoryPatterns = /\b(platform|type|format|objective|theme|category)\b/i;

      if (individualPatterns.test(query) && !categoryPatterns.test(query)) {
        return 'ranking_individual';
      }
      return 'ranking_category';
    }

    // Comparative analysis
    if (/compare|vs|versus|difference\s+between/i.test(query)) {
      return 'comparative';
    }

    // Temporal queries
    if (/q1|q2|q3|q4|quarter|last\s+(week|month|year)/i.test(query)) {
      return 'temporal';
    }

    // Counting queries
    if (/how\s+many|number\s+of|count/i.test(query)) {
      return 'counting';
    }

    return 'factual';
  }


  /**
   * POST-PROCESSING: Fix common LLM mistakes
   * This is the KEY addition - validates and corrects LLM output
   */
  postProcessFilters(filterSpec, queryType, userQuery) {
    console.log('🔧 Post-processing filters for query type:', queryType);

    const fixes = [];

    // FIX 0: Auto-filter to ad platforms when query mentions ad-specific metrics or "paid channels"
    const lowerQuery = userQuery.toLowerCase();
    const adSpecificMetrics = ['cost per conversion', 'cost_per_conversion', 'cpc', 'cost per click', 'roas', 'return on ad spend', 'ad spend', 'ctr', 'click-through'];
    const paidChannelKeywords = ['paid channel', 'paid platform', 'ad campaign', 'advertising', 'ads performance'];
    const hasAdMetric = adSpecificMetrics.some(metric => lowerQuery.includes(metric));
    const hasPaidKeyword = paidChannelKeywords.some(keyword => lowerQuery.includes(keyword));

    // Check if already filtering by platform
    const hasExplicitPlatformFilter = filterSpec.filters && filterSpec.filters.some(f => {
      if (f.column === 'platform') return true;
      if (f.type === 'or' || f.type === 'and') {
        return f.conditions && f.conditions.some(c => c.column === 'platform');
      }
      return false;
    });

    // If asking about ad metrics or paid channels but no platform filter exists, add one
    if ((hasAdMetric || hasPaidKeyword) && !hasExplicitPlatformFilter) {
      // Initialize filters array if needed
      if (!filterSpec.filters) {
        filterSpec.filters = [];
      }

      // Add filter for ad platforms (platforms ending with "Ads")
      filterSpec.filters.push({
        type: 'or',
        conditions: [
          { column: 'platform', operator: 'equals', value: 'Facebook Ads' },
          { column: 'platform', operator: 'equals', value: 'Instagram Ads' },
          { column: 'platform', operator: 'equals', value: 'Google Ads' }
        ]
      });

      fixes.push('Added automatic filter for ad platforms (Facebook Ads, Instagram Ads, Google Ads) due to ad-specific metrics in query');
      console.log('🔧 AUTO-FIX: Query mentions ad-specific metrics/paid channels - restricting to ad platforms only');
    }

    // FIX 1: Remove empty sortBy objects (causes validation errors)
    if (filterSpec.sortBy && typeof filterSpec.sortBy === 'object') {
      if (Object.keys(filterSpec.sortBy).length === 0 || !filterSpec.sortBy.column) {
        delete filterSpec.sortBy;
        fixes.push('Removed empty sortBy object');
      }
    }

    // FIX 2: Counting queries should not have sortBy
    if (queryType === 'counting') {
      if (filterSpec.sortBy) {
        delete filterSpec.sortBy;
        fixes.push('Removed sortBy from counting query');
      }

      // Ensure we're using a valid column for counting
      if (filterSpec.aggregate) {
        const aggKeys = Object.keys(filterSpec.aggregate);
        if (aggKeys.length > 0) {
          const aggColumn = aggKeys[0];
          // If using invalid column name, replace with post_id or campaign_id
          if (aggColumn === 'metric_column' || aggColumn === 'column_name' || aggColumn === 'field') {
            const validColumn = userQuery.toLowerCase().includes('campaign') ? 'campaign_id' : 'post_id';
            filterSpec.aggregate = { [validColumn]: 'count' };
            fixes.push(`Fixed aggregation column: ${aggColumn} → ${validColumn}`);
          }
        }
      }
    }

    // FIX 3: Comparative ranking queries need higher limits and proper structure
    if (queryType === 'ranking_category') {
      // Ensure we're grouping for comparison
      if (!filterSpec.groupBy || filterSpec.groupBy.length === 0) {
        // Detect what to group by from query
        const query = userQuery.toLowerCase();
        if (query.includes('platform')) {
          filterSpec.groupBy = ['platform'];
          fixes.push('Added platform groupBy for comparative query');
        }
        if (query.includes('type') || query.includes('format')) {
          if (!filterSpec.groupBy) filterSpec.groupBy = [];
          if (query.includes('post') || query.includes('content')) {
            filterSpec.groupBy.push('media_type');
            fixes.push('Added media_type groupBy for post type comparison');
          }
        }
        // If asking for "worst/best post type", group by both platform and media_type
        if ((query.includes('worst') || query.includes('best')) &&
          (query.includes('post type') || query.includes('content type'))) {
          filterSpec.groupBy = ['platform', 'media_type'];
          fixes.push('Added platform+media_type groupBy for post type comparison');
        }
      }

      // Ensure proper aggregation exists
      if (!filterSpec.aggregate || Object.keys(filterSpec.aggregate).length === 0) {
        filterSpec.aggregate = { 'engagement_rate': 'mean' };
        fixes.push('Added default engagement_rate aggregation');
      }

      // Ensure sortBy exists for ranking
      if (!filterSpec.sortBy || !filterSpec.sortBy.column) {
        const aggColumn = Object.keys(filterSpec.aggregate)[0];
        const order = userQuery.toLowerCase().includes('worst') ||
          userQuery.toLowerCase().includes('lowest') ? 'asc' : 'desc';
        filterSpec.sortBy = { column: aggColumn, order };
        fixes.push(`Added sortBy: ${aggColumn} ${order}`);
      }

      // CRITICAL: Increase limit to show all categories for comparison
      // ALWAYS set high limit for ranking queries, even if LLM already set one
      if (!filterSpec.limit || filterSpec.limit < 20) {
        filterSpec.limit = 20; // Show ALL platform x type combinations (increased from 15)
        fixes.push(`Increased limit to 20 for comprehensive comparative ranking (was: ${filterSpec.limit || 'none'})`);
      }

      // Remove restrictive filters for "worst/best" queries
      if (userQuery.toLowerCase().includes('worst') || userQuery.toLowerCase().includes('best')) {
        if (filterSpec.filters && filterSpec.filters.length > 0) {
          // Keep only date/platform filters, remove performance filters
          filterSpec.filters = filterSpec.filters.filter(f => {
            const isDateFilter = f.column && f.column.includes('date');
            const isPlatformFilter = f.column && f.column.includes('platform');
            const isPerformanceFilter = f.column &&
              (f.column.includes('engagement') || f.column.includes('rate') ||
                f.column.includes('likes') || f.column.includes('reach'));
            return (isDateFilter || isPlatformFilter) && !isPerformanceFilter;
          });
          if (filterSpec.filters.length === 0) {
            delete filterSpec.filters;
            fixes.push('Removed restrictive filters for worst/best comparison');
          }
        }
      }
    }

    // FIX 4: Temporal comparative queries need higher limits
    if (queryType === 'temporal' || (queryType === 'comparative' && userQuery.toLowerCase().match(/q[1-4]|quarter/))) {
      if (filterSpec.groupBy && filterSpec.groupBy.length > 0) {
        // This is a comparison across time
        if (!filterSpec.limit || filterSpec.limit < 6) {
          filterSpec.limit = 10; // Show all platforms/categories
          fixes.push('Increased limit to 10 for temporal comparison');
        }
      }
    }

    // FIX 5: Individual ranking queries should NOT have groupBy or aggregate
    if (queryType === 'ranking_individual') {
      if (filterSpec.groupBy && filterSpec.groupBy.length > 0) {
        delete filterSpec.groupBy;
        fixes.push('Removed groupBy from individual ranking query');
      }
      if (filterSpec.aggregate && Object.keys(filterSpec.aggregate).length > 0) {
        delete filterSpec.aggregate;
        fixes.push('Removed aggregate from individual ranking query');
      }
      // Ensure sortBy exists
      if (!filterSpec.sortBy || !filterSpec.sortBy.column) {
        // Try to infer sort column from query
        const query = userQuery.toLowerCase();
        let sortColumn = 'engagement_rate'; // default
        if (query.includes('like')) sortColumn = 'likes';
        else if (query.includes('comment')) sortColumn = 'comments';
        else if (query.includes('share')) sortColumn = 'shares';
        else if (query.includes('reach')) sortColumn = 'reach';
        else if (query.includes('impression')) sortColumn = 'impressions';

        filterSpec.sortBy = {
          column: sortColumn,
          order: query.includes('worst') || query.includes('least') ? 'asc' : 'desc'
        };
        fixes.push(`Added sortBy: ${sortColumn} for individual ranking`);
      }
    }

    // FIX 6: Ensure limit is reasonable
    if (filterSpec.limit) {
      if (filterSpec.limit > 100) {
        filterSpec.limit = 100;
        fixes.push('Capped limit at 100');
      }
      if (filterSpec.limit < 1) {
        filterSpec.limit = 10;
        fixes.push('Minimum limit set to 10');
      }
    }


    // FIX 7: Q3/Quarter date filtering - Auto-inject missing date filters
    // If interpretation mentions Q3 but no date filters exist, add them automatically
    if (filterSpec.interpretation) {
      const interp = filterSpec.interpretation.toLowerCase();
      const mentionsQ3 = /q3|third quarter|july.*september|july-september|jul.*sep/i.test(interp);
      const mentionsQ4 = /q4|fourth quarter|october.*december|oct.*dec/i.test(interp);
      const mentionsQ2 = /q2|second quarter|april.*june|apr.*jun/i.test(interp);
      const mentionsQ1 = /q1|first quarter|january.*march|jan.*mar/i.test(interp);

      // Check if we have any date filters
      const hasDateFilters = filterSpec.filters && filterSpec.filters.some(f =>
        f.column === 'posted_date' ||
        (f.type === 'or' && f.conditions && f.conditions.some(c => c.column === 'posted_date'))
      );

      if ((mentionsQ3 || mentionsQ4 || mentionsQ2 || mentionsQ1) && !hasDateFilters) {
        // Extract year from query or use default
        const yearMatch = userQuery.match(/\b(202[0-9]|203[0-9])\b/);
        const targetYear = yearMatch ? yearMatch[1] : '2025'; // Default to 2025 for existing data

        // Determine which quarter
        let months = [];
        let quarterName = '';

        if (mentionsQ3) {
          months = [`${targetYear}-07`, `${targetYear}-08`, `${targetYear}-09`];
          quarterName = 'Q3';
        } else if (mentionsQ4) {
          months = [`${targetYear}-10`, `${targetYear}-11`, `${targetYear}-12`];
          quarterName = 'Q4';
        } else if (mentionsQ2) {
          months = [`${targetYear}-04`, `${targetYear}-05`, `${targetYear}-06`];
          quarterName = 'Q2';
        } else if (mentionsQ1) {
          months = [`${targetYear}-01`, `${targetYear}-02`, `${targetYear}-03`];
          quarterName = 'Q1';
        }

        // Create OR filter with month conditions
        // Use start_date for ad campaigns, posted_date for organic posts
        const dateColumn = lowerQuery.includes('ad') || lowerQuery.includes('campaign') || lowerQuery.includes('roas') ? 'start_date' : 'posted_date';

        const quarterFilter = {
          type: "or",
          conditions: months.map(month => ({
            column: dateColumn,
            operator: "contains",
            value: month
          }))
        };

        // Initialize filters if not exists
        if (!filterSpec.filters) {
          filterSpec.filters = [];
        }

        // Add the quarter filter
        filterSpec.filters.push(quarterFilter);

        fixes.push(`Added missing ${quarterName} ${targetYear} date filters (${months.join(', ')}) based on interpretation`);
        console.log(`🔧 AUTO-FIX: Injected ${quarterName} ${targetYear} date filters - LLM mentioned ${quarterName} but didn't generate filters`);
      }
    }


    if (fixes.length > 0) {
      console.log('✅ Applied post-processing fixes:');
      fixes.forEach(fix => console.log(`   - ${fix}`));
    } else {
      console.log('✅ No post-processing fixes needed');
    }

    return filterSpec;
  }


  /**
   * V4 ADDITION: Validate if query is answerable with available data
   * Prevents out-of-scope queries and provides helpful suggestions
   * PATCH: Added isComparisonQuery flag to skip time validations
   */
  validateQueryScope(userQuery, metadata, isComparisonQuery = false) {
    const query = userQuery.toLowerCase();
    const availablePlatforms = (metadata.uniqueValues && metadata.uniqueValues.platform) || [];

    // PHASE 2: Check for data discovery queries
    // User asking what data is available or requesting sample queries
    const dataDiscoveryPatterns = /what (data|information|metrics).*(do you have|available|can (i|you) (access|analyze|query))|what (do you|can (i|you)) have|show me (sample|example) quer(y|ies)|what can i (ask|query)|help me (get started|understand)|give me (examples|samples)|available (data|platforms|metrics)|quickstart|getting started/i;

    // CRITICAL FIX: Don't trigger data discovery if query is a response to clarification
    // These phrases indicate user clicked a clarification option, not asking for discovery
    const isClarificationResponse = /(view|show).*(simple|intermediate|advanced|beginner).*(example|complexity|level)|view.*analysis examples|platform-data matrix|examples?.*(simple|intermediate|advanced|beginner)/i.test(query);

    // PHASE 3: Don't re-trigger Phase 3 validations if query is from clarification option
    const isPhase3ClarificationResponse = /compare ads from facebook.*instagram.*google only|compare organic posts across all platforms|show me ad and organic performance separately|sorted by (ctr|conversion rate|roas)|organic posts sorted by engagement rate/i.test(query);

    // Handle clarification responses - user clicked one of the data discovery options
    if (isClarificationResponse) {
      // Beginner examples
      if (/view.*beginner|view.*simple/i.test(query)) {
        return {
          valid: false,
          needsClarification: true,
          isDataDiscovery: true,
          reason: 'Beginner-Level Sample Queries',
          explanation: `
# 📚 Beginner-Level Queries - Getting Started

## Organic Posts Queries:
1. Show me top 10 Instagram posts by engagement
2. What is the average engagement rate for Facebook posts?
3. Show me Twitter posts from November 2025
4. Which platform has the highest engagement rate?

## Ad Campaigns Queries:
1. Show me Facebook ad campaigns with highest CTR
2. What is the average ROAS for Google Ads?
3. Show me Instagram ads sorted by conversion rate
4. Which ad format performs best?

## Sentiment Analysis Queries:
1. Show me negative sentiment comments for Instagram
2. What is the overall sentiment for Facebook posts?
3. Show me English comments with positive sentiment
4. Which platform has the most negative comments?

💡 **Tip**: Copy any query above and paste it into the chat to try it out!
`,
          alternatives: []
        };
      }

      // Intermediate examples
      if (/view.*intermediate/i.test(query)) {
        return {
          valid: false,
          needsClarification: true,
          isDataDiscovery: true,
          reason: 'Intermediate-Level Sample Queries',
          explanation: `
# 📊 Intermediate-Level Queries - Comparisons & Filtering

1. Compare Facebook vs Instagram organic engagement
2. Show me posts with engagement rate > 5%
3. Compare Facebook Ads CTR to Instagram Ads CTR
4. Show me sentiment for posts from November 2025
5. Which content type (image/video/carousel) performs best on Instagram?
6. Compare organic reach vs ad impressions for Facebook

💡 **Tip**: These queries involve filtering and comparing data across platforms or metrics.
`,
          alternatives: []
        };
      }

      // Advanced examples
      if (/view.*advanced/i.test(query)) {
        return {
          valid: false,
          needsClarification: true,
          isDataDiscovery: true,
          reason: 'Advanced-Level Sample Queries',
          explanation: `
# 🚀 Advanced-Level Queries - Complex Analysis

1. Compare organic engagement_rate to ad CTR across platforms
2. Show me correlation between sentiment and engagement rate
3. Which platform has best ROI: organic posts or paid ads?
4. Show me top performing posts and their sentiment distribution
5. Compare weekend vs weekday performance across platforms
6. Analyze engagement trends by content type and platform

💡 **Tip**: These queries involve cross-data-type analysis and multi-metric comparisons.
`,
          alternatives: []
        };
      }

      // Platform-data matrix
      if (/platform-data matrix|complete.*matrix/i.test(query)) {
        return {
          valid: false,
          needsClarification: true,
          isDataDiscovery: true,
          reason: 'Complete Platform-Data Matrix',
          explanation: `
# 🗃️ Platform-Data Matrix - What Data Exists Where

## Facebook
✅ **Organic Posts**: Yes
✅ **Ad Campaigns**: Yes
✅ **Sentiment/Comments**: Yes
- Organic Metrics: engagement_rate, likes, comments, shares, reach, impressions
- Ad Metrics: CTR, CPC, conversions, clicks, ad_spend
- Sentiment Metrics: sentiment, sentiment_score, comment_text, language

## Instagram
✅ **Organic Posts**: Yes
✅ **Ad Campaigns**: Yes
✅ **Sentiment/Comments**: Yes
- Organic Metrics: engagement_rate, likes, comments, shares, saves, reach, impressions
- Ad Metrics: CTR, CPC, conversions, clicks, ad_spend
- Sentiment Metrics: sentiment, sentiment_score, comment_text, language

## Twitter
✅ **Organic Posts**: Yes
❌ **Ad Campaigns**: No
✅ **Sentiment/Comments**: Yes
- Organic Metrics: engagement_rate, likes, comments, shares, reach, impressions
- Sentiment Metrics: sentiment, sentiment_score, comment_text, language

## LinkedIn
✅ **Organic Posts**: Yes
❌ **Ad Campaigns**: No
❌ **Sentiment/Comments**: No
- Organic Metrics: engagement_rate, likes, comments, shares, reach, impressions

## Google
❌ **Organic Posts**: No
✅ **Ad Campaigns**: Yes
❌ **Sentiment/Comments**: No
- Ad Metrics: CTR, CPC, ROAS, conversion_rate, conversions, clicks, cost_per_conversion

---

💡 **Key Takeaways**:
- Only Facebook & Instagram have ALL three data types
- Twitter has organic + sentiment (no ads)
- LinkedIn has only organic posts
- Google has only ad campaigns
`,
          alternatives: []
        };
      }
    }

    if (dataDiscoveryPatterns.test(query) && !isClarificationResponse) {
      return {
        valid: false,
        needsClarification: true,
        isDataDiscovery: true,
        reason: 'Data Availability & Sample Queries Guide',
        explanation: `
# 📊 Available Data in the System

## Platform Coverage:
- **Facebook**: Organic posts + Ad campaigns + Sentiment
- **Instagram**: Organic posts + Ad campaigns + Sentiment
- **Twitter**: Organic posts + Sentiment (no ads)
- **LinkedIn**: Organic posts only (no ads or sentiment)
- **Google**: Ad campaigns only (no organic posts)

## Data Types:

### 1. Organic Posts (Facebook, Instagram, Twitter, LinkedIn)
**Metrics**: engagement_rate, likes, comments, shares, reach, impressions, posted_time, posted_date, content_type

### 2. Ad Campaigns (Facebook, Instagram, Google)
**Metrics**: CTR, CPC, ROAS, conversion_rate, conversions, clicks, impressions, cost_per_conversion, revenue, ad_spend

### 3. Sentiment/Comments (Facebook, Instagram, Twitter)
**Metrics**: sentiment (positive/negative/neutral), sentiment_score, comment_text, language (en, hinglish, unspecified)

---

# 🎯 Sample Queries by Complexity Level
`,
        alternatives: [
          {
            // CRITICAL FIX: Don't use "show me...queries" which re-triggers dataDiscoveryPatterns
            option: 'View simple beginner examples',
            description: 'Simple queries for getting started (Organic Posts, Ads, Sentiment)'
          },
          {
            option: 'View intermediate complexity examples',
            description: 'Comparison and filtering queries across platforms'
          },
          {
            option: 'View advanced analysis examples',
            description: 'Complex cross-data-type analysis and multi-metric comparisons'
          },
          {
            option: 'Show me the complete platform-data matrix',
            description: 'Detailed breakdown of what data exists for each platform'
          }
        ],
        sampleQueriesByLevel: {
          beginner: {
            organicPosts: [
              'Show me top 10 Instagram posts by engagement',
              'What is the average engagement rate for Facebook posts?',
              'Show me Twitter posts from November 2025',
              'Which platform has the highest engagement rate?'
            ],
            adCampaigns: [
              'Show me Facebook ad campaigns with highest CTR',
              'What is the average ROAS for Google Ads?',
              'Show me Instagram ads sorted by conversion rate',
              'Which ad format performs best?'
            ],
            sentiment: [
              'Show me negative sentiment comments for Instagram',
              'What is the overall sentiment for Facebook posts?',
              'Show me English comments with positive sentiment',
              'Which platform has the most negative comments?'
            ]
          },
          intermediate: [
            'Compare Facebook vs Instagram organic engagement',
            'Show me posts with engagement rate > 5%',
            'Compare Facebook Ads CTR to Instagram Ads CTR',
            'Show me sentiment for posts from November 2025',
            'Which content type (image/video/carousel) performs best on Instagram?',
            'Compare organic reach vs ad impressions for Facebook'
          ],
          advanced: [
            'Compare organic engagement_rate to ad CTR across platforms',
            'Show me correlation between sentiment and engagement rate',
            'Which platform has best ROI: organic posts or paid ads?',
            'Show me top performing posts and their sentiment distribution',
            'Compare weekend vs weekday performance across platforms',
            'Analyze engagement trends by content type and platform'
          ]
        },
        platformDataMatrix: {
          Facebook: {
            organicPosts: true,
            adCampaigns: true,
            sentiment: true,
            organicMetrics: ['engagement_rate', 'likes', 'comments', 'shares', 'reach', 'impressions'],
            adMetrics: ['CTR', 'CPC', 'conversions', 'clicks', 'ad_spend'],
            sentimentMetrics: ['sentiment', 'sentiment_score', 'comment_text', 'language']
          },
          Instagram: {
            organicPosts: true,
            adCampaigns: true,
            sentiment: true,
            organicMetrics: ['engagement_rate', 'likes', 'comments', 'shares', 'saves', 'reach', 'impressions'],
            adMetrics: ['CTR', 'CPC', 'conversions', 'clicks', 'ad_spend'],
            sentimentMetrics: ['sentiment', 'sentiment_score', 'comment_text', 'language']
          },
          Twitter: {
            organicPosts: true,
            adCampaigns: false,
            sentiment: true,
            organicMetrics: ['engagement_rate', 'likes', 'comments', 'shares', 'reach', 'impressions'],
            adMetrics: [],
            sentimentMetrics: ['sentiment', 'sentiment_score', 'comment_text', 'language']
          },
          LinkedIn: {
            organicPosts: true,
            adCampaigns: false,
            sentiment: false,
            organicMetrics: ['engagement_rate', 'likes', 'comments', 'shares', 'reach', 'impressions'],
            adMetrics: [],
            sentimentMetrics: []
          },
          Google: {
            organicPosts: false,
            adCampaigns: true,
            sentiment: false,
            organicMetrics: [],
            adMetrics: ['CTR', 'CPC', 'ROAS', 'conversion_rate', 'conversions', 'clicks', 'cost_per_conversion'],
            sentimentMetrics: []
          }
        },
        suggestedQueries: [
          'Show me beginner-level queries',
          'Show me intermediate-level queries',
          'Show me advanced-level queries',
          'Show me top Instagram posts',
          'What is the average engagement rate?',
          'Show me Facebook ad campaigns'
        ]
      };
    }

    // Check if this is a sentiment/feedback/comment query
    const isSentimentQuery = /sentiment|feedback|comment|complain|negative|positive|neutral|rating/i.test(query);

    // Check for non-existent platforms
    const unavailablePlatforms = {
      'tiktok': 'TikTok',
      'youtube': 'YouTube',
      'snapchat': 'Snapchat',
      'pinterest': 'Pinterest',
      'reddit': 'Reddit',
      'whatsapp': 'WhatsApp'
    };

    for (const [keyword, displayName] of Object.entries(unavailablePlatforms)) {
      if (query.includes(keyword)) {
        const exists = availablePlatforms.some(p =>
          p && p.toLowerCase().includes(keyword)
        );

        if (!exists) {
          return {
            valid: false,
            reason: `${displayName} data is not available in the current dataset.`,
            availablePlatforms: availablePlatforms.filter(p => p && p.length > 0),
            suggestedQueries: this.getSuggestedQueries(metadata)
          };
        }
      }
    }

    // PHASE 2: Check for platform-specific data type availability
    // Some platforms only have organic posts (Twitter, LinkedIn) or only ads (Google)

    // Twitter: Only organic posts, NO ad campaigns
    if (query.includes('twitter')) {
      const isAskingForAds = query.includes('ad') || query.includes('campaign') ||
                             query.includes('paid') || query.includes('sponsored');

      if (isAskingForAds && !query.includes('organic')) {
        return {
          valid: false,
          needsClarification: true,
          reason: 'Twitter ad campaign data is not available in the current dataset.',
          explanation: 'The dataset includes Twitter organic posts but does not have Twitter ad campaign data. Twitter ads would require separate API access and are not included in this dataset.',
          alternatives: [
            {
              option: 'Show me Twitter organic posts performance',
              description: 'View Twitter organic post engagement and reach'
            },
            {
              option: 'Compare Twitter organic to other platforms',
              description: 'See how Twitter posts perform vs Facebook, Instagram, LinkedIn'
            },
            {
              option: 'Show me ad campaigns from available platforms',
              description: 'View ads from Facebook, Instagram, or Google'
            }
          ],
          suggestedQueries: [
            'What is the engagement rate for Twitter posts?',
            'Show me top Twitter posts by engagement',
            'Compare Twitter vs Instagram organic performance',
            'Show me Facebook ad campaigns',
            'Compare organic posts across all platforms'
          ],
          availableForTwitter: ['organic posts', 'engagement metrics', 'reach', 'impressions'],
          notAvailableForTwitter: ['ad campaigns', 'ad spend', 'CTR', 'conversions']
        };
      }
    }

    // Google: Only ad campaigns, NO organic posts
    if (query.includes('google')) {
      const isAskingForOrganic = query.includes('post') || query.includes('organic') ||
                                 (query.includes('engagement') && !query.includes('ad'));

      if (isAskingForOrganic && !query.includes('ad') && !query.includes('campaign')) {
        return {
          valid: false,
          needsClarification: true,
          reason: 'Google organic post data is not available in the current dataset.',
          explanation: 'Google does not have a traditional social media platform with organic posts like Facebook or Instagram. The dataset includes Google Ads campaign data only.',
          alternatives: [
            {
              option: 'Show me Google Ads campaign performance',
              description: 'View Google Ads metrics like CTR, CPC, ROAS'
            },
            {
              option: 'Compare Google Ads to Facebook/Instagram Ads',
              description: 'See how Google Ads perform vs social media ads'
            },
            {
              option: 'Show me organic posts from social platforms',
              description: 'View organic posts from Facebook, Instagram, Twitter, LinkedIn'
            }
          ],
          suggestedQueries: [
            'What is the average ROAS for Google Ads?',
            'Show me Google Ads campaigns with highest CTR',
            'Compare Google Ads CPC to Facebook Ads',
            'Show me all ad campaigns across platforms',
            'Which platform has best ad performance?'
          ],
          availableForGoogle: ['ad campaigns', 'CTR', 'CPC', 'conversions', 'ROAS'],
          notAvailableForGoogle: ['organic posts', 'likes', 'comments', 'shares', 'engagement_rate']
        };
      }
    }

    // LinkedIn: Only organic posts, NO ad campaigns
    if (query.includes('linkedin')) {
      const isAskingForAds = query.includes('ad') || query.includes('campaign') ||
                             query.includes('paid') || query.includes('sponsored');

      if (isAskingForAds && !query.includes('organic')) {
        return {
          valid: false,
          needsClarification: true,
          reason: 'LinkedIn ad campaign data is not available in the current dataset.',
          explanation: 'The dataset includes LinkedIn organic posts but does not have LinkedIn ad campaign data.',
          alternatives: [
            {
              option: 'Show me LinkedIn organic posts performance',
              description: 'View LinkedIn post engagement and reach'
            },
            {
              option: 'Compare LinkedIn to other professional platforms',
              description: 'See how LinkedIn performs vs other platforms'
            },
            {
              option: 'Show me ad campaigns from available platforms',
              description: 'View ads from Facebook, Instagram, or Google'
            }
          ],
          suggestedQueries: [
            'What is the engagement rate for LinkedIn posts?',
            'Show me top LinkedIn posts by engagement',
            'Compare LinkedIn vs Twitter organic performance',
            'Show me Facebook ad campaigns',
            'Which organic posts perform best across platforms?'
          ],
          availableForLinkedIn: ['organic posts', 'engagement metrics', 'reach', 'impressions'],
          notAvailableForLinkedIn: ['ad campaigns', 'ad spend', 'CTR', 'conversions']
        };
      }
    }

    // Check for metrics that don't exist in organic posts
    const adsOnlyMetrics = {
      'ctr': 'click-through rate (CTR)',
      'click-through': 'click-through rate',
      'cpc': 'cost per click (CPC)',
      'cost per click': 'cost per click',
      'roas': 'return on ad spend (ROAS)',
      'conversion': 'conversions'
    };

    const isAskingAboutOrganicPosts = (query.includes('post') || query.includes('organic')) &&
      !query.includes('ad') &&
      !query.includes('campaign');

    if (isAskingAboutOrganicPosts) {
      for (const [keyword, displayName] of Object.entries(adsOnlyMetrics)) {
        if (query.includes(keyword)) {
          return {
            valid: false,
            needsClarification: true,
            reason: `${displayName} is only available for ad campaigns, not organic posts.`,
            explanation: `For organic posts, try asking about engagement rate, likes, comments, shares, reach, or impressions instead.`,
            alternatives: [
              {
                option: 'Show me engagement rate for organic posts',
                description: 'Similar metric to CTR but for organic content'
              },
              {
                option: `Show me ${displayName} for ad campaigns`,
                description: 'View this metric for paid advertising'
              },
              {
                option: 'Compare organic engagement vs ad performance',
                description: 'See how organic and paid content differ'
              }
            ],
            suggestedQueries: [
              'What is the average engagement rate for organic posts?',
              'Show me top organic posts by likes',
              `What is the ${displayName} for Facebook Ads?`,
              'Compare organic reach vs ad reach'
            ]
          };
        }
      }
    }

    // CRITICAL FIX: Check for engagement_rate on ad campaigns (inverse check of above)
    // Ad campaigns don't have engagement_rate, likes, comments, shares, saves
    const organicOnlyMetrics = {
      'engagement rate': 'engagement rate',
      'engagement_rate': 'engagement rate',
      'likes': 'likes',
      'comments': 'comments (on posts)',
      'shares': 'shares',
      'saves': 'saves'
    };

    const isAskingAboutAdCampaigns = (query.includes('ad') || query.includes('campaign') ||
                                       query.includes('paid') || query.includes('roas') ||
                                       query.includes('cpc') || query.includes('ctr')) &&
                                      !query.includes('organic');

    // Special case: comparing organic to paid (mentions both)
    const isComparingOrganicVsPaid = (query.includes('organic') || query.includes('post')) &&
                                      (query.includes('ad') || query.includes('campaign') || query.includes('paid'));

    if (isAskingAboutAdCampaigns || isComparingOrganicVsPaid) {
      for (const [keyword, displayName] of Object.entries(organicOnlyMetrics)) {
        if (query.includes(keyword)) {
          return {
            valid: false,
            needsClarification: true,
            reason: `${displayName} is not available for ad campaigns.`,
            explanation: `Ad campaigns and organic posts track different engagement metrics:\n\n` +
                        `**Organic Posts Track:**\n` +
                        `- engagement_rate: (likes + comments + shares) / reach\n` +
                        `- Individual counts: likes, comments, shares, saves\n` +
                        `- Reach and impressions\n\n` +
                        `**Ad Campaigns Track:**\n` +
                        `- CTR (click-through rate): clicks / impressions\n` +
                        `- conversion_rate: conversions / clicks\n` +
                        `- ROAS: revenue / ad spend\n` +
                        `- CPC, cost_per_conversion, clicks, conversions\n` +
                        `- Impressions (but NO likes, comments, shares, or engagement_rate)\n\n` +
                        `Why the difference? Ad platforms focus on conversion funnel metrics (clicks → conversions → revenue) ` +
                        `while organic posts focus on social engagement (likes, comments, shares).`,
            alternatives: [
              {
                option: 'Compare organic engagement_rate to ad CTR',
                description: 'Both measure interaction effectiveness (engagement vs clicks)'
              },
              {
                option: 'Compare organic engagement_rate to ad conversion_rate',
                description: 'Both measure success percentage'
              },
              {
                option: 'Compare reach and impressions',
                description: 'Available for both organic posts and ad campaigns'
              },
              {
                option: 'View organic and ad performance separately',
                description: 'Analyze each with their appropriate metrics'
              }
            ],
            suggestedQueries: [
              'Compare organic engagement rate to ad CTR on Instagram',
              'Show me Instagram ad campaigns with highest CTR',
              'What is the average ROAS for Instagram Ads vs Facebook Ads?',
              'Compare organic reach vs ad reach on Instagram',
              'Show me top organic posts by engagement rate',
              'Show me top ad campaigns by ROAS'
            ],
            whatYouCanCompare: {
              bothHave: ['impressions', 'reach (for some platforms)', 'platform', 'date'],
              organicHas: ['engagement_rate', 'likes', 'comments', 'shares', 'saves', 'posted_time'],
              adsHave: ['CTR', 'CPC', 'conversion_rate', 'ROAS', 'clicks', 'conversions', 'revenue', 'cost_per_conversion']
            }
          };
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 3: Cross-platform and metric ambiguity validations
    // ═══════════════════════════════════════════════════════════════════════════

    // PHASE 3.1: Cross-platform ad comparison with mixed availability
    // User asks to compare ads across "all platforms" but some platforms don't have ads
    const isCrossPlatformAdQuery = /compare.*ad|ad.*comparison|ad.*performance.*across|all.*platform.*ad/i.test(query);
    const mentionsMultiplePlatforms = (query.match(/facebook|instagram|twitter|linkedin|google/gi) || []).length > 1 ||
                                      /all.*platform|across.*platform|every.*platform/i.test(query);

    if (isCrossPlatformAdQuery && mentionsMultiplePlatforms && !isPhase3ClarificationResponse) {
      // Check if query mentions platforms without ad data
      const platformsWithoutAds = [];
      if (query.includes('twitter')) platformsWithoutAds.push('Twitter');
      if (query.includes('linkedin')) platformsWithoutAds.push('LinkedIn');

      if (platformsWithoutAds.length > 0) {
        return {
          valid: false,
          needsClarification: true,
          reason: 'Cross-Platform Ad Comparison - Partial Data Available',
          explanation: `⚠️ Ad Data Availability Notice

Your query includes platforms that don't have ad campaign data in the dataset.

Platforms WITH Ad Data:
  • ✅ Facebook: Full ad campaign data
  • ✅ Instagram: Full ad campaign data
  • ✅ Google: Full ad campaign data

Platforms WITHOUT Ad Data:
${platformsWithoutAds.map(p => `  • ❌ ${p}: Only organic posts available, no ad campaigns`).join('\n')}

Note: The comparison will only include platforms with ad data available.`,
          alternatives: [
            {
              option: 'Compare ads from Facebook, Instagram, and Google only',
              description: 'Analyze ad performance across platforms with available ad data'
            },
            {
              option: 'Compare organic posts across all platforms instead',
              description: 'All platforms have organic post data available'
            },
            {
              option: 'Show me ad and organic performance separately',
              description: 'View ads from some platforms and organic from others'
            }
          ],
          platformsWithAds: ['Facebook', 'Instagram', 'Google'],
          platformsWithoutAds: platformsWithoutAds
        };
      }
    }

    // PHASE 3.2: Metric ambiguity - "engagement" in mixed organic/ad queries
    // "engagement" could mean engagement_rate (organic) or CTR (ads)
    const mentionsEngagement = /\bengagement\b/i.test(query);
    const mentionsAds = /\bad\b|\bads\b|campaign|paid|sponsored/i.test(query);
    const mentionsOrganic = /organic|post(?!.*campaign)/i.test(query);
    const isMixedQuery = mentionsAds && !mentionsOrganic; // Asking for engagement on ads

    if (mentionsEngagement && isMixedQuery && !isPhase3ClarificationResponse) {
      // User asking for "engagement" on ad campaigns - ambiguous!
      return {
        valid: false,
        needsClarification: true,
        reason: 'Metric Ambiguity - "Engagement" for Ad Campaigns',
        explanation: `🤔 Metric Clarification Needed

The term "engagement" is ambiguous when analyzing ad campaigns.

Available Metrics:

For Organic Posts:
  • engagement_rate: Likes, comments, shares as % of reach

For Ad Campaigns:
  • CTR (Click-Through Rate): Clicks as % of impressions (ad engagement)
  • conversion_rate: Conversions as % of clicks
  • ROAS: Return on ad spend

Which metric would you like to analyze?`,
        alternatives: [
          {
            option: 'Show me ad campaigns sorted by CTR (click-through rate)',
            description: 'CTR measures how many people clicked your ads'
          },
          {
            option: 'Show me ad campaigns sorted by conversion rate',
            description: 'Conversion rate measures how many clicks led to conversions'
          },
          {
            option: 'Show me ad campaigns sorted by ROAS',
            description: 'ROAS measures return on investment for ad spend'
          },
          {
            option: 'Show me organic posts sorted by engagement rate instead',
            description: 'Analyze organic post engagement (likes, comments, shares)'
          }
        ],
        organicMetric: 'engagement_rate',
        adMetrics: ['CTR', 'conversion_rate', 'ROAS'],
        clarificationType: 'metric_ambiguity'
      };
    }

    // Check if query is completely off-topic
    const socialMediaKeywords = [
      'post', 'campaign', 'ad', 'engagement', 'likes', 'shares', 'reach', 'impression',
      'platform', 'facebook', 'instagram', 'twitter', 'linkedin', 'google',
      'content', 'performance', 'roas', 'conversion', 'ctr', 'clicks',
      'follower', 'audience', 'organic', 'paid', 'media', 'social',
      'sentiment', 'comment', 'feedback', 'language'  // CRITICAL FIX: Add sentiment-related keywords
    ];

    // Use word boundary matching to avoid false positives (e.g., "like" matching "likes")
    const hasRelevantKeyword = socialMediaKeywords.some(kw => {
      const regex = new RegExp(`\\b${kw}`, 'i');
      return regex.test(query);
    });

    if (!hasRelevantKeyword && query.length > 10) {
      return {
        valid: false,
        reason: 'This query appears to be outside the scope of social media performance data.',
        explanation: 'I can only help analyze social media posts and ad campaign performance.',
        suggestedQueries: this.getSuggestedQueries(metadata)
      };
    }


    // V4.2 ADDITION: Check for queries requiring derived fields

    // Check for day-of-week / weekday/weekend queries
    // Skip this validation for sentiment queries and comparison queries
    // IMPROVED: Detect weekday/weekend queries including "during week or weekends"
    const weekdayPatterns = /(weekday|weekend|week day)\s+(vs|versus|compared|comparison)|during\s+(the\s+)?(week|weekday|weekend)|(weekday|weekend)\s+or\s+(weekday|weekend)/i;
    const specificDayQuery = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

    if (!isSentimentQuery && !isComparisonQuery && weekdayPatterns.test(query)) {
      // CRITICAL FIX: metadata.columns is a Set, not an object
      const availableColumns = (metadata.columns && Array.from(metadata.columns)) || [];
      const hasDayOfWeek = availableColumns.some(col =>
        col.toLowerCase().includes('day') && col.toLowerCase().includes('week')
      );

      const hasPostedDate = availableColumns.some(col =>
        col.toLowerCase() === 'posted_date'
      );

      // Only block if query explicitly asks for weekday/weekend comparison AND we have no day-of-week column
      if (!hasDayOfWeek && hasPostedDate) {
        return {
          valid: false,
          needsClarification: true,
          reason: 'Weekday vs weekend analysis requires grouping by day of week.',
          explanation: 'The data has posted_date but not day-of-week categorization. I cannot automatically determine if a date is a weekday or weekend. I can show you posts grouped by date for manual analysis.',
          alternatives: [
            {
              option: 'Show me engagement grouped by individual date',
              description: 'You can manually identify which dates are weekdays vs weekends'
            },
            {
              option: 'Show me all posts with dates and engagement metrics',
              description: 'Full dataset for manual analysis'
            },
            {
              option: 'Show me top performing posts by date',
              description: 'Identify patterns across different dates'
            }
          ]
        };
      }
    }

    // Check for time-of-day queries
    // IMPROVED: Detect time-of-day questions regardless of comparison classification
    const timeOfDayPatterns = /time of day|morning|afternoon|evening|night|(best|peak|optimal)\s+time\s+(to\s+post|for\s+posting)/i;
    const timeGroupingKeywords = /group(ed)?\s+by\s+(time|hour)|time\s+slot|hour\s+of\s+day|breakdown\s+by\s+(time|hour)/i;

    // CRITICAL: Check for time patterns BEFORE checking isComparisonQuery
    // "best time to post" should trigger this even if misclassified as comparison
    if (!isSentimentQuery &&
      (timeOfDayPatterns.test(query) || timeGroupingKeywords.test(query)) &&
      !query.includes('posted_time')) {

      // CRITICAL FIX: metadata.columns is a Set, not an object
      const availableColumns = (metadata.columns && Array.from(metadata.columns)) || [];
      const hasTimeCategory = availableColumns.some(col =>
        col.toLowerCase().includes('time') && (col.toLowerCase().includes('category') || col.toLowerCase().includes('period'))
      );

      const hasPostedTime = availableColumns.some(col =>
        col.toLowerCase() === 'posted_time'
      );

      // Only block if query asks for time grouping AND we have no time categorization
      if (!hasTimeCategory && hasPostedTime) {
        return {
          valid: false,
          needsClarification: true,
          reason: 'Time-of-day analysis requires grouping by time periods.',
          explanation: 'The data has posted_time (HH:MM:SS) but not time-of-day categorization (morning/afternoon/evening). I can show you posts with timestamps for manual analysis.',
          alternatives: [
            {
              option: 'Show me posts with their posted_time and engagement rate',
              description: 'You can analyze patterns by reviewing timestamps'
            },
            {
              option: 'Show me top 20 posts sorted by engagement with timestamps',
              description: 'Identify which times correlate with high engagement'
            },
            {
              option: 'Group posts by hour (if supported)',
              description: 'See engagement by posting hour'
            }
          ]
        };
      }
    }

    // Check for "weekly" or "last week" without specific dates
    // IMPROVED: Only validate if asking for SPECIFIC week without context
    const weeklyPatterns = /\b(which|what)\s+week|last\s+week|this\s+week/i;
    const hasWeeklyContext = query.includes('summary') || query.includes('report') || query.includes('performance');
    const hasYearReference = /\b(202[0-9]|203[0-9])\b/.test(query);
    const hasMonthReference = /january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(query);

    // Don't block "weekly summary" or "weekly report" - LLM can handle these
    if (weeklyPatterns.test(query) &&
      !hasWeeklyContext &&
      !hasYearReference &&
      !hasMonthReference &&
      !query.includes('date')) {
      return {
        valid: false,
        needsClarification: true,
        reason: 'Please specify which week you want to analyze.',
        explanation: '"Weekly" is ambiguous - it could mean last 7 days, current calendar week, or a specific week.',
        alternatives: [
          {
            option: 'Show me data from the last 7 days',
            description: 'Rolling 7-day window'
          },
          {
            option: 'Show me weekly breakdown for November 2025',
            description: 'Week-by-week analysis for a specific month'
          },
          {
            option: 'Show me overall performance summary',
            description: 'All available data'
          }
        ]
      };
    }

    // Check for specific ad format comparisons (like "Stories")
    const adFormatPatterns = /stories campaign|reels campaign|carousel ad|video ad|collection ad/i;
    const organicComparison = /organic.*vs|vs.*organic|compare.*organic|organic.*compare/i;

    if (adFormatPatterns.test(query) && organicComparison.test(query)) {
      return {
        valid: false,
        needsClarification: true,
        reason: 'Comparing organic posts to specific ad formats requires multiple filters.',
        explanation: 'I can compare organic posts to ads, but filtering by specific ad format (Stories, Carousel, etc.) needs clarification.',
        alternatives: [
          {
            option: 'Compare Instagram organic posts vs all Instagram Ads',
            description: 'Overall organic vs paid comparison'
          },
          {
            option: 'Show me Instagram Ads grouped by ad format',
            description: 'See all ad formats (Stories, Carousel, Single Image, etc.) separately'
          },
          {
            option: 'Show me Stories ads across all platforms',
            description: 'Focus on Stories format specifically'
          },
          {
            option: 'Let me specify the exact comparison I want',
            description: 'Rephrase for clarity'
          }
        ]
      };
    }



    // V4.3 ADDITION: Check for text analysis queries (hashtag/keyword/theme extraction)
    const hashtagKeywordPattern = /\b(hashtag(s)?|keyword(s)?|theme(s)?)\b/i;
    if (hashtagKeywordPattern.test(query)) {
      const hasHashtagColumn = metadata.columns && metadata.columns.hashtags;
      const hasContentColumn = metadata.columns && metadata.columns.content;

      if (!hasHashtagColumn && hasContentColumn) {
        return {
          valid: false,
          needsClarification: true,
          reason: 'Hashtag/keyword/theme analysis requires text extraction from content.',
          explanation: 'The dataset has a content column with hashtags embedded in post text, but no separate hashtags column. I cannot automatically extract and analyze hashtags or themes from text content.',
          alternatives: [
            {
              option: 'Show me top posts by engagement with their content',
              description: 'You can manually review which hashtags/themes appear in high-performing posts'
            },
            {
              option: 'Show me posts sorted by saves and shares',
              description: 'See high-performing content (hashtags visible in content field)'
            },
            {
              option: 'Show me posts grouped by platform with engagement metrics',
              description: 'Compare platform performance to identify where hashtags work best'
            }
          ],
          suggestedQueries: [
            'Show me top 20 posts by engagement rate with content',
            'Which posts have the most saves and shares?',
            'Show me Instagram posts sorted by engagement with content visible'
          ]
        };
      }
    }

    // V4.4 ADDITION: Check for "what are people saying/complaining about" queries
    const complaintAnalysisPattern = /\b(complain(ing|t(s)?)|saying|talking)\s+about\b|what\s+are\s+(people|users|customers).*\b(say(ing)?|complain(ing)?|about)\b/i;
    if (complaintAnalysisPattern.test(query)) {
      const hasCommentText = metadata.columns && metadata.columns.comment_text;

      if (hasCommentText) {
        return {
          valid: false,
          needsClarification: true,
          reason: 'Topic extraction from comments requires NLP text analysis.',
          explanation: 'The dataset has comment_text, but I cannot automatically extract and categorize complaint topics or discussion themes from text. I can show you negative comments, but you\'ll need to manually review the actual complaint topics.',
          alternatives: [
            {
              option: 'Show me negative sentiment comments sorted by platform',
              description: 'See all negative feedback grouped by platform for manual review'
            },
            {
              option: 'Show me comments with negative sentiment and lowest scores',
              description: 'Most negative comments across all platforms'
            },
            {
              option: 'Show me platform with most negative comments',
              description: 'Identify which platform has the most negative sentiment'
            }
          ],
          suggestedQueries: [
            'Which platform has the most negative sentiment comments?',
            'Show me all negative comments sorted by sentiment score',
            'Compare negative sentiment counts across platforms'
          ]
        };
      }
    }

    // V4.5 ADDITION: Check for content generation requests
    const contentGenerationPattern = /\b(draft|write|create|generate)\s+(post(s)?|content|idea(s)?|caption(s)?|copy|text)/i;
    if (contentGenerationPattern.test(query)) {
      return {
        valid: false,
        reason: 'Content generation is not supported.',
        explanation: 'I can analyze your social media performance data, but I cannot generate new post ideas, captions, or content. I focus on data analysis, not content creation.',
        alternatives: [
          {
            option: 'Show me top performing posts for inspiration',
            description: 'See what content resonated best with your audience'
          },
          {
            option: 'Show me best performing content types by platform',
            description: 'Understand which formats work best'
          },
          {
            option: 'Analyze engagement patterns for guidance',
            description: 'Get insights on what drives engagement'
          }
        ],
        suggestedQueries: [
          'What type of content performs best on Instagram?',
          'Show me top 10 posts by engagement',
          'Which content formats drive the most engagement?'
        ]
      };
    }

    // V4.7 ADDITION: Check for content strategy/recommendations queries
    const strategyPattern = /\b(content\s+)?strategy|recommend(ation)?s?\s+(for|about)?|what\s+should\s+(we|i)\s+(do|post|focus)/i;
    if (strategyPattern.test(query)) {
      return {
        valid: false,
        needsClarification: true,
        reason: 'I can provide data-driven insights to inform your content strategy.',
        explanation: 'While I cannot create a content strategy for you, I can analyze your historical performance data to provide actionable insights. Choose what aspect you\'d like to explore:',
        alternatives: [
          {
            option: 'Which content types perform best across platforms?',
            description: 'Compare image, video, carousel performance'
          },
          {
            option: 'Which platform has the highest engagement rate?',
            description: 'Find where your audience is most active'
          },
          {
            option: 'Show me top 10 performing posts for inspiration',
            description: 'Learn from your best content'
          },
          {
            option: 'Compare engagement across all platforms',
            description: 'See overall platform performance comparison'
          }
        ],
        suggestedQueries: [
          'Which content type performs best on Instagram?',
          'Compare engagement rates across all platforms',
          'Show me top 10 posts by engagement rate',
          'What media type has highest average likes?'
        ]
      };
    }

    // V4.6 ADDITION: Check for "common attributes" pattern detection queries
    const patternDetectionPattern = /\bcommon\s+(attribute(s)?|pattern(s)?|feature(s)?|characteristic(s)?)\b|\bwhat.*\bshare\b|\bsimilar(ities|ity)\b/i;
    if (patternDetectionPattern.test(query)) {
      return {
        valid: false,
        needsClarification: true,
        reason: 'Pattern detection requires advanced analysis beyond filtering and sorting.',
        explanation: 'I can show you top results, but I cannot automatically detect patterns or common attributes across them. You\'ll need to manually review the results to identify commonalities.',
        alternatives: [
          {
            option: 'Show me the requested data without pattern analysis',
            description: 'Get the filtered results for manual pattern review'
          },
          {
            option: 'Show me results grouped by key dimensions',
            description: 'Group by platform, format, audience, etc. to spot patterns'
          },
          {
            option: 'Rephrase to ask for specific attributes',
            description: 'Ask about specific metrics or dimensions instead of "common" patterns'
          }
        ],
        suggestedQueries: [
          'Show me top campaigns grouped by ad format',
          'Show me top campaigns grouped by target audience',
          'List the top results with all their attributes visible'
        ]
      };
    }

    // V4.3 ADDITION: Generic complexity detection (catch-all for unhandled complex queries)

    // Check if sentiment data is available in the dataset
    const hasSentimentData = metadata.columns && (
      metadata.columns.label || // sentiment label column
      metadata.columns.sentiment ||
      metadata.columns.comment_text || // comments with text
      (metadata.files && metadata.files.some(f =>
        f.name.includes('sentiment') || f.name.includes('comment')
      ))
    );

    // Check for language-specific sentiment queries BEFORE skipping complexity detection
    const languagePatterns = /hindi|hinglish|tamil|telugu|bengali|marathi|gujarati|kannada|malayalam|punjabi|urdu|arabic|chinese|japanese|korean|spanish|french|german|italian|portuguese|russian/i;

    // CRITICAL FIX: Don't trigger validation if query asks for "all" or "available" languages
    // These phrases indicate user wants whatever is available, not a specific language
    const asksForAllLanguages = /all.*language|available.*language|any.*language|regardless.*language|language.*filter/i.test(query);

    if (isSentimentQuery && languagePatterns.test(query) && !asksForAllLanguages) {
      // CRITICAL FIX: metadata.columns is a Set, not an object
      // Check using Array.from() or metadata.uniqueValues instead
      const hasLanguageColumn = metadata.uniqueValues && metadata.uniqueValues.language;
      const availableLanguages = (metadata.uniqueValues && metadata.uniqueValues.language) || [];

      // Check if the specific language is in the dataset
      const mentionedLanguage = query.match(languagePatterns);
      const languageInData = mentionedLanguage && availableLanguages.some(lang =>
        lang && lang.toLowerCase().includes(mentionedLanguage[0].toLowerCase())
      );

      if (!hasLanguageColumn) {
        return {
          valid: false,
          needsClarification: true,
          reason: 'Language-specific sentiment analysis is not available.',
          explanation: 'The dataset has sentiment data but does not include language classification. I can show you all sentiment data, but cannot filter by specific languages.',
          alternatives: [
            {
              option: 'Show me all negative comments for Instagram',
              description: 'View all negative feedback without language filtering'
            },
            {
              option: 'Show me all comments for Instagram grouped by detected language',
              description: 'See what languages are in the data'
            },
            {
              option: 'Show me all Instagram sentiment summary',
              description: 'Overall sentiment breakdown for Instagram'
            }
          ],
          suggestedQueries: [
            'Show me negative sentiment comments for Instagram',
            'What is the overall sentiment for Instagram posts?',
            'Show me all comments grouped by platform and sentiment'
          ]
        };
      }

      if (!languageInData) {
        return {
          valid: false,
          needsClarification: true,
          reason: `${mentionedLanguage ? mentionedLanguage[0] : 'The specified language'} comments may not be available in the dataset.`,
          explanation: `The dataset has language detection but ${mentionedLanguage ? mentionedLanguage[0] : 'the language you specified'} was not found. Available languages: ${availableLanguages.join(', ')}`,
          alternatives: [
            {
              option: 'Show me all sentiment data for Instagram',
              description: 'View all available comments regardless of language'
            },
            {
              // CRITICAL FIX: Don't include language names in option text to avoid re-triggering validation
              // Instead use generic "available languages" which won't match languagePatterns
              option: 'Show me sentiment data filtered by available languages',
              description: `Languages in dataset: ${availableLanguages.slice(0, 3).join(', ')}`
            },
            {
              option: 'Show me sentiment grouped by language and platform',
              description: 'See which languages have comments'
            }
          ],
          suggestedQueries: availableLanguages.map(lang =>
            `Show me ${lang} sentiment for Instagram`
          ).concat([
            'Show me all Instagram sentiment summary',
            'What languages are in the comment data?'
          ])
        };
      }
    }

    // Skip complexity detection entirely for sentiment queries when sentiment data is available
    if (isSentimentQuery && hasSentimentData) {
      console.log('✅ Sentiment query detected with available sentiment data - skipping complexity checks');
      return { valid: true };
    }

    // V4.7 ADDITION: Check for below-average/above-average filtering (requires multi-pass)
    const averageComparisonPattern = /\b(below|above|under|over)[-\s]?(the\s+)?average\b/i;
    if (averageComparisonPattern.test(query)) {
      console.log('⚠️  Below-average/above-average pattern detected');
      return {
        valid: false,
        needsClarification: true,
        reason: 'Below-average/above-average filtering requires multi-pass data processing.',
        explanation: 'I cannot dynamically calculate averages and then filter against them in a single query. The system would need to: (1) Calculate the average of all records, (2) Then filter records based on that average. This requires two separate operations.',
        alternatives: [
          {
            option: 'Show me all posts sorted by the metric',
            description: 'View all results sorted so you can identify above/below average manually'
          },
          {
            option: 'Use a specific threshold value',
            description: 'Provide an explicit number for filtering (e.g., "engagement rate > 5%")'
          },
          {
            option: 'Ask for the average first',
            description: 'Two-step approach: (1) "What is the average engagement?" (2) "Show posts with engagement > X"'
          }
        ],
        suggestedQueries: [
          'Show me all posts sorted by engagement rate descending',
          'What is the average engagement rate for organic posts?',
          'Show me posts with engagement rate > 5%',
          'Show me bottom 10 posts by impressions'
        ]
      };
    }

    const complexityIndicators = {
      analysis: /correlat(e|ion)|regression|statistical\s+analysis|significance\s+test/i, // Removed "trend analysis", "pattern detect", "predict", "forecast"
      derivedMetrics: /virality\s+score|coefficient|index\s+calculation/i, // More specific, removed generic "roi", "rating"
      transformations: /normaliz(e|ed)|weight(ed)\s+average|baseline\s+adjust|calibrat/i, // Removed generic "adjust", "factor"
      statistics: /percentile|quartile|distribution\s+analysis|variance\s+calculation|standard\s+deviation\s+analysis/i, // More specific
      segmentation: /cohort\s+analysis|cluster(ing)?|segmentation\s+study/i, // Removed "categoriz", "group analysis"
      causation: /^\s*why\s+(did|is|are|do|does)\b|what\s+caused|causal(ity)?|attribution\s+model|impact\s+study/i, // Only match "why" at START of question
      detection: /anomaly\s+detection|outlier\s+detection|unusual\s+pattern/i, // More specific
      // Only flag NLP if sentiment data is NOT available
      // ADDED: hashtag, keyword (standalone), theme detection
      nlp: hasSentimentData ? null : /\bhashtag(s)?\b|\bkeyword(s)?\b(?!\s+like)|\btheme(s)?\b|text\s+mining|keyword\s+extraction|topic\s+modeling|language\s+processing/i,
      timeSeries: /seasonality\s+adjust|cyclical\s+pattern|year.over.year\s+growth/i, // More specific
      prediction: /forecast(ing)?|predict(ive)?\s+model|future\s+projection/i // More specific
    };

    // Check if query matches any complexity indicator
    let matchedCategory = null;
    let matchedPattern = null;

    for (const [category, pattern] of Object.entries(complexityIndicators)) {
      // Skip if pattern is null (e.g., NLP when sentiment data is available)
      if (!pattern) continue;

      if (pattern.test(query)) {
        matchedCategory = category;
        matchedPattern = pattern;
        break;
      }
    }

    if (matchedCategory) {
      // Extract what user is asking for
      const queryIntent = query.substring(0, 60) + (query.length > 60 ? '...' : '');

      // Build comprehensive response with all three options
      const response = {
        valid: false,
        needsClarification: true,
        complexityType: matchedCategory,

        // OPTION 3: Explain Data Limitation (Honest)
        reason: `This query requires ${matchedCategory} which may not be available in the current dataset.`,
        explanation: this.getComplexityExplanation(matchedCategory, query),
        dataAvailable: this.getAvailableData(metadata),
        dataNotAvailable: this.getMissingCapabilities(matchedCategory),

        // OPTION 2: Provide Closest Alternatives (Helpful)
        alternatives: this.getSimilarAlternatives(matchedCategory, metadata),

        // OPTION 1: Ask for Clarification (Best UX)
        suggestedActions: this.getSuggestedActions(matchedCategory),

        helpfulContext: `I understand you're looking for ${matchedCategory} insights. While I cannot perform that exact analysis, I can provide related metrics and data that might help you reach your goal.`
      };

      return response;
    }


    // Query seems valid
    return { valid: true };
  }

  /**
   * V4 ADDITION: Generate helpful suggested queries based on available data
   */
  getSuggestedQueries(metadata) {
    const platforms = (metadata.uniqueValues && metadata.uniqueValues.platform) || [];
    const hasAds = platforms.some(p => p && p.includes('Ads'));
    const hasOrganic = platforms.some(p => p && !p.includes('Ads'));

    const suggestions = [];

    if (hasOrganic) {
      suggestions.push({
        query: "Which platform has the highest engagement rate?",
        category: "Platform Comparison"
      });
      suggestions.push({
        query: "Show me the top 5 posts by likes",
        category: "Content Performance"
      });
      suggestions.push({
        query: "What is the worst performing post type?",
        category: "Content Analysis"
      });
    }

    if (hasAds) {
      suggestions.push({
        query: "Compare ROAS across Facebook Ads, Instagram Ads, and Google Ads",
        category: "Ad Performance"
      });
      suggestions.push({
        query: "Which ad campaign has the highest conversion rate?",
        category: "Campaign Analysis"
      });
    }

    if (hasOrganic && hasAds) {
      suggestions.push({
        query: "Compare Instagram organic vs Instagram Ads performance",
        category: "Organic vs Paid"
      });
    }

    return suggestions;
  }


  /**
   * Generate filter specification from user query using LLM
   * @param {string} userQuery - The user's natural language query
   * @param {Object} metadata - Dataset metadata from MetadataExtractor
   * @returns {Object} Filter specification object
   */
  async generateFilters(userQuery, metadata) {
    // ═══════════════════════════════════════════════════════════════════════════
    // PATCH: Early detection of comparison queries to prevent mis-classification
    // ═══════════════════════════════════════════════════════════════════════════
    const lowerQuery = userQuery.toLowerCase();

    // Expanded comparison patterns to catch more variations
    const comparisonPatterns = [
      ' vs ',
      ' vs. ',
      ' versus ',
      'compared to',
      'compared with',
      'compare ',
      'comparison',
      'performing compared',
      'performance compared',
      ' than ', // "better than", "higher than"
      'against'
    ];

    const hasComparisonKeyword = comparisonPatterns.some(pattern =>
      lowerQuery.includes(pattern)
    );

    // CRITICAL FIX: Don't classify "best time to post on Facebook" as comparison query
    // It mentions Facebook but is NOT comparing platforms - it's asking about timing
    const isTimeQuery = /time of day|morning|afternoon|evening|night|(best|peak|optimal)\s+time\s+(to\s+post|for\s+posting)/i.test(lowerQuery);
    const isWeekdayQuery = /(weekday|weekend|week day)\s+(vs|versus|compared|comparison|or)|during\s+(the\s+)?(week|weekday|weekend)/i.test(lowerQuery);

    // Platform/content context (broader than before)
    const hasComparisonContext =
      lowerQuery.includes('organic') ||
      lowerQuery.includes('ads') ||
      lowerQuery.includes('paid') ||
      lowerQuery.includes('platform') ||
      lowerQuery.includes('facebook') ||
      lowerQuery.includes('instagram') ||
      lowerQuery.includes('twitter') ||
      lowerQuery.includes('linkedin') ||
      lowerQuery.includes('google') ||
      lowerQuery.includes('video') ||
      lowerQuery.includes('image') ||
      lowerQuery.includes('carousel');

    // Only classify as comparison if it has comparison keywords AND is NOT a time/weekday query
    const isComparisonQuery = hasComparisonKeyword && hasComparisonContext && !isTimeQuery && !isWeekdayQuery;

    if (isComparisonQuery) {
      console.log('🔧 PATCH: Comparison query detected - using specialized handling');
      console.log('   Skipping time-of-day and other complex validations');
    }

    // V4 ADDITION: Validate query scope before processing
    // BUT skip time-based validations for comparison queries
    const validation = this.validateQueryScope(userQuery, metadata, isComparisonQuery);

    if (!validation.valid) {
      console.log('⚠️  Query validation failed:', validation.reason);
      return {
        needsClarification: true,
        outOfScope: true,
        clarificationNeeded: validation.reason,
        suggestion: validation.suggestion,
        alternativeQuery: validation.alternativeQuery,
        explanation: validation.explanation,
        isDataDiscovery: validation.isDataDiscovery, // CRITICAL FIX: Pass through for educational content detection
        availablePlatforms: validation.availablePlatforms,
        suggestedQueries: validation.suggestedQueries || [],
        alternatives: validation.alternatives,
        options: validation.options,
        suggestedActions: validation.suggestedActions,
        helpfulContext: validation.helpfulContext,
        dataAvailable: validation.dataAvailable,
        dataNotAvailable: validation.dataNotAvailable,
        interpretation: "Query is outside the scope of available data or requires clarification"
      };
    }

    // Check cache first
    const cached = this.cache.get(userQuery);
    if (cached) {
      console.log('💾 Filter cache HIT - Using cached filter spec');
      const cacheStats = this.cache.getStats();
      console.log(`   Cache stats: ${cacheStats.size}/${cacheStats.maxSize} entries, ${cacheStats.hitRate} hit rate`);
      return cached;
    }

    console.log('💾 Filter cache MISS - Generating new filter spec');

    // FIX 4: Classify query type
    const queryType = this.classifyQueryType(userQuery);
    console.log(`🔍 Query type detected: ${queryType}`);

    const prompt = this.buildPrompt(userQuery, metadata, queryType);

    try {
      const llm = this.getLLM();
      const response = await llm.invoke(prompt);
      const content = response.content;

      // Extract JSON from response (handles cases where LLM adds explanation)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM did not return valid JSON');
      }

      let filterSpec = JSON.parse(jsonMatch[0]);

      // Add metadata
      filterSpec.generatedAt = new Date().toISOString();
      filterSpec.originalQuery = userQuery;
      filterSpec.queryType = queryType;

      // ⭐ POST-PROCESS: Fix common LLM mistakes (THIS IS THE KEY FIX)
      filterSpec = this.postProcessFilters(filterSpec, queryType, userQuery); // Track query type for debugging

      // Clean up invalid LLM responses
      this.cleanupFilterSpec(filterSpec);

      // Normalize platform names based on actual data
      this.normalizePlatformNames(filterSpec, metadata);

      // Store in cache
      this.cache.set(userQuery, filterSpec);
      const cacheStats = this.cache.getStats();
      console.log(`   Cached filter spec. Cache stats: ${cacheStats.size}/${cacheStats.maxSize} entries, ${cacheStats.hitRate} hit rate`);

      return filterSpec;
    } catch (error) {
      console.error('Error generating filters:', error);
      throw new Error(`Failed to generate filters: ${error.message}`);
    }
  }

  /**
   * Build comprehensive prompt for LLM
   * FIX 1, 2, 3: Enhanced with better aggregation rules, date handling, and comparative query handling
   */
  buildPrompt(userQuery, metadata, queryType = 'factual') {
    let prompt = `You are a data analyst assistant specialized in generating database filter conditions.

DATASET METADATA:
${JSON.stringify(this.formatMetadataForPrompt(metadata), null, 2)}

USER QUERY:
"${userQuery}"

YOUR TASK:
Generate a JSON object that specifies how to filter and analyze this dataset to answer the user's query.

FILTER SPECIFICATION FORMAT:
{
  "filters": [
    {
      "column": "column_name",
      "operator": "equals|not_equals|greater_than|less_than|greater_than_or_equal|less_than_or_equal|contains|not_contains|in|not_in|between|after|before",
      "value": "single_value or array for 'in'/'between' operators",
      "reason": "Brief explanation of why this filter was chosen"
    }
  ],
  "groupBy": ["column1", "column2"],
  "aggregate": {
    "actual_column_name": "sum|mean|median|count|min|max|std|variance|mode|range|p25|p50|p75|p90|p95|p99|distinctCount|first|last"
  },
  "sortBy": {
    "column": "column_name",
    "order": "asc|desc"
  },
  "limit": 10,
  "interpretation": "Brief explanation of what the user is asking for"
}

AGGREGATION FUNCTIONS AVAILABLE:
- Basic: sum, mean, median, count, min, max
- Statistical: std (standard deviation), variance, mode, range
- Percentiles: p25, p50 (median), p75, p90, p95, p99
- Other: distinctCount (unique values), first, last

═══════════════════════════════════════════════════════════
⚠️ FIX 1: CRITICAL AGGREGATION RULES
═══════════════════════════════════════════════════════════

1. ALWAYS use actual column names from the dataset, NEVER use placeholders
2. For COUNT operations, use ANY existing column (recommended: "post_id", "campaign_id", or "platform")
3. NEVER use generic placeholder names like "metric_column", "column_name", "field"

CORRECT EXAMPLES:
✅ {"post_id": "count"}  // Counts total records (RECOMMENDED for counting)
✅ {"campaign_id": "count"}  // Counts campaigns
✅ {"platform": "count"}  // Counts platforms
✅ {"engagement_rate": "mean"}  // Average engagement rate
✅ {"likes": "sum"}  // Total likes
✅ {"reach": "max"}  // Maximum reach

WRONG EXAMPLES (WILL FAIL VALIDATION):
❌ {"metric_column": "count"}  // "metric_column" does not exist in dataset
❌ {"column_name": "sum"}  // "column_name" does not exist in dataset  
❌ {"field": "mean"}  // "field" does not exist in dataset

AVAILABLE COLUMNS FOR AGGREGATION:
Numeric columns: ${metadata.numericColumns?.join(', ') || 'impressions, reach, likes, comments, shares, saves, engagement_rate'}
ID columns (for counting): post_id, campaign_id, platform

For counting queries ("how many"), use: "post_id" (recommended) or "campaign_id" or "platform"

OPERATOR GUIDELINES:
- Use "contains" for partial text/date matching (e.g., "11-2025" in "posted_date" for November)
- Use "equals" for exact matches
- Use "in" for multiple possible values (value must be array)
- Use "between" for ranges (value must be array of 2 elements: [min, max])
- Use "greater_than", "less_than" for numeric comparisons
- Use "after", "before" for date comparisons
- Use "not_equals", "not_contains", "not_in" for exclusions

COMPLEX FILTERS (AND/OR):
For complex conditions, use nested structure:
{
  "type": "and|or",
  "conditions": [
    { "column": "...", "operator": "...", "value": "..." },
    { "column": "...", "operator": "...", "value": "..." }
  ]
}

AGGREGATION RULES:
- For COMPARISON queries ("compare platforms", "which platform is best"), use groupBy and aggregate
- For INDIVIDUAL ITEM queries ("most liked post", "top post", "highest engagement post"), DO NOT use groupBy or aggregate
  - Instead: filter appropriately, sort by the target metric, limit to desired count
  - Return individual records, not aggregated summaries
- When aggregating: use "mean" for rates/percentages, "sum" for counts, "count" for frequency

═══════════════════════════════════════════════════════════
⚠️ FIX 2: CRITICAL DATE HANDLING RULES
═══════════════════════════════════════════════════════════

- Current date: ${new Date().toISOString().split('T')[0]} (Year ${new Date().getFullYear()})
- **IMPORTANT**: The dataset contains historical data from 2025
- Date format in dataset: DD-MM-YYYY (e.g., "07-11-2025", "15-09-2025")
- Date column name: "posted_date"

⚠️ CRITICAL: Always use "contains" operator for date matching, NEVER use "equals"

QUARTER TO MONTH MAPPING (Default to 2025 unless user specifies year):
- Q1 = January-March = "01-YYYY", "02-YYYY", "03-YYYY"
- Q2 = April-June = "04-YYYY", "05-YYYY", "06-YYYY"
- Q3 = July-September = "07-YYYY", "08-YYYY", "09-YYYY"
- Q4 = October-December = "10-YYYY", "11-YYYY", "12-YYYY"

**YEAR HANDLING:**
- If user mentions a specific year (e.g., "Q3 2025" or "November 2026"), use that year
- If no year specified, default to 2025 (the year of the dataset)
- Extract year from query using pattern: /\b(202[0-9]|203[0-9])\b/

HOW TO FILTER BY QUARTER (USE OR LOGIC) - CRITICAL:

⚠️⚠️⚠️ MANDATORY EXAMPLE - MEMORIZE THIS ⚠️⚠️⚠️

When user asks about "Q3", "third quarter", or "July to September":

YOU ABSOLUTELY MUST GENERATE THIS STRUCTURE:
{
  "filters": [
    {
      "type": "or",
      "conditions": [
        {"column": "posted_date", "operator": "contains", "value": "07-2025"},
        {"column": "posted_date", "operator": "contains", "value": "08-2025"},
        {"column": "posted_date", "operator": "contains", "value": "09-2025"}
      ]
    }
  ],
  "groupBy": ["platform"],
  "aggregate": {"engagement_rate": "mean"},
  "sortBy": {"column": "engagement_rate", "order": "desc"}
}

🚨 CRITICAL RULES:
1. NEVER leave "filters" empty or null for Q3 queries
2. ALWAYS use "type": "or" for quarter queries
3. ALWAYS use "contains" operator with MM-YYYY format
4. NEVER use "Q3" as a value - it won't match any data!

QUARTER TO MONTH MAPPING (MEMORIZE):
- Q1 = "01-2025", "02-2025", "03-2025" (Jan, Feb, Mar)
- Q2 = "04-2025", "05-2025", "06-2025" (Apr, May, Jun)
- Q3 = "07-2025", "08-2025", "09-2025" (Jul, Aug, Sep)
- Q4 = "10-2025", "11-2025", "12-2025" (Oct, Nov, Dec)

WRONG APPROACHES (THESE WILL FAIL):
❌ {"column": "posted_date", "operator": "equals", "value": "Q3"}
❌ {"column": "posted_date", "operator": "contains", "value": "Q3"}
❌ {"column": "quarter", "operator": "equals", "value": "3"}
❌ Leaving filters array empty and putting "Q3" only in interpretation

CORRECT APPROACH (THE ONLY WAY):
✅ Use OR logic with individual month filters as shown above

MORE EXAMPLES:

Example: "Q4 performance"
CORRECT:
{
  "type": "or",
  "conditions": [
    {"column": "posted_date", "operator": "contains", "value": "10-2025"},
    {"column": "posted_date", "operator": "contains", "value": "11-2025"},
    {"column": "posted_date", "operator": "contains", "value": "12-2025"}
  ]
}

Example: "Last quarter" (Data is from 2025, so use 2025 quarters)
CORRECT:
{
  "type": "or",
  "conditions": [
    {"column": "posted_date", "operator": "contains", "value": "07-2025"},
    {"column": "posted_date", "operator": "contains", "value": "08-2025"},
    {"column": "posted_date", "operator": "contains", "value": "09-2025"}
  ]
}

Example: "Q1 2026 performance" (User specified 2026)
CORRECT:
{
  "type": "or",
  "conditions": [
    {"column": "posted_date", "operator": "contains", "value": "01-2026"},
    {"column": "posted_date", "operator": "contains", "value": "02-2026"},
    {"column": "posted_date", "operator": "contains", "value": "03-2026"}
  ]
}

HOW TO FILTER BY SINGLE MONTH:
November 2025: {"column": "posted_date", "operator": "contains", "value": "11-2025"}
September 2025: {"column": "posted_date", "operator": "contains", "value": "09-2025"}
November (no year): {"column": "posted_date", "operator": "contains", "value": "11-2025"} (default to 2025)

HOW TO FILTER BY DATE RANGE (Multiple Months):
Use OR logic:
{
  "type": "or",
  "conditions": [
    {"column": "posted_date", "operator": "contains", "value": "10-2025"},
    {"column": "posted_date", "operator": "contains", "value": "11-2025"},
    {"column": "posted_date", "operator": "contains", "value": "12-2025"}
  ]
}

REMEMBER:
- ALWAYS use "contains" for dates (not "equals")
- For quarters/multiple months: use OR logic with type: "or"
- Date format is DD-MM-YYYY

PLATFORM NAME HANDLING:
- Platform names are case-insensitive and normalized automatically
- Use proper capitalization: "Instagram", "Facebook", "Twitter", "LinkedIn", "TikTok", "YouTube"
- "instagram", "INSTAGRAM", "Instagram" will all match the same data
- For ads platforms: "Facebook Ads", "Google Ads", "Instagram Ads", etc.

CONTENT TYPE / POST TYPE HANDLING:
- When user asks about "post type", "content type", "post format", or similar, use "media_type" column
- Available media types: "image", "video", "carousel"
- The "post_type" column only contains "organic" (for organic posts) or is empty for ads
- Examples:
  * "Which post type performs best?" → Group by "media_type"
  * "Worst performing post type" → Group by "media_type", sort by engagement_rate ascending
  * "Compare carousel vs video posts" → Filter media_type in ["carousel", "video"]
- For ADS data (Facebook Ads, Google Ads, Instagram Ads):
  * Use "ad_format" column for format (Carousel, Stories, Video, Single Image, Collection)
  * Do NOT use "media_type" for ads (that is for organic posts only)
  * Example: "Which ad format has lowest cost?" → Group by "ad_format", aggregate cost_per_conversion

SENTIMENT / FEEDBACK / COMMENT ANALYSIS:

🚨 CRITICAL DISTINCTION - READ THIS FIRST:
When user asks about "SENTIMENT SCORES" they mean the AI-generated sentiment confidence scores (0.0-1.0)
When user asks about "ENGAGEMENT" they mean likes, comments, shares, engagement_rate
THESE ARE COMPLETELY DIFFERENT! DO NOT CONFUSE THEM!

- The dataset includes sentiment analysis data from comments in a SEPARATE file from posts
- Available sentiment columns: "label" (positive/negative/neutral), "score" (confidence 0-1), "comment_text", "comment_id", "platform", "post_id"
- The "score" column represents the AI model's confidence level of the sentiment classification (0.0 to 1.0)
  * score = 0.9484 means 94.84% confident this is negative sentiment
  * score = 0.7429 means 74.29% confident this is negative sentiment
  * Higher score = more confident classification
- **CRITICAL**: To query ONLY sentiment data, you MUST filter for records that have a "comment_id" column OR "label" column
  * Sentiment records have: comment_id, post_id, comment_text, label, score, platform
  * Post records have: likes, engagement_rate, reach, impressions (but NO comment_id or label or score)
  * If you don't filter properly, you'll mix post and sentiment data together
- Sentiment data is linked to posts via "post_id" column and INCLUDES platform information
- **IMPORTANT**: When showing comments/feedback, ALWAYS include the "platform" column in groupBy or limit results to preserve platform context
- When user asks about "feedback", "complaints", "sentiment", "negative/positive comments", use the sentiment data

SENTIMENT SCORE PRIORITIZATION:
- When user asks "which posts to reply to first based on sentiment scores", they typically mean:
  * **HIGH NEGATIVE SCORES** = Urgent complaints/issues needing response (filter: label="negative", sort by score DESC)
  * **HIGH POSITIVE SCORES** = Strong positive feedback to engage with (filter: label="positive", sort by score DESC)
  * Default interpretation: Prioritize NEGATIVE comments with high scores (complaints need urgent attention)
- "Sentiment score" queries should sort by the "score" column, NOT engagement_rate
- **CRITICAL**: Sentiment data is in a SEPARATE file from post data. To query sentiment:
  * You MUST NOT group by or aggregate on engagement metrics
  * Focus on columns: post_id, comment_text, label, score, platform
  * Sort by "score" column (sentiment confidence), NOT engagement_rate
- Examples:
  * "Which posts should I reply to based on sentiment?" → Filter label="negative", sort by score DESC, limit N
  * "Top 3 posts by sentiment score" → Filter label="negative", sort by score DESC, limit 3
  * "Posts with strongest negative sentiment" → Filter label="negative", sort by score DESC

⚠️ CRITICAL EXAMPLE for "which 3 posts to reply to based on sentiment scores":

WRONG APPROACH - DO NOT DO THIS:
❌ {
  "filters": [{"column": "label", "operator": "equals", "value": "negative"}],
  "groupBy": ["post_id"],  // ❌ WRONG - This aggregates and loses individual comments
  "aggregate": {"score": "mean"},  // ❌ WRONG - We want individual scores, not averages
  "sortBy": {"column": "score_mean", "order": "desc"}
}

CORRECT APPROACH - DO THIS:
✅ {
  "filters": [
    {
      "column": "label",
      "operator": "equals",
      "value": "negative",
      "reason": "Focus on negative sentiment (complaints needing replies)"
    }
  ],
  "groupBy": [],  // ⚠️ CRITICAL: Leave EMPTY - No grouping at all!
  "aggregate": {},  // ⚠️ CRITICAL: Leave EMPTY - No aggregation at all!
  "sortBy": {
    "column": "score",  // ✅ CORRECT - Sort by sentiment score column
    "order": "desc"
  },
  "limit": 3,
  "interpretation": "Finding top 3 negative comments with highest sentiment confidence scores"
}

EXPECTED RESULT: 3 individual comment records like:
[
  {comment_id: "C_0004", post_id: "POST_0003", comment_text: "Worst service ever...", label: "negative", score: 0.9484, platform: "Twitter"},
  {comment_id: "C_0002", post_id: "POST_0001", comment_text: "Price is a bit high...", label: "negative", score: 0.7429, platform: "Facebook"}
]

NOT: A single aggregated row with mean score and engagement_rate!
If you return aggregated data or engagement metrics, you did it WRONG!

GENERAL SENTIMENT EXAMPLES:
  * "Which platform has the most negative feedback?" → Filter label = "negative", group by platform, count
  * "What are people complaining about?" → Filter label = "negative", group by ["platform", "comment_text"] to show which platform each complaint is from
  * "Most positive sentiment platform?" → Filter label = "positive", group by platform, count
  * "Show me negative comments" → Filter label = "negative", group by ["platform", "comment_text"] OR just limit results to include platform
  * "Extract themes from negative feedback" → Filter label = "negative", group by ["platform", "comment_text"] to preserve platform context
  * "Posts to reply to based on sentiment scores" → Filter label="negative", sort by score DESC, limit N

- **CRITICAL**: Never lose platform context when analyzing comments - include platform in groupBy when showing individual comments
- **CRITICAL**: When user mentions "sentiment score", sort by the "score" column, NOT engagement_rate or other metrics
- Sentiment labels are: "positive", "negative", "neutral" (lowercase)

AMBIGUOUS QUERY HANDLING:
If a query is ambiguous or missing critical information, set "needsClarification": true and provide options.

Ambiguous patterns:
- "best post" without specifying metric (likes? engagement? reach?)
- "engagement" without specifying platform (all platforms? specific one?)
- "this week/month" without clear date context
- Time-based queries without platform specification
- Generic superlatives without clear criteria

CLARIFIED QUERY HANDLING:
If a query contains "[Selected: ...]" at the end, extract the selection and process accordingly:
- "Best Post on Twitter [Selected: Highest Engagement Rate]" → Use engagement_rate as the metric
- "Are there more engagements during the week or weekends? [Selected: All Platforms Combined]" → Don't filter by platform
- Extract the selection, remove the "[Selected: ...]" part, and process the query with that context
- **CRITICAL**: DO NOT ask for clarification again if the query already has a "[Selected: ...]" tag
- **CRITICAL**: If a query has "[Selected: ...]", you MUST set needsClarification to FALSE
- Make reasonable assumptions based on the selected option rather than asking for more clarification
- If the query references data that doesn't exist (like day_type), return needsClarification with explanation

When needsClarification is true, you MUST return a structured clarification request.

Example for ambiguous "best post" query:
{
  "needsClarification": true,
  "clarificationNeeded": "What metric should I use to determine 'best'?",
  "suggestedOptions": [
    {"label": "By Likes", "description": "Post with most likes"},
    {"label": "By Engagement Rate", "description": "Highest engagement percentage"},
    {"label": "By Reach", "description": "Post that reached most people"}
  ],
  "interpretation": "User asked for 'best post' but didn't specify the success metric"
}

BEST/TOP/WORST QUERY HANDLING:
- "Best post" → Needs clarification OR default to engagement_rate if context is clear
- "Most liked post" → Sort by likes DESC
- "Highest engagement" → Sort by engagement_rate DESC
- "Worst performing" → Sort by engagement_rate ASC (for organic) or ROAS ASC (for ads)
- "Top posts" → Default to engagement_rate unless metric specified
`;

    // FIX 3: Add query-type specific guidance
    if (queryType === 'ranking_category') {
      prompt += `
═══════════════════════════════════════════════════════════
⚠️ FIX 3: COMPARATIVE RANKING QUERY DETECTED (CATEGORIES)
═══════════════════════════════════════════════════════════

User is asking for worst/best/top/lowest across CATEGORIES (platforms, types, formats).

CRITICAL RULES:
1. DO NOT add restrictive filters that limit comparison
2. USE groupBy for the categories being compared (e.g., ["platform", "media_type"])
3. RETURN all groups (limit 12-20) to show full comparison context
4. SORT by the metric being compared

Example: "What is the worst performing post type?"
User wants to COMPARE all platform × content type combinations

CORRECT:
{
  "filters": [],  // ⚠️ NO filters - need ALL data for full comparison
  "groupBy": ["platform", "media_type"],
  "aggregate": {
    "engagement_rate": "mean"
  },
  "sortBy": {
    "column": "engagement_rate",
    "order": "asc"  // ascending for "worst"
  },
  "limit": 12,  // Return all combinations for comparison context
  "interpretation": "Comparing all platform × content type combinations to find worst performer"
}

WRONG:
❌ {
  "filters": [{"column": "engagement_rate", "operator": "less_than", "value": 5}],
  "limit": 1  // Don't restrict to only the worst - need comparison context
}

Remember: User needs to see ALL categories compared, not just the worst/best one!
`;
    }

    if (queryType === 'ranking_individual') {
      prompt += `
═══════════════════════════════════════════════════════════
⚠️ FIX 3: INDIVIDUAL RANKING QUERY DETECTED
═══════════════════════════════════════════════════════════

User is asking for top/best/worst individual ITEMS (posts, campaigns, etc).

CRITICAL RULES:
1. DO NOT use groupBy (want individual records, not grouped summaries)
2. DO NOT use aggregate (want actual items, not aggregated statistics)
3. USE sortBy to rank items by the relevant metric
4. LIMIT to the requested number of items

Example: "Top 5 posts with most likes"
User wants INDIVIDUAL posts, not grouped data

CORRECT:
{
  "filters": [],  // No filters unless specified
  "groupBy": [],  // ⚠️ NO groupBy - want individual posts
  "aggregate": {},  // ⚠️ NO aggregate - want actual records
  "sortBy": {
    "column": "likes",
    "order": "desc"
  },
  "limit": 5,
  "interpretation": "Finding top 5 individual posts by likes count"
}

WRONG:
❌ {
  "groupBy": ["post_id"],  // Don't group for individual items
  "aggregate": {"likes": "sum"}  // Don't aggregate
}

Remember: Return actual individual records, not aggregated summaries!
`;
    }

    if (queryType === 'temporal') {
      prompt += `
═══════════════════════════════════════════════════════════
⚠️ FIX 2: TEMPORAL QUERY DETECTED
═══════════════════════════════════════════════════════════

User is asking about specific time periods (Q1/Q2/Q3/Q4/months).

CRITICAL RULES:
1. Use OR logic with type: "or" for quarter queries (covers 3 months)
2. Use "contains" operator for dates (NEVER "equals")
3. Date format is DD-MM-YYYY
4. Map quarters correctly: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec

Example: "Q3 performance"
CORRECT:
{
  "filters": [
    {
      "type": "or",
      "conditions": [
        {"column": "posted_date", "operator": "contains", "value": "07-2025"},
        {"column": "posted_date", "operator": "contains", "value": "08-2025"},
        {"column": "posted_date", "operator": "contains", "value": "09-2025"}
      ]
    }
  ]
}
`;
    }

    if (queryType === 'counting') {
      prompt += `
═══════════════════════════════════════════════════════════
⚠️ FIX 1: COUNTING QUERY DETECTED
═══════════════════════════════════════════════════════════

User is asking "how many" or "count".

CRITICAL RULES:
1. Use actual column names like "post_id" or "campaign_id" for counting
2. NEVER use placeholder names like "metric_column", "column_name", "field"
3. Use {"post_id": "count"} for counting posts
4. Use {"campaign_id": "count"} for counting campaigns

Example: "How many campaigns?"
CORRECT:
{
  "aggregate": {
    "campaign_id": "count"  // ✅ Actual column name
  }
}

WRONG:
{
  "aggregate": {
    "metric_column": "count"  // ❌ This will fail validation
  }
}
`;
    }

    prompt += `

IMPORTANT RULES:
1. Return ONLY the JSON object, no markdown formatting or explanations outside the JSON
2. All column names must exist in the metadata provided
3. All values must match the data types (text for text columns, numbers for numeric columns)
4. For categorical columns, use values from the "possibleValues" list when exact matches are needed
5. Be case-insensitive when matching text values
6. If query is ambiguous AND context cannot resolve it, set needsClarification: true
7. Always include "interpretation" to show your understanding of the query
8. Prefer single-step solutions - don't create multi-step dependencies unless truly necessary

EXAMPLES:

Example 1:
Query: "Which platform performed best in November?"
Response:
{
  "filters": [
    {
      "column": "posted_date",
      "operator": "contains",
      "value": "11-2025",
      "reason": "November = month 11"
    }
  ],
  "groupBy": ["platform"],
  "aggregate": {
    "engagement_rate": "mean",
    "likes": "sum",
    "reach": "sum"
  },
  "sortBy": {
    "column": "engagement_rate",
    "order": "desc"
  },
  "limit": 10,
  "interpretation": "Comparing all platforms by average engagement rate in November 2025"
}

Example 2:
Query: "Show me the top 3 posts with most likes on Instagram"
Response:
{
  "filters": [
    {
      "column": "platform",
      "operator": "equals",
      "value": "Instagram",
      "reason": "User specified Instagram"
    }
  ],
  "groupBy": [],
  "aggregate": {},
  "sortBy": {
    "column": "likes",
    "order": "desc"
  },
  "limit": 3,
  "interpretation": "Finding the 3 individual Instagram posts with highest likes count"
}

Example 3:
Query: "How many Facebook posts have more than 100 comments?"
Response:
{
  "filters": [
    {
      "column": "platform",
      "operator": "equals",
      "value": "Facebook",
      "reason": "User specified Facebook"
    },
    {
      "column": "comments",
      "operator": "greater_than",
      "value": 100,
      "reason": "User wants posts with more than 100 comments"
    }
  ],
  "groupBy": [],
  "aggregate": {
    "post_id": "count"
  },
  "sortBy": {},
  "interpretation": "Counting Facebook posts that have more than 100 comments"
}

Example 4:
Query: "Compare Instagram vs Facebook performance in Q3"
Response:
{
  "filters": [
    {
      "type": "or",
      "conditions": [
        {"column": "posted_date", "operator": "contains", "value": "07-2025"},
        {"column": "posted_date", "operator": "contains", "value": "08-2025"},
        {"column": "posted_date", "operator": "contains", "value": "09-2025"}
      ]
    },
    {
      "column": "platform",
      "operator": "in",
      "value": ["Instagram", "Facebook"],
      "reason": "User wants to compare these two platforms"
    }
  ],
  "groupBy": ["platform"],
  "aggregate": {
    "engagement_rate": "mean",
    "reach": "sum"
  },
  "sortBy": {
    "column": "engagement_rate",
    "order": "desc"
  },
  "limit": 2,
  "interpretation": "Comparing Instagram and Facebook performance metrics during Q3 2025 (July-September)"
}

Now process the user's query and return ONLY valid JSON.`;

    return prompt;
  }

  /**
   * Format metadata for prompt (keep existing implementation)
   */
  formatMetadataForPrompt(metadata) {
    return {
      totalRecords: metadata.files.reduce((sum, f) => sum + f.recordCount, 0),
      files: metadata.files.map(f => ({
        name: f.name,
        recordCount: f.recordCount,
        type: f.type
      })),
      columns: metadata.columns,
      numericColumns: metadata.numericColumns,
      categoricalColumns: Object.keys(metadata.uniqueValues || {}).filter(col =>
        Array.isArray(metadata.uniqueValues[col])
      ),
      dateColumns: metadata.dateColumns,
      possibleValues: metadata.uniqueValues,
      sampleData: metadata.sampleData ? metadata.sampleData.slice(0, 1) : []
    };
  }

  /**
   * Clean up LLM-generated filter spec (keep existing implementation)
   */
  cleanupFilterSpec(filterSpec) {
    // Remove empty arrays/objects
    if (filterSpec.filters && filterSpec.filters.length === 0) {
      delete filterSpec.filters;
    }
    if (filterSpec.groupBy && filterSpec.groupBy.length === 0) {
      delete filterSpec.groupBy;
    }
    if (filterSpec.aggregate && Object.keys(filterSpec.aggregate).length === 0) {
      delete filterSpec.aggregate;
    }

    // Ensure limit is reasonable
    if (filterSpec.limit && filterSpec.limit > 100) {
      filterSpec.limit = 100;
    }

    // Remove null/undefined values
    Object.keys(filterSpec).forEach(key => {
      if (filterSpec[key] === null || filterSpec[key] === undefined) {
        delete filterSpec[key];
      }
    });
  }

  /**
   * V4.3: Get detailed explanation for complexity type
   */
  getComplexityExplanation(category, query) {
    const explanations = {
      analysis: 'Complex statistical or correlation analysis requires specialized processing not currently available.',
      derivedMetrics: 'This metric needs to be calculated from raw data using a specific formula that must be defined first.',
      transformations: 'Data transformation and adjustment require baseline values or normalization factors not in the dataset.',
      statistics: 'Advanced statistical calculations (percentiles, distributions) require statistical processing capabilities.',
      segmentation: 'Cohort analysis and segmentation require grouping logic beyond simple platform/date filtering.',
      causation: 'Causal analysis and attribution require historical comparison data and statistical methods.',
      detection: 'Anomaly detection requires baseline calculations and deviation analysis not currently available.',
      nlp: 'Natural language processing and text analysis require the actual text content which is not in the dataset.',
      timeSeries: 'Time series analysis like seasonality adjustment requires historical baselines and trend analysis.',
      prediction: 'Predictive analysis requires machine learning models trained on historical data.'
    };

    return explanations[category] || 'This query requires analysis capabilities beyond current system scope.';
  }

  /**
   * V4.3: Get available data summary
   */
  getAvailableData(metadata) {
    const columns = metadata.columns || {};
    const available = [];

    // Engagement metrics
    if (columns.engagement_rate) available.push('Engagement rates');
    if (columns.likes) available.push('Likes, comments, shares');
    if (columns.reach) available.push('Reach and impressions');

    // Campaign metrics
    if (columns.roas) available.push('ROAS (Return on Ad Spend)');
    if (columns.conversions) available.push('Conversions and conversion rates');
    if (columns.ctr) available.push('Click-through rates (CTR)');

    // Platform/time data
    if (columns.platform) available.push('Platform breakdowns');
    if (columns.posted_date) available.push('Date/time data');

    return available.length > 0 ? available : ['Basic metrics and platform data'];
  }

  /**
   * V4.3: Get missing capabilities for category
   */
  getMissingCapabilities(category) {
    const missing = {
      analysis: ['Correlation coefficients', 'Statistical significance', 'Trend predictions'],
      derivedMetrics: ['Pre-calculated scores', 'Composite indices', 'Custom formulas'],
      transformations: ['Normalized values', 'Seasonality adjustments', 'Baseline comparisons'],
      statistics: ['Percentile rankings', 'Distribution curves', 'Standard deviations'],
      segmentation: ['User cohorts', 'Audience segments', 'Behavioral clusters'],
      causation: ['Causal relationships', 'Attribution models', 'Impact factors'],
      detection: ['Anomaly scores', 'Outlier identification', 'Deviation alerts'],
      nlp: ['Text content', 'Sentiment scores', 'Keyword extraction'],
      timeSeries: ['Seasonality factors', 'Cyclical patterns', 'YoY comparisons'],
      prediction: ['Future projections', 'Predictive models', 'Forecast data']
    };

    return missing[category] || ['Advanced analysis capabilities'];
  }

  /**
   * V4.3: Get helpful alternatives for complexity type
   */
  getSimilarAlternatives(category, metadata) {
    const alternatives = {
      analysis: [
        {
          option: 'Show me performance metrics by platform',
          description: 'Compare platforms side-by-side to spot patterns manually',
          reasoning: 'Visual comparison can reveal correlations'
        },
        {
          option: 'Show me top and bottom performing content',
          description: 'Identify extremes to understand what works and what doesn\'t',
          reasoning: 'Range analysis helps identify trends'
        },
        {
          option: 'Export data for external analysis',
          description: 'Get raw data to perform custom analysis in Excel/Python',
          reasoning: 'Full control over analysis methodology'
        }
      ],
      derivedMetrics: [
        {
          option: 'Show me the underlying metrics',
          description: 'See raw data (shares, reach) that would feed into the calculation',
          reasoning: 'You can calculate the derived metric manually'
        },
        {
          option: 'Show me posts sorted by related metrics',
          description: 'Sort by shares or engagement as proxy measures',
          reasoning: 'Related metrics often correlate with derived ones'
        },
        {
          option: 'Define how to calculate this metric',
          description: 'Specify the formula and I can help compute it',
          reasoning: 'Custom calculations possible with clear formulas'
        }
      ],
      nlp: [
        {
          option: 'Show me posts with highest comment counts',
          description: 'High comment volume may indicate engaging or controversial content',
          reasoning: 'Proxy for sentiment intensity'
        },
        {
          option: 'Show me posts with high engagement rates',
          description: 'Overall engagement correlates with positive reception',
          reasoning: 'Engagement is measurable sentiment indicator'
        },
        {
          option: 'Show me top performing content by platform',
          description: 'Successful content likely has positive sentiment',
          reasoning: 'Performance implies audience approval'
        }
      ]
    };

    // Default alternatives for categories not specifically defined
    const defaultAlternatives = [
      {
        option: 'Show me related available metrics',
        description: 'See what data is available that relates to your question',
        reasoning: 'Find closest available alternative'
      },
      {
        option: 'Show me overall performance summary',
        description: 'Get comprehensive view of all available metrics',
        reasoning: 'Broad view may reveal insights'
      },
      {
        option: 'Help me rephrase my question',
        description: 'Reframe your question using available data',
        reasoning: 'Different angle might be answerable'
      }
    ];

    return alternatives[category] || defaultAlternatives;
  }

  /**
   * V4.3: Get suggested actions for user
   */
  getSuggestedActions(category) {
    const actions = {
      analysis: [
        'Export data for statistical analysis in external tools',
        'Ask for specific metrics instead of correlations',
        'Focus on direct comparisons between platforms or time periods'
      ],
      derivedMetrics: [
        'Ask for the raw metrics that would feed into this calculation',
        'Define the specific formula you want calculated',
        'Use simpler proxy metrics that are directly available'
      ],
      nlp: [
        'Focus on engagement metrics as sentiment proxies',
        'Analyze comment volume and sharing patterns',
        'Look at performance trends to infer content reception'
      ],
      prediction: [
        'Analyze past trends to inform future decisions',
        'Compare time periods to spot patterns',
        'Focus on current performance rather than predictions'
      ]
    };

    const defaultActions = [
      'Simplify your question to use available metrics',
      'Ask to see what data is available',
      'Rephrase focusing on direct measurements'
    ];

    return actions[category] || defaultActions;
  }




  /**
   * Normalize platform names in filters (keep existing implementation)
   */
  normalizePlatformNames(filterSpec, metadata) {
    if (!filterSpec.filters) return;

    // Find platform column in metadata
    const platformColumn = metadata.uniqueValues && metadata.uniqueValues.platform
      ? { possibleValues: metadata.uniqueValues.platform }
      : null;

    if (!platformColumn) {
      return;
    }

    const actualPlatforms = platformColumn.possibleValues;

    // Platform name mapping - maps what users say to what's in the data
    const platformMappings = {
      'facebook': ['Facebook Ads', 'Facebook', 'facebook'],
      'instagram': ['Instagram Ads', 'Instagram', 'instagram'],
      'twitter': ['Twitter', 'X', 'twitter'],
      'linkedin': ['LinkedIn', 'linkedin'],
      'google': ['Google Ads', 'Google', 'google'],
      'youtube': ['YouTube', 'youtube'],
      'tiktok': ['TikTok', 'tiktok'],
    };

    // Helper function to find the best match for a platform name
    const findBestMatch = (platformName) => {
      if (!platformName) return platformName;

      const normalized = platformName.toLowerCase().trim();

      // First, check if it's already an exact match
      const exactMatch = actualPlatforms.find(p =>
        p && p.toLowerCase() === normalized
      );
      if (exactMatch) return exactMatch;

      // Then, check our mapping table
      const mappingKey = Object.keys(platformMappings).find(key =>
        normalized.includes(key) || key.includes(normalized)
      );

      if (mappingKey) {
        // Try to find the best match from the mapping list
        const possibleMatches = platformMappings[mappingKey];
        for (const possibleMatch of possibleMatches) {
          const match = actualPlatforms.find(p =>
            p && p.toLowerCase() === possibleMatch.toLowerCase()
          );
          if (match) {
            console.log(`   🔧 Normalized platform: "${platformName}" → "${match}"`);
            return match;
          }
        }
      }

      // No match found - return original (will be caught by validator)
      return platformName;
    };

    // Recursive function to normalize filters
    const normalizeFilter = (filter) => {
      // Handle complex filters with conditions (AND/OR)
      if (filter.type && filter.conditions) {
        filter.conditions.forEach(normalizeFilter);
        return;
      }

      // Handle simple filters
      if (filter.column &&
        (filter.column.toLowerCase() === 'platform' ||
          filter.column.toLowerCase() === 'source' ||
          filter.column.toLowerCase() === 'channel')) {

        // Normalize single value
        if (typeof filter.value === 'string') {
          filter.value = findBestMatch(filter.value);
        }

        // Normalize array values (for "in" operator)
        if (Array.isArray(filter.value)) {
          filter.value = filter.value.map(v =>
            typeof v === 'string' ? findBestMatch(v) : v
          );
        }
      }
    };

    // Apply normalization to all filters
    if (Array.isArray(filterSpec.filters)) {
      filterSpec.filters.forEach(normalizeFilter);
    }
  }
}

export default FilterGenerator;