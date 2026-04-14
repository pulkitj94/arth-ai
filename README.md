# ARTH AI — Social Media Intelligence Platform

**Ask anything about your social media performance. Get instant, data-backed answers.**

🌐 **Live Demo:** [arth-ai-app.vercel.app](https://arth-ai-app.vercel.app)
📦 **Backend API:** [arth-ai-0yxd.onrender.com](https://arth-ai-0yxd.onrender.com)
📁 **GitHub:** [github.com/pulkitj94/arth-ai](https://github.com/pulkitj94/arth-ai)

> ⚠️ First load may take ~30 seconds — the backend spins up from sleep on free tier.

---

## 🧭 What is ARTH AI?

ARTH AI is an AI-powered social media analytics platform that lets marketing managers query performance data in plain English — no dashboards, no manual exports, no SQL.

Instead of spending 6+ hours pulling reports across Instagram, LinkedIn, Facebook, and Twitter, a marketing manager types:

> *"Why did our engagement drop in November 2025?"*

And gets a structured, data-backed answer in seconds:
- 🎯 **Key Insight** — the single most important finding
- 📊 **Data Evidence** — exact metrics from your data
- 💡 **Recommendations** — prioritized next steps
- ✍️ **Content Ideas** — based on what's already working
- 📈 **Benchmark Comparison** — cross-platform context

---

## 🎯 The Problem This Solves

| Pain Point | Before ARTH AI | With ARTH AI |
|---|---|---|
| Weekly reporting | 6+ hours manually | ~2 hours |
| Cross-platform comparison | Export → Excel → Pivot | One natural language query |
| Real-time sentiment monitoring | Manual comment review | Automated health scores |
| Data access for non-technical teams | Needs analyst help | Self-serve |
| Campaign optimization speed | Next week's meeting | During the meeting |

---

## 🖥️ Five Core Modules

### 1. 📊 Dashboard
Real-time overview of performance across all platforms — reach, engagement, impressions, sentiment health — with granular daily/weekly/monthly charts and platform distribution.

### 2. 💬 Command Center
The AI query interface. Ask anything in plain English. The system classifies your intent, retrieves relevant data, and returns a structured 5-section response.

**Sample queries that work:**
```
"Most liked post on Instagram in November 2025?"
"Compare Instagram vs LinkedIn performance in Q4 2025"
"Why did our engagement drop in November 2025?"
"Draft 5 post ideas for our product launch"
"Generate a weekly performance summary for CMO"
"Which platform has the worst engagement rate?"
"What content themes work best on Instagram?"
```

### 3. 🧠 Sentiment Health
Real-time sentiment monitoring across all platforms with AI-powered health scores (0-100), trend tracking, negative alert detection, and automated reply generation.

**Simulation scenarios for stress testing:**
- 📈 Normal Growth
- 🚀 Viral Growth
- 🔴 Crisis Mode

### 4. 🎯 Attribution
Multi-touch attribution analysis showing true campaign value across customer journeys — attributed ROAS, hidden revenue detection, and budget optimization recommendations.

### 5. ⭐ Post Predictor
Pre-publish AI scoring tool. Input your caption, platform, media type, and scheduled time — get a predicted engagement score, reach estimate, viral potential rating, and improvement suggestions before you post.

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ARTH AI FRONTEND                             │
│         React 18 + Vite + Tailwind CSS → Vercel                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NODE.JS + EXPRESS → Render                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  QUERY PROCESSING PIPELINE                       │
│                                                                  │
│  Query → Intent Classification → Filter Generation (LLM)        │
│       → Data Retrieval → Response Framing (LLM) → Validation    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RAG VECTOR STORE                              │
│                                                                  │
│  6-Level Hierarchical Chunking:                                  │
│  L1: Individual Posts  L2: Daily  L3: Monthly                   │
│  L4: Platform Overview  L5: Cross-Platform  L6: Strategic        │
│                                                                  │
│  8-Tier Metadata per post (40+ fields):                         │
│  Basic → Temporal → Performance → Content →                     │
│  Contextual → Trends → Cross-Platform → Recommendation Flags    │
│                                                                  │
│  OpenAI text-embedding-3-small (1536 dimensions)                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
│  200 social media records across 7 data files:                  │
│  Organic posts: Instagram (48), Facebook (27),                  │
│  LinkedIn (36), Twitter (39)                                     │
│  Ad campaigns: Instagram (15), Facebook (22), Google (13)       │
│  + 624 sentiment & comment records                              │
│  = 824 total records loaded at runtime                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 AI Design Decisions

These are deliberate engineering choices made to improve response quality:

### Dynamic Temperature Switching
Instead of a fixed temperature, the system detects query type and adjusts creativity accordingly:

| Query Type | Temperature | Example |
|---|---|---|
| Factual | 0.1 | "Most liked post in November 2025?" |
| Comparative | 0.2 | "Instagram vs LinkedIn performance" |
| Temporal | 0.2 | "Engagement trends last quarter" |
| Strategic | 0.4 | "How should we improve our reach?" |
| Creative | 0.9 | "Draft 5 post ideas for product launch" |

### Hallucination Prevention
- Removed fake example numbers from LLM prompts → confidence improved from **48% → 97%**
- Response validator cross-checks every number in the narrative against actual data
- Strict prompt rules: "never write a number not present in the data"

### Date Awareness
The system knows today is April 2026 but data only covers up to December 2025:
- `"last month"` → instantly flags no March 2026 data, suggests December 2025
- `"November"` without a year → asks for clarification before proceeding
- Never silently falls back to the wrong time period

### Query Guardrails
- Ambiguous queries trigger clarification before processing
- Relative time references intercepted before hitting the LLM filter generator
- 1-hour query result cache — repeated queries return in under 1 second

### Structured Response Format
Analytical queries automatically trigger the full 5-section format:
🎯 Key Insight → 📊 Data Evidence → 💡 Recommendation → ✍️ Content Ideas → 📈 Benchmark Comparison

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| AI Orchestration | LangChain |
| LLM | OpenAI GPT-4o-mini |
| Embeddings | OpenAI text-embedding-3-small |
| Vector Store | HNSWLib (in-memory) |
| Sentiment Analysis | Python, Transformers (twitter-xlm-roberta) |
| Frontend Hosting | Vercel (free tier) |
| Backend Hosting | Render (free tier) |
| Version Control | GitHub (main + dev branches) |

---

## 🚀 Run Locally

### Prerequisites
- Node.js 18+
- OpenAI API Key ([get one here](https://platform.openai.com/api-keys))

### Setup

```bash
# Clone the repo
git clone https://github.com/pulkitj94/arth-ai.git
cd arth-ai

# Backend setup
cd server
npm install
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Frontend setup
cd ../client
npm install
```

### Run

**Terminal 1 — Backend:**
```bash
cd server
npm start
# Wait for: ✅ SERVER READY on http://localhost:3001
# First startup takes ~30s to build vector store
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# Open: http://localhost:5173
```

### Environment Variables

```bash
# server/.env
OPENAI_API_KEY=sk-your-key-here
PORT=3001
NODE_ENV=development
```

---

## 📁 Project Structure

```
arth-ai/
├── client/                          # React Frontend → Vercel
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # Analytics overview
│   │   │   ├── CommandCenter.jsx    # AI query interface
│   │   │   ├── SentimentHealth.jsx  # Sentiment monitoring
│   │   │   ├── Attribution.jsx      # Multi-touch attribution
│   │   │   └── PostPredictor.jsx    # Pre-publish AI scoring
│   │   ├── components/              # Reusable UI components
│   │   ├── api/client.js            # API communication
│   │   └── config.js                # ✏️ App configuration
│   ├── tailwind.config.js           # Brand color tokens
│   └── vite.config.js
│
├── server/                          # Node.js Backend → Render
│   ├── langchain/
│   │   ├── config.js                # ✏️ AI behavior & RAG settings
│   │   ├── chains.js                # ✏️ LangChain orchestration
│   │   ├── vectorStore.js           # RAG + HNSWLib
│   │   ├── chunking.js              # 6-level hierarchical chunking
│   │   └── metadata.js              # 8-tier metadata system
│   ├── llm/
│   │   ├── queryProcessor.js        # Main pipeline orchestrator
│   │   ├── filterGenerator.js       # LLM → structured filters
│   │   ├── responseFramer.js        # LLM response generation
│   │   ├── responseValidator.js     # Hallucination detection
│   │   └── clarificationEngine.js   # Ambiguity handling
│   ├── utils/
│   │   ├── dataProcessor.js         # CSV loading + caching
│   │   └── filterCache.js           # Query result cache
│   ├── data/                        # 10 CSV + JSON data files
│   ├── routes/chat.js               # POST /api/chat
│   └── index.js                     # Express server entry point
│
├── scripts/
│   ├── sentiment_engine.py          # Sentiment analysis pipeline
│   └── mock_streamer.py             # Simulation scenarios
│
├── tools/                           # Dev utilities
├── docs/                            # Guides and documentation
└── .gitignore
```

**✏️ = Key customization points**

---

## 🔧 Customization

### Change AI Personality
Edit `server/langchain/config.js` → `systemPrompt`

### Change Temperature Profiles
Edit `server/langchain/config.js` → `llm.temperatureProfiles`

### Change Sample Queries in UI
Edit `client/src/config.js` → `sampleQueries`

### Adjust RAG Retrieval
Edit `server/langchain/config.js` → `retrieval`
```javascript
retrieval: {
  topK: 15,                  // chunks retrieved per query
  similarityThreshold: 0.5,  // minimum relevance score (0-1)
}
```

### Change Brand Colors
Edit `client/tailwind.config.js`
```javascript
colors: {
  brand:  '#028196',  // Teal — primary actions
  accent: '#FB6793',  // Pink — highlights
  navy:   '#012639',  // Dark — headings & sidebar
}
```

---

## 🔧 Troubleshooting

**Server won't start**
```bash
# Missing API key
echo "OPENAI_API_KEY=sk-your-key" >> server/.env

# Port already in use
lsof -ti:3001 | xargs kill -9
npm start
```

**Frontend can't reach backend**
- Check `VITE_API_URL` in Vercel environment variables
- Should be: `https://arth-ai-0yxd.onrender.com`
- Test backend: `curl https://arth-ai-0yxd.onrender.com/health`

**Slow first query on live demo**
- Expected — Render free tier sleeps after 15 minutes of inactivity
- First request wakes the server (~30s), subsequent queries are normal speed

**Empty or incorrect responses**
- Check OpenAI API quota at [platform.openai.com](https://platform.openai.com)
- Verify CSV files exist in `server/data/`
- Check server logs for filter generation errors

**Ambiguous time period queries**
- Always specify the year: `"November 2025"` not just `"November"`
- Dataset covers up to December 2025
- Queries for 2026 dates will be flagged with suggestions

---

## 🗺️ Roadmap

- [ ] **Live API Integration** — Instagram Graph API, LinkedIn API, Twitter/X API, Facebook Graph API
- [ ] **Streaming responses** — Real-time token streaming for faster perceived performance
- [ ] **Export functionality** — Download responses as PDF/CSV reports
- [ ] **Multi-brand support** — Manage multiple brand accounts from one dashboard
- [ ] **Scheduled reports** — Automated weekly summaries delivered via email
- [ ] **Custom data connectors** — Bring your own CSV, Google Sheets, or database

---

## 📝 License

MIT License — free to use, modify, and distribute.