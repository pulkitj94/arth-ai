# Potential Issues Analysis - Social Media Analytics Platform
**Date**: January 6, 2026
**Purpose**: Comprehensive stress test analysis of query processing logic

---

## Data Structure

### Available CSV Files:
1. **Organic Posts** (4 files):
   - facebook_organic_posts.csv
   - instagram_organic_posts.csv
   - linkedin_organic_posts.csv
   - twitter_organic_posts.csv

2. **Ad Campaigns** (3 files):
   - facebook_ads_ad_campaigns.csv
   - google_ads_ad_campaigns.csv
   - instagram_ads_ad_campaigns.csv

3. **Sentiment/Comments** (3 files):
   - enriched_comments_sentiment.csv
   - sentiment_history.csv
   - synthetic_comments_data.csv

### Key Metric Differences:
- **Organic**: engagement_rate, likes, comments, shares, saves, posted_time
- **Ads**: CTR, CPC, ROAS, conversion_rate, clicks, conversions, cost_per_conversion
- **Comments**: comment_text, sentiment, sentiment_score, language

---

## CRITICAL ISSUES IDENTIFIED

### 🔴 ISSUE 1: Language/Hinglish Clarification Loop
**Status**: CONFIRMED BUG (User Experienced)
**Severity**: HIGH
**File**: `server/llm/filterGenerator.js` (lines 800-850, need to verify)

**Problem**:
1. User asks: "Give me summary of Hindi/Hinglish comments"
2. System triggers clarification about Hindi availability
3. User clicks option: "Show me comments in: en, hinglish"
4. System reprocesses as new query "Show me comments in Hindi and Hinglish"
5. **Triggers SAME validation again** → Infinite loop

**Root Cause**:
- Clarification option text doesn't bypass validation on second pass
- No flag to indicate "user already selected from clarification"
- Validation pattern too aggressive on language detection

**Potential Similar Loops**:
- Any clarification where the option text re-triggers the same validation
- Examples: weekday queries, time-of-day queries, hashtag queries

**Impact**:
- User stuck in "Processing..." state
- Query never completes
- Poor user experience

---

### 🟡 ISSUE 2: Sentiment Query Language Validation
**Status**: NEEDS INVESTIGATION
**Severity**: MEDIUM
**File**: `server/llm/filterGenerator.js` (language validation section)

**Problem Scenarios**:

**Scenario A**: User wants to see ALL comments regardless of language
```
Query: "Show me all sentiment data for Instagram"
Expected: Return all comments
Potential Issue: May trigger language clarification unnecessarily
```

**Scenario B**: Language column structure
```
Question: Is language stored as:
- Separate column: language (e.g., "en", "hi", "hinglish")
- Part of comment data
- Multiple languages per comment?

If Set-based: Same bug as metadata.columns (Object.keys vs Array.from)
```

**Scenario C**: Language detection patterns
```javascript
// Current pattern might be:
if (query.includes('hindi') || query.includes('hinglish')) {
  // Trigger clarification
}

// But this blocks valid queries like:
"Show me hinglish comments with positive sentiment"  // Valid!
"Show me english and hinglish comments"              // Valid!
```

---

### 🟡 ISSUE 3: Ads vs Organic Metric Confusion
**Status**: PARTIALLY HANDLED
**Severity**: MEDIUM
**File**: `server/llm/filterGenerator.js` (lines 376-496)

**Current Validation**:
- ✅ Blocks "engagement_rate on ad campaigns"
- ✅ Blocks "CTR on organic posts"
- ⚠️ But doesn't handle all edge cases

**Potential Problems**:

**Problem A**: Ambiguous queries
```
Query: "Show me engagement for Facebook campaigns"
Issue: "engagement" is vague - could mean:
  - engagement_rate (organic only)
  - engagement metrics (likes, comments - organic only)
  - "engagement" as general performance (could mean CTR for ads)

Current: Might block or might allow - unclear
Should: Ask clarification
```

**Problem B**: Mixed data requests
```
Query: "Compare engagement across all Facebook data"
Issue: Facebook has BOTH organic posts AND ads
  - Organic has engagement_rate
  - Ads have CTR
  - Cannot directly compare

Current: Unknown if validated
Should: Return clarification explaining the difference
```

**Problem C**: Platform-specific availability
```
Query: "Show me Google organic posts"
Issue: Google has ads but NO organic posts in dataset

Current: May pass validation but return empty results
Should: Return clarification "Google only has ad campaigns, no organic posts"
```

---

### 🟡 ISSUE 4: Sentiment Data Access Patterns
**Status**: NEEDS INVESTIGATION
**Severity**: MEDIUM
**File**: Multiple files

**Potential Problems**:

**Problem A**: Comment text visibility
```
Query: "Show me negative comments about product X"
Issue: System can't extract topics from text
  - Has comment_text column
  - Can filter by negative sentiment
  - But can't search within text for "product X"

Current: Unknown if clarification is triggered
Should: Return clarification explaining text search limitations
```

**Problem B**: Sentiment aggregation
```
Query: "What's the overall sentiment for Instagram?"
Expected: Average sentiment score or distribution
Potential Issue:
  - Which sentiment file to use?
  - enriched_comments_sentiment vs sentiment_history
  - Are they duplicates or different data?

Current: Unknown which file is queried
Should: Document which file is primary
```

**Problem C**: Platform-comment mapping
```
Query: "Show me sentiment for LinkedIn ads"
Issue:
  - LinkedIn has organic_posts.csv
  - Do LinkedIn posts have comments?
  - Are ad campaigns linked to comments?

Current: Unknown if validated
Should: Clarify which platforms have comment data
```

---

### 🟡 ISSUE 5: Time-Based Query Edge Cases
**Status**: PARTIALLY FIXED (Our recent fix)
**Severity**: MEDIUM
**File**: `server/llm/filterGenerator.js` (lines 566-610)

**Recently Fixed**:
- ✅ "Best time to post on Facebook" now triggers clarification
- ✅ Time queries no longer misclassified as comparison queries
- ✅ metadata.columns Set conversion fixed

**Remaining Edge Cases**:

**Problem A**: Hour-based grouping
```
Query: "Show me posts grouped by hour"
Current: Offers "Group posts by hour (if supported)" in alternatives
Issue: Is hour-based grouping actually supported?
  - posted_time is HH:MM:SS
  - Can SQL extract hour?
  - Or will this fail?

Should: Either support it or remove from alternatives
```

**Problem B**: Time range queries
```
Query: "Show me posts from 9 AM to 5 PM"
Issue: Requires:
  - Extracting hour from posted_time (HH:MM:SS)
  - Filtering by hour range
  - Is this supported?

Current: Unknown if validated
Should: Either support or clarify
```

**Problem C**: Timezone confusion
```
Query: "What's the best time to post in PST?"
Issue:
  - posted_time is likely server time
  - No timezone column
  - Cannot convert to PST

Current: Unknown if validated
Should: Clarify timezone limitations
```

---

### 🟡 ISSUE 6: Weekday/Weekend Query Edge Cases
**Status**: VALIDATED (lines 524-564)
**Severity**: MEDIUM

**Current Validation**: Returns clarification if no day_of_week column

**Remaining Problems**:

**Problem A**: Specific day queries
```
Query: "Show me Monday performance vs Friday performance"
Pattern: /(monday|tuesday|...|sunday)/i is detected (line 528)
Issue: What happens after detection?
  - Is clarification triggered?
  - Or does it try to extract day from posted_date?

Current: Unknown
Should: Verify specific day handling
```

**Problem B**: Date-based inference
```
Query: "Show me posts from November 1 vs November 8"
(Nov 1 = Friday, Nov 8 = Friday)

User might think: "Compare two Fridays"
System processes: "Compare two specific dates"

Issue: System doesn't know user intent is Friday vs Friday
Should: Work fine (compares dates), but may not meet user expectation
```

---

### 🟡 ISSUE 7: Platform Availability Validation
**Status**: PARTIALLY HANDLED (lines 348-373)
**Severity**: LOW-MEDIUM

**Current Validation**:
- ✅ Blocks TikTok, YouTube, Snapchat, Pinterest, Reddit, WhatsApp

**Missing Validations**:

**Problem A**: Organic vs Ads platform mismatch
```
Organic Posts Available: Facebook, Instagram, LinkedIn, Twitter
Ads Available: Facebook, Instagram, Google

Query: "Show me Twitter ads"
Issue: Twitter has organic but NO ads
Current: Unknown if validated
Should: Clarify "Twitter only has organic posts, no ad campaigns"

Query: "Show me Google organic posts"
Issue: Google has ads but NO organic
Current: Unknown if validated
Should: Clarify "Google only has ad campaigns, no organic posts"
```

**Problem B**: Cross-platform comparisons with partial data
```
Query: "Compare ad performance across all platforms"
Issue:
  - Google ads: available
  - Facebook ads: available
  - Instagram ads: available
  - Twitter ads: NOT available
  - LinkedIn ads: NOT available

Current: May return only Google/Facebook/Instagram
Should: Clarify which platforms have ad data
```

---

### 🟡 ISSUE 8: Clarification Option Processing
**Status**: CRITICAL DESIGN FLAW
**Severity**: HIGH
**File**: Frontend + Backend interaction

**Problem**: When user clicks clarification option, the option TEXT is sent as a new query

**Current Flow**:
```
1. User query: "What is best time to post?"
2. Clarification offered:
   - Option 1: "Show me posts with their posted_time and engagement rate"
   - Option 2: "Show me top 20 posts sorted by engagement with timestamps"
3. User clicks Option 2
4. Frontend sends: "Show me top 20 posts sorted by engagement with timestamps"
5. Backend processes as NEW query
6. ✅ Works if option text is valid query
7. ❌ Fails if option text triggers SAME validation
```

**Root Cause**:
- Clarification options are treated as new user queries
- No "context" flag indicating "this came from clarification"
- No bypass mechanism for validated alternatives

**Affected Scenarios**:
1. ✅ **Time-of-day**: Options work (don't re-trigger validation)
2. ❌ **Hindi/Hinglish**: Option "Show me comments in: en, hinglish" → Re-triggers language validation
3. ⚠️ **Weekday**: Unknown if options re-trigger validation
4. ⚠️ **Hashtag**: Unknown if options re-trigger validation

**Solutions**:
- **Option A**: Add `fromClarification: true` flag to bypass validation
- **Option B**: Make clarification options execute specific filters, not text queries
- **Option C**: Add validation bypass list for known clarification option patterns

---

### 🟡 ISSUE 9: Comparison Query Classification
**Status**: RECENTLY FIXED (Our work today)
**Severity**: LOW (Mostly resolved)
**File**: `server/llm/filterGenerator.js` (lines 1069-1090)

**Recently Fixed**:
- ✅ Time queries no longer misclassified as comparison
- ✅ Added `isTimeQuery` and `isWeekdayQuery` exclusions

**Remaining Edge Cases**:

**Problem A**: Multi-platform time queries
```
Query: "What's the best time to post on Facebook and Instagram?"
Pattern: Mentions two platforms + time question
Current: Should classify as time query (not comparison)
Risk: Might classify as comparison (Facebook vs Instagram)

Should: Verify this is handled correctly
```

**Problem B**: Comparison with time element
```
Query: "Compare morning vs evening posts on Facebook"
Pattern: Has "compare" + "vs" + time keywords
Current: Which takes precedence?
  - Comparison classification?
  - Or time classification?

Should: This is a valid comparison (morning vs evening)
Should: NOT trigger time-of-day clarification
```

**Problem C**: Platform comparison with metrics
```
Query: "Compare Facebook engagement to Instagram engagement"
Pattern: "compare" + platform names + metric
Current: Should allow (valid comparison)
Risk: Might trigger metric validation if "engagement" is ambiguous

Should: Verify metric validation doesn't interfere
```

---

### 🟡 ISSUE 10: Aggregation and Grouping Edge Cases
**Status**: NEEDS INVESTIGATION
**Severity**: MEDIUM
**File**: LLM filter generation

**Potential Problems**:

**Problem A**: Multiple group-by requests
```
Query: "Show me engagement grouped by platform and content type"
Issue: Requires GROUP BY platform, content_type
Current: Unknown if LLM generates this correctly
Risk: Might only group by one dimension

Should: Test multi-dimensional grouping
```

**Problem B**: Aggregation with filtering
```
Query: "Show me average engagement for posts with >1000 likes"
Issue: Requires:
  1. Filter: likes > 1000
  2. Aggregate: AVG(engagement_rate)
Current: Unknown if both are applied
Risk: Might aggregate first, then filter (wrong order)

Should: Verify SQL generation order
```

**Problem C**: Percentile and ranking queries
```
Query: "Show me top 10% of posts by engagement"
Issue: Requires percentile calculation or LIMIT with percentage
Current: Unknown if supported
Risk: Might interpret as "top 10 posts" instead of "top 10%"

Should: Clarify percentage vs count
```

---

### 🟡 ISSUE 11: Date Range and Temporal Queries
**Status**: NEEDS INVESTIGATION
**Severity**: MEDIUM

**Potential Problems**:

**Problem A**: Relative dates
```
Query: "Show me posts from last 7 days"
Issue: System may not know "today's date"
  - Data is from November 2025
  - "Last 7 days" from when?
  - November 30? December 6, 2026?

Current: Unknown how "last 7 days" is interpreted
Should: Clarify or use latest date in dataset
```

**Problem B**: Date format ambiguity
```
Query: "Show me posts from 11/5"
Issue:
  - November 5 or May 11?
  - US format (MM/DD) or international (DD/MM)?

Current: Unknown
Should: Clarify date format expectations
```

**Problem C**: Future dates
```
Query: "What will be the best time to post next week?"
Issue: System has historical data, not predictive
Current: Unknown if validated
Should: Clarify no predictive capabilities
```

---

### 🟡 ISSUE 12: Null/Missing Data Handling
**Status**: NEEDS INVESTIGATION
**Severity**: MEDIUM

**Potential Problems**:

**Problem A**: Missing metric values
```
Issue: What if a post has:
  - impressions = 1000
  - reach = null (missing)
Query: "Show me posts with reach > 500"
Current: Unknown if null values are handled
Should: Either exclude nulls or clarify
```

**Problem B**: Empty comment text
```
Query: "Show me negative comments"
Issue: What if comment_text is empty/null?
Current: Unknown if filtered out
Should: Exclude empty comments from results
```

**Problem C**: Zero values vs missing values
```
Issue:
  - engagement_rate = 0 (valid - no engagement)
  - engagement_rate = null (missing data)

Query: "Show me posts with low engagement"
Current: Are zeros and nulls treated the same?
Should: Clarify difference
```

---

### 🟢 ISSUE 13: Already Handled Validations
**Status**: CONFIRMED WORKING
**Severity**: N/A

These validations are already in place and working:

1. ✅ **Platform unavailability** (TikTok, YouTube, etc.)
2. ✅ **Ads-only metrics on organic** (CTR, ROAS on posts)
3. ✅ **Organic-only metrics on ads** (engagement_rate on campaigns)
4. ✅ **Time-of-day without categorization**
5. ✅ **Weekday without day_of_week column**
6. ✅ **Off-topic queries** (non-social-media questions)
7. ✅ **Content generation requests** (asking to create posts)
8. ✅ **Hashtag extraction** (no hashtag column)
9. ✅ **Topic extraction from comments** (NLP limitation)

---

## CLARIFICATION LOOP ANALYSIS

### Scenarios That Could Loop:

| Query Pattern | Initial Validation | Clarification Option | Re-validation Risk | Status |
|---------------|-------------------|---------------------|-------------------|--------|
| Hindi/Hinglish comments | Language check | "Show me comments in: en, hinglish" | ❌ HIGH - Re-triggers language | **CONFIRMED BUG** |
| Best time to post | Time-of-day check | "Show me posts with timestamps" | ✅ LOW - Valid query | **WORKING** |
| Weekday vs weekend | Weekday check | "Show me posts by date" | ✅ LOW - Valid query | **LIKELY OK** |
| Hashtag analysis | Hashtag check | "Show me posts with content" | ✅ LOW - Valid query | **LIKELY OK** |
| Topic extraction | Topic check | "Show me negative comments" | ⚠️ MEDIUM - Might re-check | **NEEDS TEST** |
| Ad format comparison | Format check | "Show me ads by format" | ⚠️ MEDIUM - Might re-check | **NEEDS TEST** |

---

## DATA INCONSISTENCY RISKS

### Risk 1: Duplicate Records
```
Files: enriched_comments_sentiment.csv vs sentiment_history.csv

Question: Are these:
  - Same data, different formats?
  - Historical vs current?
  - Overlapping records?

Risk: User queries might return duplicates
Should: Document which file is primary
```

### Risk 2: Cross-File Relationships
```
Question: How are comments linked to posts/ads?
  - By post_id?
  - By date/platform?
  - At all?

Risk: User asks "Show me comments on my top posts"
  - Can we JOIN comments to posts?
  - Or are they separate datasets?

Should: Document relationship structure
```

### Risk 3: Metric Calculation Differences
```
Question: Is engagement_rate calculated consistently?
  - Formula: (likes + comments + shares) / reach
  - What if reach = 0?
  - What if some metrics are null?

Risk: Inconsistent calculations across platforms
Should: Verify calculation logic
```

---

## PRIORITY RANKING

### 🔴 CRITICAL (Fix Immediately):
1. **Hindi/Hinglish Clarification Loop** - User is stuck
2. **Clarification Option Re-validation** - Systemic design issue

### 🟠 HIGH (Fix Soon):
3. **Language validation patterns** - Blocks valid queries
4. **Platform-specific data availability** - Returns confusing results

### 🟡 MEDIUM (Fix When Possible):
5. **Multi-dimensional grouping** - May not work correctly
6. **Null/missing data handling** - Unexpected results
7. **Date range interpretation** - "Last 7 days" ambiguous
8. **Timezone handling** - Time queries may be misleading

### 🟢 LOW (Document/Monitor):
9. **Percentile queries** - Edge case, low usage
10. **Multi-platform time queries** - Rare scenario
11. **Comparison with time element** - Valid but unusual

---

## RECOMMENDED TESTING QUERIES

### Test Set 1: Sentiment/Language
```
1. "Show me all comments on Instagram"
   → Should work, no language filter

2. "Show me Hindi comments"
   → Should trigger clarification OR work if Hindi exists

3. "Show me English and Hinglish comments"
   → Should work, multi-language filter

4. "What are people complaining about?"
   → Should clarify topic extraction limitation
```

### Test Set 2: Ads vs Organic
```
5. "Show me engagement for Facebook campaigns"
   → Should clarify ambiguous "engagement"

6. "Compare Facebook organic vs paid"
   → Should clarify metric differences

7. "Show me Google organic posts"
   → Should clarify Google has no organic

8. "Show me Twitter ads"
   → Should clarify Twitter has no ads
```

### Test Set 3: Time-Based
```
9. "Show me posts from 9 AM to 5 PM"
   → Test if time range filtering works

10. "Compare morning vs evening posts"
   → Should work (valid comparison)

11. "Show me Monday vs Friday performance"
   → Test specific day handling
```

### Test Set 4: Clarification Options
```
12. Click any clarification option
   → Monitor if it re-triggers validation

13. "Show me negative sentiment comments"
   → Then click suggested option
   → Monitor for loops
```

### Test Set 5: Edge Cases
```
14. "Show me top 10% of posts"
   → Test percentage vs count

15. "Show me last 7 days"
   → Test relative date handling

16. "Show me posts with null engagement"
   → Test null handling
```

---

## RECOMMENDED FIXES ORDER

### Phase 1: Stop Bleeding (Immediate)
1. Fix Hindi/Hinglish loop
2. Add clarification bypass mechanism

### Phase 2: Core Improvements (This Week)
3. Fix language validation to allow valid multi-language queries
4. Add platform-data availability checks
5. Document which sentiment file is primary

### Phase 3: Polish (Next Week)
6. Improve null/missing data handling
7. Add timezone clarification
8. Test and fix multi-dimensional grouping

### Phase 4: Enhancement (Later)
9. Add percentage-based queries
10. Improve date interpretation
11. Add data relationship documentation

---

**Last Updated**: 2026-01-06 20:45
**Status**: Analysis Complete - Awaiting Prioritization
