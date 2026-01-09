# 🚀 Social Media Analytics Platform

**AI-Powered Social Media Intelligence & Sentiment Analysis System** with Advanced RAG, Real-time Sentiment Monitoring, and Multi-Platform Analytics

Transform hours of manual reporting into instant, actionable insights with real-time sentiment health tracking.

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Setup Instructions](#-setup-instructions)
- [Usage](#-usage)
- [Customization](#-customization)
- [Troubleshooting](#-troubleshooting)
- [Project Structure](#-project-structure)

---

## ✨ Features

### 🤖 AI-Powered Analysis
- **Natural Language Queries**: Ask questions in plain English
- **Context-Aware Responses**: Understands intent and provides relevant insights
- **Data-Driven Recommendations**: Actionable suggestions backed by real metrics

### 📊 Advanced RAG System
- **6-Level Hierarchical Chunking**: From individual posts to strategic insights
- **8-Tier Metadata System**: Rich, multi-dimensional data classification
- **Smart Retrieval**: Automatic metadata filtering and chunk-level routing
- **Sub-500ms Response Time**: Fast, efficient queries

### 🎯 Analytics Capabilities
- Compare platforms (Instagram, LinkedIn, Facebook, Twitter)
- Identify top/worst performing content
- Analyze trends over time
- Content strategy recommendations
- ROI and efficiency metrics

### 💅 Modern UI
- Clean, responsive design
- Real-time chat interface
- Sample queries for easy exploration
- Processing time indicators
- Mobile-friendly

### 📈 Real-Time Sentiment Analysis Dashboard
- **Multi-Platform Sentiment Monitoring**: Track sentiment health across Instagram, Facebook, LinkedIn, Twitter
- **AI-Powered Emotion Detection**: Classify comments using transformers (twitter-xlm-roberta-base-sentiment)
- **Live Health Scores**: Visual gauge charts showing platform-specific sentiment health (0-100)
- **Trend Visualization**: Historical sentiment tracking with interactive charts
- **Negative Alert System**: Real-time detection and display of negative comments
- **AI Reply Generation**: Automated response suggestions for negative comments
- **Simulation Scenarios**: Test crisis management, viral events, and normal operations
- **Auto-Refresh**: Live polling every 2 minutes for up-to-date insights



### 🛡️ Robust Query Guardrails (New! Jan 2026)
- **Intelligent Loop Prevention**: Smart detection preventing recursive clarification cycles for language and time-based queries
- **Data Discovery Mode**: Ask "What data do you have?" for a comprehensive guide to available metrics and platforms
- **Context-Aware Validations**: Proactive clarification for platform-specific limitations (e.g., "Twitter has no ad data", "Google has no organic posts")
- **Metric Ambiguity Resolution**: Auto-detection of confusing metric requests (e.g., distinguishing between organic 'engagement' and ad 'CTR')

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│              React 18 + Vite + Tailwind CSS                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXPRESS SERVER                               │
│                   Node.js + CORS                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LANGCHAIN ORCHESTRATION                       │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────────┐   │
│  │Query       │→ │Smart       │→ │PromptTemplate + LLM     │   │
│  │Analysis    │  │Retrieval   │  │(GPT-4o-mini)            │   │
│  └────────────┘  └────────────┘  └─────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  VECTOR STORE (RAG Core)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  6-Level Hierarchical Chunks                            │   │
│  │  Level 1: Individual Posts (granular)                   │   │
│  │  Level 2: Daily Summaries                               │   │
│  │  Level 3: Monthly Summaries                             │   │
│  │  Level 4: Platform Overviews                            │   │
│  │  Level 5: Cross-Platform Comparisons                    │   │
│  │  Level 6: Strategic Insights                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  8-Tier Metadata System                                  │   │
│  │  Tier 1: Basic Identifiers                              │   │
│  │  Tier 2: Temporal Metadata                              │   │
│  │  Tier 3: Performance Metrics                            │   │
│  │  Tier 4: Content Classification                         │   │
│  │  Tier 5: Contextual Performance                         │   │
│  │  Tier 6: Trend Analysis                                 │   │
│  │  Tier 7: Cross-Platform Context                         │   │
│  │  Tier 8: Recommendation Flags                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  OpenAI Embeddings (text-embedding-3-small, 1536 dims)          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCE                               │
│               CSV: campaign_performance.csv                      │
│       (Instagram, LinkedIn, Facebook, Twitter posts)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

```bash
# 1. Clone and navigate
cd social-command-center

# 2. Setup backend
cd server
npm install
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Setup frontend
cd ../client
npm install

# 4. Start backend (Terminal 1)
cd ../server
npm start

# 5. Start frontend (Terminal 2)
cd ../client
npm run dev

# 6. Open browser
# Frontend: http://localhost:5173
# Backend API: http://localhost:3001
```

---

## 📥 Setup Instructions

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+ (for sentiment analysis engine)
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))
- 2GB free RAM (for vector embeddings and ML models)

### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Install Python dependencies for sentiment analysis
cd ../scripts
pip install pandas transformers openai python-dotenv
```

### Step 2: Configure Environment

```bash
# In /server directory
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-actual-key-here
PORT=3001
NODE_ENV=development
```

### Step 3: Prepare Data

The system includes sample data in `/server/data/` with multiple CSV files:

**Organic Post Data Files:**
- `instagram_organic_posts.csv`
- `facebook_organic_posts.csv`
- `linkedin_organic_posts.csv`
- `twitter_organic_posts.csv`

**Ad Campaign Data Files:**
- `instagram_ads_ad_campaigns.csv`
- `facebook_ads_ad_campaigns.csv`
- `google_ads_ad_campaigns.csv`

**Sentiment Data Files:**
- `synthetic_comments_data.csv` - Raw comment data
- `enriched_comments_sentiment.csv` - AI-processed sentiment labels
- `sentiment_history.csv` - Historical sentiment trends
- `platform_sentiment_summary.json` - Latest health scores

**To use your own data:**
1. Replace CSV files with your data in the same format
2. Ensure required columns: `post_id, platform, post_type, media_type, posted_date, posted_time, content, impressions, reach, likes, comments, shares, saves, engagement_rate`
3. For sentiment analysis, provide comment data with: `comment_id, platform, comment_text, timestamp`

### Step 4: Start Services

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

You should see:
```
═══════════════════════════════════════════════════════════════════
✅ SERVER READY
═══════════════════════════════════════════════════════════════════
🌐 Server running on: http://localhost:3001
📡 API endpoint: http://localhost:3001/api/chat
❤️  Health check: http://localhost:3001/health
═══════════════════════════════════════════════════════════════════
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 5: Initialize Sentiment Analysis (Optional)

Run the sentiment engine to process initial comment data:

```bash
cd scripts
python3 sentiment_engine.py
```

This will:
- Load comments from `synthetic_comments_data.csv`
- Analyze sentiment using AI transformers
- Generate `enriched_comments_sentiment.csv`
- Create `platform_sentiment_summary.json` with health scores

### Step 6: Test the System

1. Open http://localhost:5173 in your browser
2. Navigate to "Command Center" and try a sample query: "Most liked post on Instagram for November?"
3. Navigate to "Sentiment Health" to view real-time sentiment dashboard
4. Test simulation scenarios (Normal, Crisis, Viral) to see live updates

---

## 🎮 Usage

### Two Main Features

#### 1️⃣ Command Center - AI Query Interface
Ask natural language questions about your social media performance.

**Sample Queries:**

**Performance Analysis:**
- "Most liked post on Instagram for the month of November?"
- "Which platform performed better in Q4?"
- "Show me engagement rate trends for December"
- "Top 5 performing posts this month"

**Platform Comparison:**
- "Compare Instagram vs LinkedIn performance this quarter"
- "Which platform would you not recommend and why?"
- "Platform-wise engagement rate comparison"
- "Which platform has the best ROI?"

**Content Strategy:**
- "Which is the worst performing post type and on which platform?"
- "What content themes work best on Instagram?"
- "Best time to post on each platform?"
- "Why did our engagement drop last week?"

**Recommendations:**
- "Draft 5 post ideas for our product launch"
- "Generate weekly performance summary for CMO"
- "What should we do to improve Facebook performance?"
- "Content strategy recommendations for next month"

#### 2️⃣ Sentiment Health Dashboard
Monitor real-time sentiment across all platforms with visual insights.

**Features:**
- **Health Score Gauges**: See sentiment health (0-100) for each platform
- **Trend Chart**: Track sentiment changes over time
- **Negative Alerts**: View recent negative comments requiring attention
- **AI Reply Generator**: Get AI-powered response suggestions
- **Simulation Testing**: Test different scenarios:
  - **Normal**: Regular data flow simulation
  - **Crisis**: Negative sentiment spike simulation
  - **Viral**: High engagement spike simulation
- **Auto-Refresh**: Dashboard updates every 2 minutes

**How to Use:**
1. Click "Sentiment Health" in the navigation
2. View platform health scores (Green = Good, Yellow = Warning, Red = Crisis)
3. Review negative alerts and generate AI responses
4. Test scenarios using the simulation buttons
5. Monitor trends over time in the chart

### API Endpoints

**Query API:**
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Most liked post on Instagram for November?"}'
```

**Sentiment Summary:**
```bash
curl http://localhost:3001/api/sentiment/summary
```

**Sentiment History:**
```bash
curl http://localhost:3001/api/sentiment/history
```

**Negative Alerts:**
```bash
curl http://localhost:3001/api/sentiment/negative-alerts
```

**Generate AI Reply:**
```bash
curl -X POST http://localhost:3001/api/sentiment/generate-reply \
  -H "Content-Type: application/json" \
  -d '{"comment": "Terrible service!", "platform": "Instagram"}'
```

**Trigger Simulation:**
```bash
curl -X POST http://localhost:3001/api/simulate/trigger \
  -H "Content-Type: application/json" \
  -d '{"scenario": "crisis"}'
```

---

## 🎨 Customization

### Change AI Behavior

Edit `/server/langchain/config.js`:

```javascript
systemPrompt: `You are an expert Social Media Intelligence Analyst...`
```

### Modify Sample Queries

Edit `/client/src/config.js`:

```javascript
sampleQueries: [
  {
    category: 'Your Category',
    icon: '🎯',
    queries: [
      'Your custom query here'
    ]
  }
]
```

### Adjust RAG Settings

Edit `/server/langchain/config.js`:

```javascript
retrieval: {
  topK: 15,  // Number of chunks to retrieve
  similarityThreshold: 0.3,  // Minimum similarity score
  // ... more settings
}
```

### Change UI Colors

Edit `/client/tailwind.config.js`:

```javascript
colors: {
  primary: '#7c3aed',  // Purple
  accent: '#ec4899',   // Pink
  // ... more colors
}
```

See `docs/guides/CUSTOMIZATION_GUIDE.md` for detailed instructions.

---

## 🔧 Troubleshooting

### Server won't start

**Error: "OPENAI_API_KEY is required"**
- Solution: Add your API key to `/server/.env` file

**Error: "Port 3001 already in use"**
```bash
# Find process using port
lsof -ti:3001
# Kill it
kill -9 <PID>
# Or change port in /server/.env
PORT=3002
```

### Vector store initialization fails

**Error: "Cannot read CSV file"**
- Ensure `/server/data/campaign_performance.csv` exists
- Check file permissions: `chmod 644 campaign_performance.csv`

### Frontend can't connect to backend

**Error: "API error: Failed to fetch"**
- Ensure backend is running: `curl http://localhost:3001/health`
- Check CORS settings in `/server/index.js`
- Verify proxy in `/client/vite.config.js`

### Slow responses

- Normal first query: 3-5 seconds (vector store initialization)
- Subsequent queries: <1 second
- If consistently slow:
  - Check OpenAI API status
  - Reduce `topK` in config (default: 15 → try 10)
  - Check network connection

### Empty or incorrect responses

- Check data format in CSV
- Verify metadata extraction in server logs
- Test with sample queries first
- Check OpenAI API quota/limits

---

## 📁 Project Structure

```
social-media-analytics-platform/
├── client/                          # React Frontend (Port 5173)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── CommandCenter.jsx  # AI query interface
│   │   │   └── SentimentHealth.jsx # Sentiment dashboard
│   │   ├── components/
│   │   │   ├── SentimentDashboard.jsx # Main sentiment UI
│   │   │   ├── SentimentTrend.jsx     # Trend chart
│   │   │   ├── SentimentSection.jsx   # Health gauges
│   │   │   ├── ReplyModal.jsx         # AI reply generator
│   │   │   ├── ClarificationDialog.jsx # Query clarification
│   │   │   ├── DataVisualization.jsx   # Data rendering
│   │   │   └── StructuredDataDisplay.jsx
│   │   ├── hooks/
│   │   │   └── useQueryHistory.js  # Query history management
│   │   ├── api/
│   │   │   └── client.js           # API communication
│   │   ├── config.js               # ✏️ App configuration
│   │   ├── App.jsx                 # Main app with routing
│   │   ├── main.jsx                # Entry point
│   │   └── index.css               # Tailwind styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── server/                          # Node.js Backend (Port 3001)
│   ├── routes/
│   │   └── chat.js                 # POST /api/chat endpoint
│   ├── langchain/                  # RAG & Vector Store
│   │   ├── chains.js               # ✏️ LangChain orchestration
│   │   ├── vectorStore.js          # RAG implementation
│   │   ├── chunking.js             # Hierarchical chunking
│   │   ├── metadata.js             # 8-tier metadata system
│   │   └── config.js               # ✏️ Domain configuration
│   ├── llm/                        # LLM Processing Pipeline
│   │   ├── queryProcessor.js       # Main orchestrator
│   │   ├── filterGenerator.js      # LLM-based filter creation
│   │   ├── conversationManager.js  # Multi-turn conversations
│   │   ├── clarificationEngine.js  # Query clarification
│   │   ├── responseFramer.js       # Response formatting
│   │   └── ...                     # Other LLM utilities
│   ├── utils/                      # Utility modules
│   │   ├── dataProcessor.js        # CSV loading & caching
│   │   ├── cache.js                # Query result caching
│   │   ├── queryLogger.js          # Query analytics
│   │   ├── statistics.js           # Statistics utilities
│   │   └── ...                     # Other utilities
│   ├── data/                       # CSV Data Files
│   │   ├── instagram_organic_posts.csv
│   │   ├── facebook_organic_posts.csv
│   │   ├── linkedin_organic_posts.csv
│   │   ├── twitter_organic_posts.csv
│   │   ├── instagram_ads_ad_campaigns.csv
│   │   ├── facebook_ads_ad_campaigns.csv
│   │   ├── google_ads_ad_campaigns.csv
│   │   ├── synthetic_comments_data.csv
│   │   ├── enriched_comments_sentiment.csv
│   │   ├── sentiment_history.csv
│   │   └── platform_sentiment_summary.json
│   ├── logs/                       # Query logs & analytics
│   ├── index.js                    # Express server with simulation endpoints
│   ├── package.json
│   └── .env.example
│
├── scripts/                         # Python Utilities
│   ├── sentiment_engine.py         # AI sentiment analysis pipeline
│   └── mock_streamer.py            # Data simulation (normal/crisis/viral)
│
├── README.md                        # This file
├── docs/                            # Documentation
│   ├── guides/                      # User & Setup Guides
│   │   ├── CUSTOMIZATION_GUIDE.md
│   │   └── DEPLOYMENT_GUIDE.md
│   └── reports/                     # Analysis & Dev Reports
└── .gitignore
```

**✏️ = Easy customization points**

---

## 🎓 How It Works

### 1. Data Ingestion
- CSV loaded on server startup
- Posts processed through hierarchical chunking (6 levels)
- Rich metadata generated (8 tiers)
- Embeddings created with OpenAI
- Stored in vector database

### 2. Query Processing
- User submits natural language query
- System classifies query intent
- Metadata extracted (platform, time, metrics)
- Smart retrieval with filtered search
- Relevant chunks retrieved (Level 1-6)

### 3. Response Generation
- Context formatted from retrieved chunks
- Prompt template with system instructions
- LLM generates data-driven response
- Formatted and returned to user

### 4. Metadata Power
- **Fast Filtering**: Platform/time filters in milliseconds
- **Smart Routing**: Queries automatically use appropriate chunk levels
- **Rich Context**: 40+ metadata fields per post
- **Accurate Insights**: Percentiles, trends, comparisons

---

## 🚀 Performance

- **Query Response**: <0.5s for simple queries, <2s for complex analysis
- **Vector Store Init**: ~3s for 158 posts (scales to 10K+ posts)
- **Memory Usage**: ~500MB RAM
- **Concurrent Users**: Handles 10+ simultaneous queries

---

## 📝 License

MIT License - Feel free to use for your project!

---

## 🤝 Support

**Issues?**
1. Check [Troubleshooting](#-troubleshooting) section
2. Review server logs for errors
3. Verify OpenAI API key and credits

**Questions?**
- Review `docs/guides/CUSTOMIZATION_GUIDE.md` for modification instructions
- Check code comments marked with `// ✏️ CUSTOMIZE`

---

## 🎉 Ready to Use!

Your AI-powered social media analytics platform with real-time sentiment monitoring is ready!

**Pro Tips:**
- **Command Center**: Start with sample queries to understand AI capabilities
- **Sentiment Dashboard**: Monitor platform health scores and test simulation scenarios
- Try complex comparisons across platforms and time periods
- Use AI reply generator for negative comments
- Watch sentiment trends to identify potential issues early
- Experiment with different query phrasings and multi-turn conversations

**Key Features to Showcase:**
1. Natural language queries with intelligent responses
2. Real-time sentiment health monitoring across 4 platforms
3. AI-powered reply generation for crisis management
4. Simulation scenarios for stress testing
5. Historical trend tracking and visualization
6. Multi-platform performance analytics

Transform your social media management with AI-powered insights! 🚀📊
