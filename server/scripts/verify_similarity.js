
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeVectorStore } from '../langchain/vectorStore.js';
import { predictPostPerformance } from '../llm/postPredictor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runVerification() {
    console.log("🚀 Starting Similarity Logic Verification...");

    // Initialize Vector Store
    await initializeVectorStore();

    // TEST CASE: "Footware" typo should match "Footwear" in history
    const testCase = {
        platform: 'Twitter', // Using Twitter as it had organic footwear posts
        mediaType: 'post',
        caption: 'Sustainable footware for summer',
        hashtags: '#eco #footware'
    };

    console.log(`\n🧪 Testing Similarity for Typo: "footware" vs History`);

    // We expect this to find matches because of the normalization map
    const result = await predictPostPerformance({
        ...testCase,
        scheduledTime: new Date().toISOString()
    });

    console.log(`   📊 Score: ${result.score}`);
    console.log(`   ℹ️  Logic: ${result.analysisLogic}`);
    console.log(`   Found Matches: ${result.similarPosts.length}`);

    if (result.similarPosts.length > 0) {
        console.log("   ✅ SUCCESS: Found matches despite typo!");
        result.similarPosts.forEach(p => console.log(`      - Match: ${p.content} (${p.metrics})`));
    } else {
        console.log("   ❌ FAILURE: No matches found.");
    }
}

runVerification().catch(console.error);
