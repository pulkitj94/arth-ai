import React, { useState } from 'react';
import { Sparkles, CheckCircle, AlertTriangle, Clock, Info, Eye, Share2, Hash, Video, ShieldAlert, TrendingUp, Target } from 'lucide-react';
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
        <div className="space-y-8">

            {/* Page Header — matches Dashboard card style */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-navy flex items-center gap-2">
                            <Sparkles className="text-brand" size={20} />
                            Post Performance Predictor
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Use AI to predict engagement and optimize your content before posting.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT: Input Area */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6 h-fit lg:sticky lg:top-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-navy">Platform</label>
                            <select
                                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-navy focus:ring-2 focus:ring-brand outline-none"
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
                            <label className="text-sm font-medium text-navy">Scheduled Time</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <input
                                    type="datetime-local"
                                    className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-navy focus:ring-2 focus:ring-brand outline-none"
                                    value={formData.scheduledTime}
                                    onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-navy">Media Type</label>
                            <div className="relative">
                                <Video className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <select
                                    className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-navy focus:ring-2 focus:ring-brand outline-none"
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
                            <label className="text-sm font-medium text-navy">Hashtags</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-navy focus:ring-2 focus:ring-brand outline-none"
                                    placeholder="e.g. #marketing #growth"
                                    value={formData.hashtags}
                                    onChange={e => setFormData({ ...formData, hashtags: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-navy">Caption / Copy</label>
                        <textarea
                            className="w-full h-32 bg-white border border-gray-200 rounded-lg p-4 text-navy focus:ring-2 focus:ring-brand outline-none resize-none placeholder-gray-400"
                            placeholder="Draft your post caption here..."
                            value={formData.caption}
                            onChange={e => setFormData({ ...formData, caption: e.target.value })}
                        />
                    </div>

                    <ImageUpload onImageSelect={(base64) => setFormData({ ...formData, image: base64 })} />

                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all
                            ${loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-brand hover:bg-brand-dark shadow-lg shadow-brand/20 active:scale-[0.98]'}
                        `}
                    >
                        {loading ? <>Analyzing...</> : <>Predict Performance <Sparkles size={18} /></>}
                    </button>
                </div>

                {/* RIGHT: Results */}
                <div className="space-y-6">
                    {!result ? (
                        <div className="h-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center p-8 min-h-64">
                            <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mb-4">
                                <Sparkles className="text-brand" size={28} />
                            </div>
                            <h3 className="text-lg font-medium text-navy">Ready to Analyze</h3>
                            <p className="text-sm text-gray-500 max-w-xs mt-2">
                                Fill in the details on the left and hit Predict to see your engagement score.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* 1. CURRENT ANALYSIS */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                {result.decisionSummary && (
                                    <div className="mb-6 p-3 bg-brand/10 border border-brand/20 rounded-lg text-sm text-brand font-medium flex items-center gap-2">
                                        <Info size={16} />
                                        {result.decisionSummary}
                                    </div>
                                )}
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-navy uppercase tracking-wider">Current Analysis</h3>
                                    <div className="flex gap-2">
                                        {!isHighConfidence ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-50 text-red-500 border border-red-200">
                                                Low Confidence
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand/10 text-brand border border-brand/20">
                                                High Confidence
                                            </span>
                                        )}
                                        {result.alignmentWarning && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-warning/10 text-warning border border-warning/20 flex items-center gap-1">
                                                <AlertTriangle size={10} /> Alignment Risk
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    <div>
                                        <span className="text-xs text-gray-500 block mb-1">Content Direction</span>
                                        <div className="text-lg font-bold text-navy">{result.contentType || "Unclassified"}</div>
                                        <div className="flex gap-4 mt-4">
                                            <div>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Risk</span>
                                                <span className={`text-sm font-bold ${result.riskLevel === 'Low' ? 'text-brand' : result.riskLevel === 'High' ? 'text-red-500' : 'text-warning'}`}>
                                                    {result.riskLevel}
                                                </span>
                                            </div>
                                            <div className="w-px h-8 bg-gray-200"></div>
                                            <div>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Reward</span>
                                                <span className={`text-sm font-bold ${result.rewardPotential === 'High' ? 'text-brand' : 'text-gray-500'}`}>
                                                    {result.rewardPotential}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                        <div className="flex items-start gap-2">
                                            <Target className="text-brand shrink-0 mt-0.5" size={16} />
                                            <div>
                                                <h4 className="text-xs font-bold text-brand uppercase mb-1">Recommendation</h4>
                                                <p className="text-sm font-medium text-navy">{result.recommendation || "Review content before posting."}</p>
                                            </div>
                                        </div>
                                        {result.contentMixReminder && (
                                            <div className="pt-3 border-t border-gray-100">
                                                <p className="text-xs text-gray-500 italic">"{result.contentMixReminder}"</p>
                                            </div>
                                        )}
                                        {!isHighConfidence && (
                                            <div className="pt-3 border-t border-gray-100">
                                                <p className="text-xs text-gray-400 italic">
                                                    "Numeric predictions are hidden — no historical relevance found."
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 2. SCORE & PREDICTION */}
                            {isHighConfidence && (
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                    <h3 className="text-sm font-semibold text-navy uppercase tracking-wider mb-4">Predicted Performance</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="w-48 relative">
                                            <GaugeChart
                                                id="prediction-gauge"
                                                nrOfLevels={3}
                                                colors={["#ef4444", "#f59e0b", "#10b981"]}
                                                percent={parseFloat(result.score) / 100}
                                                arcWidth={0.3}
                                                textColor="transparent"
                                                needleColor="#012639"
                                            />
                                            <div className="absolute top-[60%] left-0 w-full text-center">
                                                <div className="text-3xl font-bold text-navy">{result.score}/100</div>
                                                <div className="text-xs text-gray-500">Quality Score</div>
                                            </div>
                                        </div>
                                        <div className="flex-1 pl-8 border-l border-gray-200 space-y-4">
                                            <div>
                                                <div className="text-sm text-gray-500 mb-1">Estimated Engagement</div>
                                                <div className="text-2xl font-bold text-brand">{result.predictedEngagement}</div>
                                            </div>
                                            {result.reasoning && (
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Info size={14} className="text-brand" />
                                                        <span className="text-xs font-bold text-brand uppercase">Analysis Logic</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 italic leading-relaxed">"{result.reasoning}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. REACH & VIRALITY */}
                            {isHighConfidence && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Estimated Reach</h3>
                                        <div className="text-2xl font-mono text-navy flex items-center gap-2">
                                            <Eye className="text-brand" size={24} />
                                            {result.predictedReach || "Calculating..."}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-2">Based on similarity subset</div>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Viral Potential</h3>
                                        <div className="text-2xl font-mono text-navy flex items-center gap-2">
                                            <Share2 className="text-accent" size={24} />
                                            {result.viralityScore || "Medium"}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-2">Based on top quartile comparison</div>
                                    </div>
                                </div>
                            )}

                            {/* 4. AI IMPROVEMENTS */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-sm font-semibold text-navy uppercase tracking-wider mb-4">AI Improvements</h3>
                                <div className="space-y-3">
                                    {result.suggestions?.map((tip, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="p-1.5 bg-brand/10 rounded-full mt-0.5">
                                                <CheckCircle size={14} className="text-brand" />
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed">{tip}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 5. VISUAL VIBE */}
                            {result.visualDescription && (
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                    <h3 className="text-sm font-semibold text-navy uppercase tracking-wider mb-2">Visual Vibe Detected</h3>
                                    <p className="text-sm text-brand italic border-l-2 border-brand pl-4 py-1">
                                        "{result.visualDescription}"
                                    </p>
                                </div>
                            )}

                            {/* 6. COMPARISON TO HISTORY */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-sm font-semibold text-navy uppercase tracking-wider mb-4">Comparison to Historical Posts</h3>
                                {isHighConfidence ? (
                                    <div className="space-y-3">
                                        {result.similarPosts.map((post, i) => (
                                            <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                                                <p className="text-gray-500 italic mb-2">"{post.content}"</p>
                                                <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded font-mono">
                                                    Eng: {post.metrics}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <ShieldAlert className="text-gray-400 shrink-0" />
                                        <div className="text-gray-500 text-sm">
                                            No relevant historical matches found.<br />
                                            <span className="text-xs opacity-60">Results based on overall account history.</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 7. HISTORICAL REFERENCE */}
                            <div className="pt-6 border-t border-gray-100">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <TrendingUp size={16} /> Historical Reference (Account Baseline)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm text-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-500">Historical Baseline Score:</span>
                                            <span className="font-mono text-navy font-bold">{result.historyScore}/100</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Avg Past Engagement:</span>
                                            <span className="font-mono text-navy font-bold">{result.historyAvg}%</span>
                                        </div>
                                        {result.bestTimeRecommendation && (
                                            <div className="flex flex-col mt-2 pt-2 border-t border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500">Best Time:</span>
                                                    <span className="font-mono text-xs text-brand font-bold">{result.bestTimeRecommendation}</span>
                                                </div>
                                                {result.topTimeSlots && (
                                                    <div className="mt-2 text-[10px] space-y-1">
                                                        <div className="flex gap-1 text-gray-400">
                                                            <span className="w-8">Days:</span>
                                                            <span className="text-gray-600">{result.topTimeSlots.days.join(', ')}</span>
                                                        </div>
                                                        <div className="flex gap-1 text-gray-400">
                                                            <span className="w-8">Hours:</span>
                                                            <span className="text-gray-600">{result.topTimeSlots.hours.join(', ')}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {!isHighConfidence && (
                                        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm text-sm space-y-3">
                                            <div>
                                                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Typical Reach Range</div>
                                                <div className="font-mono text-navy text-lg font-bold">{result.predictedReach}</div>
                                                <div className="text-[10px] text-gray-400">Global account p25-p75</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Typical Potential</div>
                                                <div className="font-mono text-navy font-bold">{result.viralityScore}</div>
                                                <div className="text-[10px] text-gray-400">Global account benchmark</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* METHODOLOGY FOOTER */}
            <div className="pt-8 border-t border-gray-100 opacity-60 hover:opacity-100 transition-opacity">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Info size={16} /> Prediction Methodology
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-500">
                    <div className="space-y-2">
                        <strong className="text-gray-700 block">1. Historical Baseline</strong>
                        <p>We analyze your similar posts. The baseline is derived from the <strong>Median Engagement Rate</strong>.</p>
                        <div className="bg-gray-100 p-2 rounded font-mono text-gray-400 mt-1">
                            Formula: 0-100 Quality Map of Median Engagement
                        </div>
                    </div>
                    <div className="space-y-2">
                        <strong className="text-gray-700 block">2. Quality Score</strong>
                        <p>Deterministic adjustments:<br />• <strong>Time Match:</strong> +10 if posted during peak.<br />• <strong>Tags/Copy:</strong> Penalties for missing elements.</p>
                        <div className="bg-gray-100 p-2 rounded font-mono text-gray-400 mt-1">
                            Formula: Baseline ± Timing_Stats ± Content_Rules
                        </div>
                    </div>
                    <div className="space-y-2">
                        <strong className="text-gray-700 block">3. Estimated Engagement</strong>
                        <p>Predicted <strong>Median Engagement Rate</strong>. Reach range = 25th–75th percentile of historical performance.</p>
                        <div className="bg-gray-100 p-2 rounded font-mono text-gray-400 mt-1">
                            Range = p25 (Conservative) to p75 (Optimistic)
                        </div>
                    </div>
                </div>
                {result && result.historyDetails && (
                    <div className="mt-4 text-xs text-gray-400 flex gap-4 border-t border-gray-100 pt-2">
                        <span>Analysis averages:</span>
                        <span>❤️ {result.historyDetails.avgLikes} Likes</span>
                        <span>💬 {result.historyDetails.avgComments} Comments</span>
                        <span>👀 {result.historyDetails.avgImpressions} Impressions</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PostPredictor;