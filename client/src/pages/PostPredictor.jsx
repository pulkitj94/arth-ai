import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle, AlertTriangle, Clock, Info, Eye, Share2, Hash, Video, ShieldAlert, TrendingUp, Target } from 'lucide-react';
import GaugeChart from 'react-gauge-chart';
import ImageUpload from '../components/ImageUpload';
import { APP_CONFIG } from '../config';

const PostPredictor = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [formData, setFormData] = useState({
        platform: 'Instagram',
        caption: '',
        scheduledTime: '',
        image: null,
        mediaType: 'post',
        hashtags: ''
    });

    const handleAnalyze = async () => {
        if (!formData.caption && !formData.image) {
            alert("Please provide some text or an image!");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${APP_CONFIG.API_URL}/api/predict/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error("Analysis failed:", error);
            alert("Prediction failed. Detailed error in console.");
        } finally {
            setLoading(false);
        }
    };

    const isHighConfidence = result?.similarityCount >= 2;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="text-brand" /> Post Performance Predictor
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Use AI to predict engagement and optimize your content before posting.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT: Input Area */}
                <div className="bg-navy-light rounded-2xl p-6 border border-white/5 space-y-6 h-fit lg:sticky lg:top-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-200">Platform</label>
                            <select
                                className="w-full bg-navy border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-brand outline-none"
                                value={formData.platform}
                                onChange={e => setFormData({ ...formData, platform: e.target.value })}
                            >
                                <option>Instagram</option>
                                <option>Twitter</option>
                                <option>Facebook</option>
                                <option>LinkedIn</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-200">Scheduled Time</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                <input
                                    type="datetime-local"
                                    className="w-full bg-navy border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-brand outline-none"
                                    value={formData.scheduledTime}
                                    onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
                                />
                            </div>
                        </div>
                        {/* Row 2: Media Type & Hashtags */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-200">Media Type</label>
                            <div className="relative">
                                <Video className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                <select
                                    className="w-full bg-navy border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-brand outline-none"
                                    value={formData.mediaType}
                                    onChange={e => setFormData({ ...formData, mediaType: e.target.value })}
                                >
                                    <option value="post">Post (Image/Text)</option>
                                    <option value="video">Video</option>
                                    <option value="reel">Reel / Short</option>
                                    <option value="carousel">Carousel</option>
                                    <option value="story">Story</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-200">Hashtags</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    className="w-full bg-navy border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-brand outline-none"
                                    placeholder="e.g. #marketing #growth"
                                    value={formData.hashtags}
                                    onChange={e => setFormData({ ...formData, hashtags: e.target.value })}
                                />
                            </div>
                        </div>

                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-blue-200">Caption / Copy</label>
                        <textarea
                            className="w-full h-32 bg-navy border border-white/10 rounded-lg p-4 text-white focus:ring-2 focus:ring-brand outline-none resize-none placeholder-gray-600"
                            placeholder="Draft your post caption here..."
                            value={formData.caption}
                            onChange={e => setFormData({ ...formData, caption: e.target.value })}
                        />
                    </div>

                    <ImageUpload onImageSelect={(base64) => setFormData({ ...formData, image: base64 })} />

                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                            ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-brand hover:bg-brand-dark shadow-lg shadow-brand/20 active:scale-[0.98]'}
                        `}
                    >
                        {loading ? (
                            <>Analyze...</>
                        ) : (
                            <>Predict Performance <Sparkles size={18} /></>
                        )}
                    </button>
                </div>

                {/* RIGHT: Analysis Results */}
                <div className="space-y-6">
                    {!result ? (
                        /* Empty State */
                        <div className="h-full bg-navy-light/50 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 bg-navy rounded-full flex items-center justify-center mb-4">
                                <Sparkles className="text-gray-600" size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-300">Ready to Analyze</h3>
                            <p className="text-sm text-gray-500 max-w-xs mt-2">
                                Fill in the details on the left and hit Predict to see your engagement score.
                            </p>
                        </div>
                    ) : (
                        /* Result State */
                        <>
                            {/* 1. CURRENT ANALYSIS (DECISION SUPPORT) - NEW TOP SECTION */}
                            <div className="bg-navy-light rounded-2xl p-6 border border-white/10">
                                {/* ONE-LINE DECISION SUMMARY */}
                                {result.decisionSummary && (
                                    <div className="mb-6 p-3 bg-brand/10 border border-brand/20 rounded-lg text-sm text-brand font-medium flex items-center gap-2">
                                        <Info size={16} />
                                        {result.decisionSummary}
                                    </div>
                                )}

                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Current Analysis (This Post)</h3>
                                    {/* Badges */}
                                    <div className="flex gap-2">
                                        {!isHighConfidence ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-400/10 text-red-400 border border-red-400/20">
                                                Low Confidence
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand/10 text-brand border border-brand/20">
                                                High Confidence
                                            </span>
                                        )}
                                        {result.alignmentWarning && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center gap-1">
                                                <AlertTriangle size={10} /> Alignment Risk
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    <div>
                                        <div className="mb-2">
                                            <span className="text-xs text-gray-400 block mb-1">Content Direction</span>
                                            <div className="text-lg font-bold text-white flex items-center gap-2">
                                                {result.contentType || "Unclassified"}
                                            </div>
                                        </div>

                                        <div className="flex gap-4 mt-4">
                                            <div>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Risk</span>
                                                <span className={`text-sm font-bold ${result.riskLevel === 'Low' ? 'text-success-400' : result.riskLevel === 'High' ? 'text-red-400' : 'text-yellow-400'}`}>
                                                    {result.riskLevel}
                                                </span>
                                            </div>
                                            <div className="w-px h-8 bg-white/10"></div>
                                            <div>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Reward</span>
                                                <span className={`text-sm font-bold ${result.rewardPotential === 'High' ? 'text-success-400' : 'text-gray-300'}`}>
                                                    {result.rewardPotential}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-navy p-4 rounded-xl border border-white/5 space-y-3">
                                        <div className="flex items-start gap-2">
                                            <Target className="text-brand shrink-0 mt-0.5" size={16} />
                                            <div>
                                                <h4 className="text-xs font-bold text-blue-200 uppercase mb-1">Recommendation</h4>
                                                <p className="text-sm font-medium text-white">{result.recommendation || "Review content before posting."}</p>
                                            </div>
                                        </div>

                                        {result.contentMixReminder && (
                                            <div className="pt-3 border-t border-white/5">
                                                <p className="text-xs text-gray-400 italic">
                                                    "{result.contentMixReminder}"
                                                </p>
                                            </div>
                                        )}
                                        {!isHighConfidence && (
                                            <div className="pt-3 border-t border-white/5">
                                                <p className="text-xs text-gray-500 italic">
                                                    "Numeric performance predictions are hidden because this content has no historical relevance."
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 2. SCORE & PREDICTION PANEL */}
                            {isHighConfidence && (
                                <div className="bg-navy-light rounded-2xl p-6 border border-white/5">
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Predicted Performance</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="w-48 relative">
                                            <GaugeChart
                                                id="prediction-gauge"
                                                nrOfLevels={3}
                                                colors={["#ef4444", "#f59e0b", "#10b981"]}
                                                percent={parseFloat(result.score) / 100}
                                                arcWidth={0.3}
                                                textColor="transparent"
                                                needleColor="#4b5563"
                                            />
                                            <div className="absolute top-[60%] left-0 w-full text-center">
                                                <div className="text-3xl font-bold text-white">{result.score}/100</div>
                                                <div className="text-xs text-gray-400">Quality Score</div>
                                            </div>
                                        </div>

                                        <div className="flex-1 pl-8 border-l border-white/10 space-y-4">
                                            <div>
                                                <div className="text-sm text-gray-400 mb-1">Estimated Engagement</div>
                                                <div className="text-2xl font-bold text-success-400">{result.predictedEngagement}</div>
                                            </div>

                                            {/* ANALYSIS LOGIC (Reasoning) */}
                                            {result.reasoning && (
                                                <div className="bg-navy p-3 rounded-lg border border-white/5">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Info size={14} className="text-blue-400" />
                                                        <span className="text-xs font-bold text-blue-200 uppercase">Analysis Logic</span>
                                                    </div>
                                                    <p className="text-sm text-gray-300 italic leading-relaxed">
                                                        "{result.reasoning}"
                                                    </p>
                                                    {result.analysisLogic && (
                                                        <p className="text-xs text-gray-500 mt-2 border-t border-white/5 pt-2 font-mono whitespace-pre-wrap">
                                                            {result.analysisLogic}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. REACH & VIRALITY (CONDITIONAL) */}
                            {/* Only show distinct Reach/Viral cards if confidence is high. Otherwise move to Historical. */}
                            {isHighConfidence && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-navy-light p-6 rounded-xl border border-white/10 relative overflow-hidden">
                                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Estimated Reach</h3>
                                        <div className="text-2xl font-mono text-white flex items-center gap-2">
                                            <Eye className="text-brand-light" size={24} />
                                            {result.predictedReach || "Calculating..."}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-2">
                                            Based on similarity subset
                                        </div>
                                    </div>
                                    <div className="bg-navy-light p-6 rounded-xl border border-white/10 relative overflow-hidden">
                                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Viral Potential</h3>
                                        <div className="text-2xl font-mono text-white flex items-center gap-2">
                                            <Share2 className="text-purple-400" size={24} />
                                            {result.viralityScore || "Medium"}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-2">
                                            Based on comparison to top quartile
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 4. AI IMPROVEMENTS */}
                            <div className="bg-navy-light rounded-2xl p-6 border border-white/5">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">AI Improvements</h3>
                                <div className="space-y-3">
                                    {result.suggestions?.map((tip, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 bg-navy rounded-lg border border-white/5">
                                            <div className="p-1.5 bg-brand/10 rounded-full mt-0.5">
                                                <CheckCircle size={14} className="text-brand" />
                                            </div>
                                            <p className="text-sm text-gray-200 leading-relaxed">{tip}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 5. VISUAL VIBE (Full Text) */}
                            {result.visualDescription && (
                                <div className="bg-navy-light rounded-2xl p-6 border border-white/5">
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Visual Vibe Detected</h3>
                                    <p className="text-sm text-blue-200 italic border-l-2 border-brand pl-4 py-1">
                                        "{result.visualDescription}"
                                    </p>
                                </div>
                            )}

                            {/* 6. COMPARISON TO HISTORY OR DISCLAIMER */}
                            <div className="bg-navy-light rounded-2xl p-6 border border-white/5">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Comparison to Historical Posts</h3>
                                {isHighConfidence ? (
                                    <div className="space-y-3">
                                        {result.similarPosts.map((post, i) => (
                                            <div key={i} className="p-3 bg-navy rounded-lg border border-white/5 text-sm">
                                                <p className="text-gray-400 italic mb-2">"{post.content}"</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs bg-success-400/10 text-success-400 px-2 py-0.5 rounded font-mono">
                                                        Eng: {post.metrics}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-4 bg-navy rounded-lg border border-white/5">
                                        <ShieldAlert className="text-gray-500 shrink-0" />
                                        <div className="text-gray-400 text-sm">
                                            No relevant historical matches for this post to compare against. <br />
                                            <span className="text-xs opacity-60">Results are based on overall account history (reference only).</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 7. HISTORICAL REFERENCE (MOVED DOWN) */}
                            <div className="mt-8 pt-8 border-t border-white/10">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <TrendingUp size={16} /> Historical Reference (Account Baseline)
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Historical Stats Pill */}
                                    <div className="bg-navy rounded-lg p-4 border border-white/5 text-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-400">Historical Baseline Score:</span>
                                            <span className="font-mono text-white">{result.historyScore}/100</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400">Avg Past Engagement:</span>
                                            <span className="font-mono text-white">{result.historyAvg}%</span>
                                        </div>

                                        {result.bestTimeRecommendation && (
                                            <div className="flex flex-col mt-2 pt-2 border-t border-white/5 text-brand-light">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400">Best Time (Hist):</span>
                                                    <span className="font-mono text-xs text-brand font-bold">{result.bestTimeRecommendation}</span>
                                                </div>
                                                {result.topTimeSlots && (
                                                    <div className="mt-2 text-[10px] space-y-1">
                                                        <div className="flex gap-1 text-gray-500">
                                                            <span className="w-8">Days:</span>
                                                            <span className="text-gray-300">{result.topTimeSlots.days.join(', ')}</span>
                                                        </div>
                                                        <div className="flex gap-1 text-gray-500">
                                                            <span className="w-8">Hours:</span>
                                                            <span className="text-gray-300">{result.topTimeSlots.hours.join(', ')}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* If Low Confidence, Show Reference Reach Here */}
                                    {!isHighConfidence && (
                                        <div className="bg-navy rounded-lg p-4 border border-white/5 text-sm space-y-3">
                                            <div>
                                                <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Typical Reach Range</div>
                                                <div className="font-mono text-white text-lg">{result.predictedReach}</div>
                                                <div className="text-[10px] text-gray-500">Global account p25-p75</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Typical Potential</div>
                                                <div className="font-mono text-white">{result.viralityScore}</div>
                                                <div className="text-[10px] text-gray-500">Global account benchmark</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* METHODOLOGY FOOTER (Transparency) */}
            <div className="mt-12 pt-8 border-t border-white/5 opacity-60 hover:opacity-100 transition-opacity">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Info size={16} /> Prediction Methodology
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-400">
                    <div className="space-y-2">
                        <strong className="text-gray-300 block">1. Historical Baseline</strong>
                        <p>
                            We analyze your similar (or recent) posts. The baseline is derived from the <strong>Median Engagement Rate</strong>.
                        </p>
                        <div className="bg-navy-dark p-2 rounded font-mono text-gray-500 mt-1">
                            Formula: 0-100 Quality Map of Median Engagement
                        </div>
                    </div>
                    <div className="space-y-2">
                        <strong className="text-gray-300 block">2. Quality Score</strong>
                        <p>
                            We apply deterministic adjustments:
                            <br />• <strong>Time Match:</strong> +10 if posted during your historic peak.
                            <br />• <strong>Tags/Copy:</strong> Penalties for missing tags or short copy.
                        </p>
                        <div className="bg-navy-dark p-2 rounded font-mono text-gray-500 mt-1">
                            Formula: Baseline ± Timing_Stats ± Content_Rules
                        </div>
                    </div>
                    <div className="space-y-2">
                        <strong className="text-gray-300 block">3. Estimated Engagement</strong>
                        <p>
                            Predicted <strong>Median Engagement Rate</strong> for this post type.
                            Reach range represents the 25th-75th percentile of your historical performance.
                        </p>
                        <div className="bg-navy-dark p-2 rounded font-mono text-gray-500 mt-1">
                            Range = p25 (Conservative) to p75 (Optimistic)
                        </div>
                    </div>
                </div>
                {result && result.historyDetails && (
                    <div className="mt-4 text-xs text-gray-600 flex gap-4 border-t border-white/5 pt-2">
                        <span>Analysis dataset averages:</span>
                        <span>❤️ {result.historyDetails.avgLikes} Likes</span>
                        <span>💬 {result.historyDetails.avgComments} Comments</span>
                        <span>👀 {result.historyDetails.avgImpressions} Impressions</span>
                    </div>
                )}
            </div>
        </div >
    );
};

export default PostPredictor;
