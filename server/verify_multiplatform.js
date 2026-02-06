
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeVectorStore } from './langchain/vectorStore.js';
import { predictPostPerformance } from './llm/postPredictor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

async function runVerification() {
    console.log("🚀 Starting Multi-Platform Verification...");

    // 1. Initialize Vector Store
    await initializeVectorStore();

    const testCases = [
        { platform: 'Instagram', mediaType: 'carousel', caption: 'New summer collection drops soon! #fashion #summer', hashtags: '#fashion #summer' },
        { platform: 'Twitter', mediaType: 'post', caption: 'New summer collection drops soon! #fashion #summer', hashtags: '#fashion #summer' },
        { platform: 'LinkedIn', mediaType: 'post', caption: 'Excited to announce our Q3 growth metrics. #business #growth', hashtags: '#business #growth' }
    ];

    for (const test of testCases) {
        console.log(`\n🧪 Testing: ${test.platform} - ${test.mediaType}`);
        const result = await predictPostPerformance({
            ...test,
            scheduledTime: new Date().toISOString()
        });

        console.log(`   📊 Score: ${result.score}`);
        console.log(`   📊 Reach: ${result.predictedReach}`);
        console.log(`   📊 Best Time: ${result.bestTimeRecommendation}`);
        console.log(`   📊 Baseline: ${result.historyScore}`);
        console.log(`   ℹ️  Logic: ${result.analysisLogic}`);
    }
}

runVerification().catch(console.error);
