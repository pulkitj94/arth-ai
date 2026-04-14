// ═══════════════════════════════════════════════════════════════════════════
// LANGCHAIN CONFIGURATION - SOCIAL MEDIA DOMAIN
// ═══════════════════════════════════════════════════════════════════════════
// ✏️ CUSTOMIZE THIS FILE to change:
//    - System prompts and AI personality
//    - Platform names and metrics
//    - RAG retrieval settings
//    - Response formatting rules
// ═══════════════════════════════════════════════════════════════════════════

export const LANGCHAIN_CONFIG = {

  // ═══════════════════════════════════════════════════════════════════════════
  // AI PERSONALITY & BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Change how the AI acts and responds

  systemPrompt: `You are an expert Social Media Intelligence Analyst and Marketing Strategist for ARTH AI.

Your role is to provide data-driven insights, actionable recommendations, and strategic guidance for social media campaigns.

DATE AWARENESS — VERY IMPORTANT:
- Today is April 14, 2026
- The dataset contains historical data from 2025 (primarily October, November, December 2025)
- "Last month" means March 2026 — if no March 2026 data exists, clearly state this
- "This month" means April 2026 — if no April 2026 data exists, clearly state this
- "Last week" means the week of April 7-13, 2026 — if no data exists, clearly state this
- "November" without a year is ambiguous — if data exists for November 2025, use it and explicitly state the year
- If the user asks about a time period not covered by the data, clearly say:
  "The dataset covers data up to December 2025. No data is available for [requested period]."
- NEVER assume "last month" or "last week" refers to a period that exists in the 2025 dataset

CORE CAPABILITIES:
- Analyze performance metrics across Instagram, LinkedIn, Facebook, and Twitter
- Identify trends, patterns, and anomalies in engagement data
- Compare platforms, content types, and time periods
- Provide specific, quantified recommendations with expected ROI
- Draft content strategies and post ideas based on proven performance

CRITICAL: HANDLING AMBIGUOUS QUERIES
When a user's question is unclear or could have multiple interpretations:
1. **ASK CLARIFYING QUESTIONS** - Don't guess or provide vague answers
2. **List the available data** - Show what metrics/data you have access to
3. **Suggest specific alternatives** - "Did you mean X or Y?"
4. **Be direct** - "I need clarification: are you asking about [option A] or [option B]?"

Examples of when to clarify:
- "highest engagement" → Ask: "Do you mean engagement rate (%) or total engagement (likes + comments + shares)?"
- "best post" → Ask: "Best by which metric? Likes, engagement rate, reach, or saves?"
- "last month" → Clarify: "Last month is March 2026. The dataset only covers up to December 2025. Would you like data from December 2025 instead?"
- Comparing different metrics → Ask: "These are different metrics. Did you want to know if the same post had both the highest X and highest Y?"

CRITICAL RULES:
- **ALWAYS cite specific data** from the context provided
- **NEVER make up numbers** or metrics
- **ANALYTICAL CONTEXT is your PRIMARY source**: If you see a "COUNTING/FILTERING QUERY RESULT" or other analytics section, that is the AUTHORITATIVE answer - use it directly
- **If ANALYTICAL CONTEXT has the answer**: State it confidently with the exact numbers provided
- **If ANALYTICAL CONTEXT is empty or says "No specific analytics generated"**:
  - DO NOT guess or make up answers
  - DO NOT use vague numbers from vector store chunks
  - RESPOND: "I don't have the specific data loaded to answer this accurately. Let me know if you'd like me to analyze [suggest what type of analysis might help]"
- **BEFORE claiming data is missing**: CAREFULLY CHECK the ANALYTICAL CONTEXT first, then the raw data context
  - The context includes: likes, comments, shares, saves, engagement_rate, reach, impressions
  - If you see "Total Count: 3" in ANALYTICAL CONTEXT, that is the EXACT answer
  - Only claim data is missing if you've thoroughly checked both contexts
- **If data IS in the context**: Answer the question directly with the data
- **If data is truly missing**: Ask "I don't see [metric] in the data. Do you have this information?"
- **If query is ambiguous**: STOP and ask for clarification with specific options
- Distinguish between facts (from data) and recommendations (your analysis)
- Format numbers for readability (7,161 not 7161)
- Use emojis sparingly for visual markers (📊, 📈, 📉, ⚠️, ✅)

HANDLING DIFFERENT QUERY TYPES:

- **Factual queries** (e.g. "most liked post", "top post in November"):
  Direct answer with exact numbers in 1-2 sentences. No extra sections needed.

- **Comparative queries** (e.g. "Instagram vs LinkedIn", "which platform is better"):
  Use this format:
  🎯 **Key Insight**: One sentence winner/summary
  📊 **Data Evidence**: Side-by-side numbers from the data
  💡 **Recommendation**: One actionable next step

- **Analytical/Strategic queries** (e.g. "why did engagement drop", "how to improve", "weekly summary"):
  Use this full 5-section format:
  🎯 **Key Insight**: The single most important finding
  📊 **Data Evidence**: Specific metrics and numbers from the data
  💡 **Recommendation**: 2-3 actionable next steps with priority
  ✍️ **Content Ideas**: 2-3 specific post concepts based on what's working
  📈 **Benchmark Comparison**: How these numbers compare to the other platforms in the data

- **Ambiguous queries**: ASK CLARIFYING QUESTIONS immediately with specific options

- **Time period not in data**: Respond with:
  "⚠️ No data available for [requested period]. The dataset covers data up to December 2025.
  Here is the most recent data available: [show most recent records]"

- **Content creation** (e.g. "draft post ideas", "write captions"):
  Provide 3-5 specific post ideas with hooks, formats, and suggested hashtags based on top performing content in the data`,

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Platform names, metrics, and business context

  domain: {
    name: 'Social Media Marketing',
    platforms: ['Instagram', 'LinkedIn', 'Facebook', 'Twitter'],
    primaryMetrics: [
      'engagement_rate',
      'likes',
      'comments',
      'shares',
      'saves',
      'reach',
      'impressions'
    ],
    timeGranularities: ['hourly', 'daily', 'weekly', 'monthly', 'quarterly'],
    contentTypes: ['image', 'video', 'carousel', 'reel', 'story'],
    postTypes: ['organic', 'sponsored', 'boosted']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RAG RETRIEVAL SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: How many documents to retrieve and filtering behavior

  retrieval: {
    // Number of similar chunks to retrieve
    topK: 15,

    // Minimum similarity score (0-1, higher = more similar required)
    similarityThreshold: 0.5,

    // Maximum chunks to send to LLM (prevents token overflow)
    maxChunksToLLM: 20,

    // Search strategy
    searchType: 'similarity', // Options: 'similarity', 'mmr' (maximal marginal relevance)

    // Metadata filtering (these will be applied automatically when detected in query)
    enableMetadataFiltering: true,

    // Re-ranking strategy (re-order results by relevance)
    enableReranking: true
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHUNK LEVEL STRATEGY
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: How to route queries to different chunk levels

  chunkLevelRouting: {
    // Route queries to appropriate chunk levels based on intent
    factualQueries: [1], // Individual posts (e.g., "most liked post")
    timeBasedQueries: [2, 3], // Daily/monthly summaries
    platformQueries: [4, 5], // Platform comparisons
    strategicQueries: [3, 4, 5, 6], // All levels for comprehensive analysis
    trendQueries: [2, 3, 6], // Time-based patterns

    // Default levels if intent unclear
    defaultLevels: [1, 3, 4]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LLM SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Model behavior and parameters

  llm: {
    modelName: 'gpt-4o-mini',
    temperature: 0.1, // Default fallback temperature
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,

    // ✏️ CUSTOMIZE THIS: Temperature per query type
    // 0.0 = deterministic/factual, 1.0 = creative/varied
    temperatureProfiles: {
      factual:         0.1,  // "Most liked post in November?"
      comparative:     0.2,  // "Instagram vs LinkedIn performance"
      temporal:        0.2,  // "Engagement trends last month"
      strategic:       0.4,  // "How should we improve our reach?"
      negative:        0.2,  // "Worst performing content?"
      contentCreation: 0.9,  // "Draft 5 post ideas for product launch"
      default:         0.3   // Fallback for unclassified queries
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMBEDDING SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  embeddings: {
    modelName: 'text-embedding-3-small',
    dimensions: 1536
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RESPONSE FORMATTING
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: How responses are formatted

  formatting: {
    includeMetadata: true, // Show which data sources were used
    includeConfidence: true, // Show confidence level in answers
    maxResponseLength: 2000, // Characters

    // Performance indicators
    performanceEmojis: {
      up: '📈',
      down: '📉',
      stable: '➡️',
      excellent: '🔥',
      warning: '⚠️',
      success: '✅'
    },

    // Number formatting
    formatLargeNumbers: true, // 7161 → 7,161
    percentageDecimals: 2 // 7.85%
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// QUERY INTENT PATTERNS (for smart routing)
// ═══════════════════════════════════════════════════════════════════════════
// ✏️ CUSTOMIZE: Add patterns to recognize different query types

export const QUERY_PATTERNS = {
  factual: [
    /most\s+(liked|engaged|viewed|shared|saved)/i,
    /highest\s+(engagement|likes|reach)/i,
    /top\s+\d*\s*(post|content)/i,
    /which\s+post/i,
    /find\s+(post|content)/i
  ],

  comparative: [
    /compare/i,
    /vs\.?|versus/i,
    /better|worse/i,
    /difference\s+between/i,
    /which\s+platform/i
  ],

  temporal: [
    /trend/i,
    /over\s+time/i,
    /last\s+(week|month|quarter)/i,
    /this\s+(week|month|quarter)/i,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i
  ],

  strategic: [
    /how\s+to\s+improve/i,
    /strategy|strategic/i,
    /recommend|suggestion/i,
    /should\s+i|should\s+we/i,
    /what\s+to\s+do/i,
    /optimize|optimization/i
  ],

  negative: [
    /worst|poorest|lowest/i,
    /underperform/i,
    /not\s+recommend/i,
    /avoid/i,
    /decline|declining/i
  ],

  contentCreation: [
    /draft|write|create/i,
    /post\s+ideas?/i,
    /content\s+ideas?/i,
    /what\s+should\s+i\s+post/i
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// METADATA EXTRACTION RULES
// ═══════════════════════════════════════════════════════════════════════════
// Extract platforms, dates, metrics from queries for filtering

export const METADATA_EXTRACTION = {
  platforms: {
    instagram: ['instagram', 'ig', 'insta'],
    linkedin: ['linkedin', 'li'],
    facebook: ['facebook', 'fb', 'meta'],
    twitter: ['twitter', 'tweet', 'x.com', 'x platform']
  },

  months: {
    1: ['january', 'jan'],
    2: ['february', 'feb'],
    3: ['march', 'mar'],
    4: ['april', 'apr'],
    5: ['may'],
    6: ['june', 'jun'],
    7: ['july', 'jul'],
    8: ['august', 'aug'],
    9: ['september', 'sep', 'sept'],
    10: ['october', 'oct'],
    11: ['november', 'nov'],
    12: ['december', 'dec']
  },

  metrics: {
    likes: ['like', 'likes', 'liked'],
    comments: ['comment', 'comments'],
    shares: ['share', 'shares', 'shared'],
    saves: ['save', 'saves', 'saved'],
    engagement: ['engagement', 'engaged', 'interact'],
    reach: ['reach', 'reached', 'views', 'viewed']
  }
};

export default LANGCHAIN_CONFIG;