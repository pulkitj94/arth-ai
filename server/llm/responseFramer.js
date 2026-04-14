import { ChatOpenAI } from '@langchain/openai';
import { LANGCHAIN_CONFIG } from '../langchain/config.js';

/**
 * LLM-based response framer
 * Converts processed data into natural language insights
 */
class ResponseFramer {
  constructor() {
    this.llm = null; // Lazy initialization
  }

  getTemperatureForQuery(query) {
    const profiles = LANGCHAIN_CONFIG.llm.temperatureProfiles;
    const lowerQuery = query.toLowerCase();

    if (/draft|write|create|post\s+idea|content\s+idea|what\s+should\s+i\s+post/i.test(lowerQuery)) {
      console.log(`🎨 Creative query detected → temperature: ${profiles.contentCreation}`);
      return profiles.contentCreation;
    }
    if (/strategy|recommend|suggest|how\s+to\s+improve|optimize|should\s+i|should\s+we/i.test(lowerQuery)) {
      console.log(`🧠 Strategic query detected → temperature: ${profiles.strategic}`);
      return profiles.strategic;
    }
    if (/compare|vs\.?|versus|better|worse|which\s+platform/i.test(lowerQuery)) {
      console.log(`⚖️  Comparative query detected → temperature: ${profiles.comparative}`);
      return profiles.comparative;
    }
    if (/trend|over\s+time|last\s+(week|month)|this\s+(week|month)|january|february|march|april|may|june|july|august|september|october|november|december/i.test(lowerQuery)) {
      console.log(`📅 Temporal query detected → temperature: ${profiles.temporal}`);
      return profiles.temporal;
    }
    if (/most|highest|top|best|find|which\s+post/i.test(lowerQuery)) {
      console.log(`🔍 Factual query detected → temperature: ${profiles.factual}`);
      return profiles.factual;
    }
    if (/worst|lowest|poorest|underperform|avoid|decline/i.test(lowerQuery)) {
      console.log(`📉 Negative query detected → temperature: ${profiles.negative}`);
      return profiles.negative;
    }

    console.log(`❓ Unclassified query → temperature: ${profiles.default}`);
    return profiles.default;
  }

  getLLM(query = '') {
    const temp = this.getTemperatureForQuery(query);
    if (!this.llm || this.llm.temperature !== temp) {
      this.llm = new ChatOpenAI({
        modelName: LANGCHAIN_CONFIG.llm.modelName,
        temperature: temp,
        maxTokens: 2000,
      });
    }
    return this.llm;
  }

  /**
   * Frame response using LLM based on processed data
   * @param {string} userQuery - Original user query
   * @param {Object} processedData - Data from DataProcessor
   * @param {Object} filterSpec - Filter specification used
   * @returns {string} Natural language response
   */
  async frameResponse(userQuery, processedData, filterSpec) {
    const prompt = this.buildPrompt(userQuery, processedData, filterSpec);

    try {
      const llm = this.getLLM(userQuery);
      const response = await llm.invoke(prompt);
      return response.content.trim();
    } catch (error) {
      console.error('Error framing response:', error);
      throw new Error(`Failed to frame response: ${error.message}`);
    }
  }

  /**
   * Build comprehensive prompt for response framing
   */
  buildPrompt(userQuery, processedData, filterSpec) {
    return `You are a social media analytics expert for ARTH AI. Today's date is April 14, 2026.
Your task is to present data insights in a clear, actionable, and professional manner.

CRITICAL INSTRUCTIONS:
- You MUST use the EXACT numbers provided in the DATA ANALYSIS RESULTS below
- DO NOT make up, estimate, or hallucinate any numbers
- If you mention a metric, it MUST come directly from the data provided
- Copy numbers exactly as they appear (e.g., if data shows "7161", write "7,161" not a different number)
- If a field is missing or unclear, acknowledge it rather than inventing data
- IMPORTANT: Dates in the data are in DD-MM-YYYY format (e.g., "07-11-2025" means November 7th 2025, NOT July 11th)
- NEVER mention a year, date, or time period unless it appears explicitly in the DATA ANALYSIS RESULTS
- NEVER reference numbers from any examples or prior knowledge — only use what is in the data below

DATE AWARENESS — VERY IMPORTANT:
- Today is April 14, 2026
- The dataset contains data from 2025 (October, November, December 2025)
- "Last month" means March 2026 — if no March 2026 data exists, clearly state this
- "This month" means April 2026 — if no April 2026 data exists, clearly state this
- "November" without a year is ambiguous — if data exists for November 2025, use it and state the year
- If the user asks about a time period not covered by the data, clearly say:
  "The dataset covers [earliest date] to [latest date in data]. No data is available for [requested period]."
- NEVER assume "last month" means a month that exists in the data — always check

ORIGINAL USER QUERY:
"${userQuery}"

FILTERS APPLIED:
${this.formatFiltersForPrompt(filterSpec.filters)}

DATA ANALYSIS RESULTS:
${this.formatDataForPrompt(processedData)}

QUERY INTERPRETATION:
${filterSpec.interpretation || 'Not provided'}

YOUR TASK:
Present these insights in a clear, professional format that:
1. Directly answers the user's question using only data values above
2. Highlights key findings with specific numbers from the data
3. Provides comparisons only where both values exist in the data
4. Includes actionable recommendations when appropriate
5. Uses proper formatting (bold for emphasis, lists for clarity)
6. Acknowledges limitations if data is insufficient or time period is not covered

FORMATTING GUIDELINES:
- Use **bold** for important metrics and platform names
- Use bullet points or numbered lists for multiple items
- Include specific numbers to support claims
- Use percentage comparisons only when both values are in the data
- Keep language professional but conversational
- Avoid overly technical jargon

STRICT DATA RULES:
- ONLY use numbers that appear explicitly in the DATA ANALYSIS RESULTS above
- NEVER use numbers from examples or prior knowledge
- NEVER infer, estimate or calculate numbers not present in the data
- NEVER mention years, dates or time periods unless they appear in the data
- If asked about a metric not in the data, say "this data is not available"
- Treat every number you write as a commitment — if it is not in the data, do not write it
- When you see a date like "07-11-2025" it means November 7th 2025 NOT July 11th

RESPONSE STRUCTURE (adapt based on query type):

For FACTUAL queries (e.g. "most liked post", "top post in November"):
- 1-2 sentences with the direct answer and exact numbers only. No extra sections needed.

For COMPARATIVE queries (e.g. "Instagram vs LinkedIn", "which platform is better"):
🎯 **Key Insight**: One sentence winner/summary
📊 **Data Evidence**: Side-by-side numbers from the data only
💡 **Recommendation**: One actionable next step

For ANALYTICAL or STRATEGIC queries (e.g. "why did engagement drop", "how to improve", "weekly summary", "performance overview"):
Use ALL 5 sections below — do not skip any:
🎯 **Key Insight**: The single most important finding in 1-2 sentences
📊 **Data Evidence**: Specific metrics and numbers directly from the data
💡 **Recommendation**: 2-3 prioritized actionable next steps
✍️ **Content Ideas**: 2-3 specific post concepts based on what is working in the data
📈 **Benchmark Comparison**: Compare metrics across platforms or time periods using only data provided

For CONTENT CREATION queries (e.g. "draft post ideas", "write captions"):
Provide 3-5 specific post ideas with hooks, formats, and suggested hashtags based on top performing content in the data.

For TIME PERIOD NOT IN DATA:
If the requested time period has no data, respond with:
"⚠️ No data available for [requested period]. The dataset covers data up to [latest date found in data].
Here is the most recent data available: [show most recent records]"

Now generate a professional response for the user's query based only on the data provided above.
Be specific, use exact numbers from the data, and make it actionable.`;
  }

  /**
   * Format filters for prompt
   */
  formatFiltersForPrompt(filters) {
    if (!filters || filters.length === 0) {
      return 'No filters applied (analyzing all data)';
    }

    return filters.map((filter, index) => {
      if (filter.type === 'and' || filter.type === 'or') {
        const conditions = filter.conditions.map(c =>
          `${c.column} ${c.operator} ${JSON.stringify(c.value)}`
        ).join(` ${filter.type.toUpperCase()} `);
        return `${index + 1}. Complex Filter: ${conditions}`;
      }
      return `${index + 1}. ${filter.column} ${filter.operator} ${JSON.stringify(filter.value)}${filter.reason ? ` (${filter.reason})` : ''}`;
    }).join('\n');
  }

  /**
   * Format processed data for prompt
   */
  formatDataForPrompt(processedData) {
    const { data, summary } = processedData;

    let formatted = `Summary:\n`;
    formatted += `- Total records in dataset: ${summary.originalRecords.toLocaleString()}\n`;
    formatted += `- Records after filtering: ${summary.filteredRecords.toLocaleString()}\n`;
    formatted += `- Results returned: ${summary.resultCount}\n`;
    formatted += `- Filters applied: ${summary.filtersApplied}\n\n`;

    if (data.length === 0) {
      formatted += 'No data matches the specified filters.\n';
      return formatted;
    }

    formatted += `Results Data:\n`;

    if (data.length <= 20) {
      formatted += JSON.stringify(data, null, 2);
    } else {
      formatted += `Showing top 20 of ${data.length} results:\n`;
      formatted += JSON.stringify(data.slice(0, 20), null, 2);
      formatted += `\n... and ${data.length - 20} more results`;
    }

    return formatted;
  }

  /**
   * Generate a fallback response when LLM fails
   */
  generateFallbackResponse(processedData) {
    const { data, summary } = processedData;

    if (data.length === 0) {
      return 'No data found matching your query. Please try adjusting your search criteria.';
    }

    let response = `Found ${summary.filteredRecords.toLocaleString()} records matching your criteria.\n\n`;

    if (data.length <= 5) {
      response += 'Results:\n';
      data.forEach((item, index) => {
        response += `\n${index + 1}. `;
        response += Object.entries(item)
          .filter(([key]) => !key.startsWith('_'))
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      });
    } else {
      response += `Showing top 5 of ${data.length} results:\n`;
      data.slice(0, 5).forEach((item, index) => {
        response += `\n${index + 1}. `;
        response += Object.entries(item)
          .filter(([key]) => !key.startsWith('_'))
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      });
    }

    return response;
  }
}

export default ResponseFramer;