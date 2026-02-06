
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeVectorStore } from './langchain/vectorStore.js';
import { predictPostPerformance } from './llm/postPredictor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function runVerification() {
    console.log("🚀 Starting Decision Logic Verification...");
    await initializeVectorStore();

    // 1. Experimental Content (Low Sim)
    console.log(`\n🧪 TEST 1: Experimental Content (Risk: High)`);
    const experimental = await predictPostPerformance({
        platform: 'Instagram',
        mediaType: 'post',
        caption: 'Quantum physics in daily life #science #quantum',
        hashtags: '#science'
    });
    console.log(`   Type: ${getLogValue(experimental.analysisLogic, 'Type')}`);
    console.log(`   Risk/Reward: ${getLogValue(experimental.analysisLogic, 'Risk')}`);
    console.log(`   Recommendation: ${experimental.suggestions[0]}`);

    // 2. Core Content (High Sim - using known topic)
    console.log(`\n🧪 TEST 2: Core Content (Risk: Low)`);
    const core = await predictPostPerformance({
        platform: 'Twitter',
        mediaType: 'post',
        caption: 'Sustainable fashion collection launch',
        hashtags: '#sustainable #fashion'
    });
    console.log(`   Type: ${getLogValue(core.analysisLogic, 'Type')}`);
    console.log(`   Recommendation: ${core.suggestions[0]}`);
    console.log(`   Confidence: ${getLogValue(core.analysisLogic, 'Confidence')}`);

}

function getLogValue(text, key) {
    const lines = text.split('\n');
    const line = lines.find(l => l.includes(key));
    return line ? line.trim() : "Not Found";
}

runVerification().catch(console.error);
