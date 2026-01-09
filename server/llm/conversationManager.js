import { ChatOpenAI } from '@langchain/openai';
import { LANGCHAIN_CONFIG } from '../langchain/config.js';

/**
 * Conversation Manager (Simplified - No Conversation Chaining)
 * Each query is processed independently without context or history
 */
class ConversationManager {
  constructor() {
    this.llm = null; // Lazy initialization
  }

  getLLM() {
    if (!this.llm) {
      this.llm = new ChatOpenAI({
        modelName: LANGCHAIN_CONFIG.llm.modelName,
        temperature: 0.1,
        maxTokens: 2000,
      });
    }
    return this.llm;
  }

  /**
   * Analyze if query requires multi-step processing
   * Note: Context-dependent features removed - each query is independent
   * @param {string} userQuery - The user's query
   * @returns {Object} Analysis result
   */
  async analyzeQuery(userQuery) {
    const prompt = this.buildAnalysisPrompt(userQuery);

    try {
      const llm = this.getLLM();
      const response = await llm.invoke(prompt);
      const content = response.content;

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM did not return valid JSON');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      console.log('📊 Query Analysis:', {
        isMultiStep: analysis.isMultiStep,
        steps: analysis.steps?.length || 0,
      });

      return analysis;
    } catch (error) {
      console.error('Error analyzing query:', error);
      // Fallback: treat as single-step
      return {
        isMultiStep: false,
        steps: [{ query: userQuery, description: userQuery }],
        reasoning: 'Fallback to single-step processing',
      };
    }
  }

  /**
   * Build analysis prompt for LLM (without conversation context)
   */
  buildAnalysisPrompt(userQuery) {
    return `You are a query analyzer for a social media analytics system. Analyze if the user's query requires multi-step processing.

USER QUERY:
"${userQuery}"

YOUR TASK:
Determine if this query should be:
1. **Multi-step**: Needs to be broken down into sequential sub-queries
2. **Single-step**: Can be processed directly

Return JSON with this structure:
{
  "isMultiStep": true/false,
  "steps": [
    {
      "stepNumber": 1,
      "query": "Query text for step 1",
      "description": "What this step does",
      "dependsOn": null  // or stepNumber if depends on previous step
    }
  ],
  "reasoning": "Why you classified it this way"
}

MULTI-STEP INDICATORS:
- "then", "after that", "next", "followed by"
- "compare those results", "use that data"
- "first X, then Y"
- Sequential instructions that require intermediate results

EXAMPLES:

Example 1 (Multi-step):
User: "Show me top Instagram posts, then compare their engagement rates"
Response:
{
  "isMultiStep": true,
  "steps": [
    {
      "stepNumber": 1,
      "query": "Show me top Instagram posts sorted by engagement",
      "description": "Get top Instagram posts",
      "dependsOn": null
    },
    {
      "stepNumber": 2,
      "query": "Compare engagement rates of the top Instagram posts from previous step",
      "description": "Compare engagement rates from step 1 results",
      "dependsOn": 1
    }
  ],
  "reasoning": "Query has 'then' indicating sequential steps"
}

Example 2 (Single-step):
User: "Which platform had highest engagement in November?"
Response:
{
  "isMultiStep": false,
  "steps": [
    {
      "stepNumber": 1,
      "query": "Which platform had highest engagement in November?",
      "description": "Direct comparison query",
      "dependsOn": null
    }
  ],
  "reasoning": "Self-contained query with no sequential steps"
}

Example 3 (Single-step with multiple outputs):
User: "Which is the worst performing post type and on which platform?"
Response:
{
  "isMultiStep": false,
  "steps": [
    {
      "stepNumber": 1,
      "query": "Which is the worst performing post type and on which platform?",
      "description": "Find worst performing content type and platform combination",
      "dependsOn": null
    }
  ],
  "reasoning": "Single aggregation query asking for two related attributes (post type AND platform). Can be answered with one grouped query, no sequential steps needed."
}

IMPORTANT RULES:
- "Which X and Y?" queries are usually SINGLE-STEP (not multi-step) - they ask for multiple attributes in one query
- "First X, then Y" or "X, and then use that to find Y" are MULTI-STEP
- Multi-step should ONLY be used when later steps truly depend on earlier results
- Prefer single-step queries when possible - they're faster and more accurate
- Each step should be a complete, self-contained query
- Return ONLY valid JSON, no explanations outside the JSON

Now analyze the user's query above.`;
  }

  /**
   * No-op methods for backward compatibility
   */
  clearSession() {
    console.log(`⚠️  clearSession() called but conversation chaining is disabled`);
  }

  getStats() {
    return {
      activeSessions: 0,
      totalMessages: 0,
      note: 'Conversation chaining disabled - queries are independent'
    };
  }
}

// Singleton instance
let conversationManagerInstance = null;

export function getConversationManager() {
  if (!conversationManagerInstance) {
    conversationManagerInstance = new ConversationManager();
  }
  return conversationManagerInstance;
}

export default ConversationManager;
