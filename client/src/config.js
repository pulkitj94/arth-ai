// ═══════════════════════════════════════════════════════════════════════════
// CLIENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// ✏️ CUSTOMIZE THIS FILE to change:
//    - App title and branding
//    - Sample queries
//    - API endpoint
//    - UI settings
// ═══════════════════════════════════════════════════════════════════════════

export const APP_CONFIG = {
  // ═══════════════════════════════════════════════════════════════════════════
  // BRANDING
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Change app name and tagline
  
  appName: 'Social Command Center',
  appTagline: 'AI-Powered Social Media Intelligence',
  appDescription: 'Ask anything about your social media performance',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // API CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  apiBaseUrl: 'http://localhost:3001',
  apiEndpoint: '/api/chat',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SAMPLE QUERIES (shown in sidebar)
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Add your own sample questions
  
  sampleQueries: [
    {
      category: 'View simple beginner examples',
      icon: '1️⃣',
      description: 'Simple queries for getting started (Organic Posts, Ads, Sentiment)',
      queries: [
        'Show me all Instagram posts from November 2025',
        'What is the average engagement rate for Facebook posts?',
        'Show me Facebook ad campaigns with highest CTR',
        'Show me negative sentiment comments for Instagram'
      ],
      defaultExpanded: false
    },
    {
      category: 'View intermediate complexity examples',
      icon: '2️⃣',
      description: 'Comparison and filtering queries across platforms',
      queries: [
        'Which platform performed better in Q4?',
        'Compare Instagram vs LinkedIn performance this quarter',
        'Show me top 10 Instagram posts by engagement',
        'Which platform has the most negative comments?'
      ],
      defaultExpanded: false
    },
    {
      category: 'View advanced analysis examples',
      icon: '3️⃣',
      description: 'Complex cross-data-type analysis and multi-metric comparisons',
      queries: [
        'Which is the worst performing post type and on which platform?',
        'Platform-wise engagement rate comparison with sentiment analysis',
        'Show me engagement rate trends for December across all platforms',
        'What is the ROI comparison between organic posts and ad campaigns?'
      ],
      defaultExpanded: false
    },
    {
      category: 'Show me the complete platform-data matrix',
      icon: '4️⃣',
      description: 'Detailed breakdown of what data exists for each platform',
      queries: [
        'Show me all available data types across all platforms',
        'What metrics are available for Instagram?',
        'Show me the complete data structure for Facebook',
        'List all platforms and their available data types'
      ],
      defaultExpanded: false
    },
    {
      category: 'Recommendations',
      icon: '🚀',
      description: 'Get actionable insights and strategic recommendations',
      queries: [
        'Draft 5 post ideas for our product launch',
        'Generate weekly performance summary for CMO',
        'What should we do to improve Facebook performance?',
        'Content strategy recommendations for next month'
      ],
      defaultExpanded: false
    }
  ],
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UI SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Adjust UI behavior
  
  ui: {
    showSampleQueries: true,
    showProcessingTime: true,
    enableMarkdownFormatting: true,
    maxMessageLength: 500,
    placeholderText: 'Ask me anything about your social media performance...',
    submitButtonText: 'Send',
    loadingMessages: [
      'Analyzing your data...',
      'Crunching the numbers...',
      'Finding insights...',
      'Almost there...'
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WELCOME MESSAGE
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Change initial welcome message
  
  welcomeMessage: {
    show: true,
    title: 'Welcome to Social Command Center! 👋',
    content: `I'm your AI-powered social media analyst. I can help you:

• 📊 Analyze performance across all platforms
• 🎯 Compare engagement rates and reach
• 💡 Identify top-performing content
• 📈 Spot trends and patterns
• 🚀 Get actionable recommendations

Try asking me a question, or click one of the sample queries to get started!`,
    actions: [
      {
        text: 'Sample Queries →',
        action: 'showSamples'
      }
    ]
  }
};

export default APP_CONFIG;
