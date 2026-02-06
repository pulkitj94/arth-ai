
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeVectorStore } from './langchain/vectorStore.js';
import { predictPostPerformance } from './llm/postPredictor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

async function runDebug() {
    console.log("🚀 Starting Debug Script...");

    // 1. Initialize Vector Store (needed for search)
    await initializeVectorStore();

    // 2. Mock Data (similar to user's screenshot)
    const mockData = {
        caption: "Footware",
        platform: "Instagram",
        scheduledTime: "2026-02-04T03:52:00",
        image: null
    };

    console.log("\n🧪 Running Prediction with:", mockData);
    const result = await predictPostPerformance(mockData);

    console.log("\n📊 Result History Details:", result.historyDetails);
    console.log("📊 Predicted Reach:", result.predictedReach);
}

runDebug().catch(console.error);
