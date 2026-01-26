import React, { useEffect, useState } from 'react';
import GaugeChart from 'react-gauge-chart';
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import SentimentTrend from './SentimentTrend';
import ReplyModal from './ReplyModal';

const SentimentDashboard = () => {
    const [sentimentData, setSentimentData] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [roiData, setRoiData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [isSimulating, setIsSimulating] = useState(false);
    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [currentReply, setCurrentReply] = useState({ reply: '', comment: '', platform: '' });
    const [selectedPlatform, setSelectedPlatform] = useState('All Platforms');
    const [generatingReplyIndex, setGeneratingReplyIndex] = useState(null);
    const [dismissedAlerts, setDismissedAlerts] = useState([]);

    // Fetch all dashboard data from Node.js API
    const fetchData = async (keepLoadingState = false) => {
        try {
            if (!keepLoadingState) setLoading(true);

            const resSummary = await fetch('http://localhost:3001/api/sentiment/summary');
            const summary = await resSummary.json();
            setSentimentData(summary);

            const resAlerts = await fetch('http://localhost:3001/api/sentiment/negative-alerts');
            const alertData = await resAlerts.json();
            setAlerts(alertData);

            const resHistory = await fetch('http://localhost:3001/api/sentiment/history');
            const history = await resHistory.json();
            setHistoryData(history);

            // Fetch ROI Data if endpoint exists (handling potential absence gracefully)
            try {
                const resROI = await fetch('http://localhost:3001/api/analytics/roi-matrix');
                if (resROI.ok) {
                    const roiJson = await resROI.json();
                    setRoiData(roiJson);
                }
            } catch (e) {
                console.warn("ROI Matrix data fetch failed", e);
            }

            setLastUpdated(new Date().toLocaleTimeString());
            setLoading(false);
        } catch (err) {
            console.error("Fetch Error:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(false);
        const interval = setInterval(() => fetchData(true), 120000);
        return () => clearInterval(interval);
    }, []);

    // Manual Scenario Trigger
    const triggerSimulation = async (scenarioType) => {
        try {
            setIsSimulating(true);
            setLoading(true);

            const res = await fetch('http://localhost:3001/api/simulate/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario: scenarioType })
            });

            const data = await res.json();

            if (data.success) {
                // Wait 6 seconds for Python to finish AI labeling
                setTimeout(() => {
                    fetchData(false);
                    setIsSimulating(false);
                }, 6000);
            } else {
                setIsSimulating(false);
                setLoading(false);
            }
        } catch (err) {
            console.error("Simulation failed", err);
            setIsSimulating(false);
            setLoading(false);
            alert("Failed to trigger simulation. Please try again.");
        }
    };

    const handleRefresh = async () => {
        try {
            setLoading(true);
            await fetch('http://localhost:3001/api/sentiment/refresh', { method: 'POST' });
            setTimeout(() => fetchData(false), 6000);
        } catch (err) {
            console.error("Refresh failed", err);
            setLoading(false);
            alert("Failed to refresh. Please try again.");
        }
    };

    const generateAIReply = async (comment, platform, index) => {
        try {
            setGeneratingReplyIndex(index);
            const res = await fetch('http://localhost:3001/api/sentiment/generate-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment, platform })
            });
            const data = await res.json();

            // Clean up reply logic preserved from previous implementation
            let cleanReply = data.reply || '';
            cleanReply = cleanReply.replace(/^#+\s+/gm, '')
                .replace(/\*\*(.+?)\*\*/g, '$1')
                .replace(/__(.+?)__/g, '$1')
                .replace(/\*(.+?)\*/g, '$1')
                .replace(/_(.+?)_/g, '$1')
                .replace(/^[\s-]*[-*+]\s+/gm, '• ')
                .replace(/\n{3,}/g, '\n\n')
                .trim();

            setCurrentReply({ reply: cleanReply, comment, platform });
            setReplyModalOpen(true);
        } catch (err) {
            alert("Failed to generate reply. Please try again.");
        } finally {
            setGeneratingReplyIndex(null);
        }
    };

    const dismissAlert = (index) => {
        setDismissedAlerts([...dismissedAlerts, index]);
    };

    if (loading && sentimentData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 h-64">
                <div className="text-4xl mb-4">🔄</div>
                <div className="text-lg text-gray-500 font-medium">Loading AI Insights...</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative font-sans">
            <ReplyModal
                isOpen={replyModalOpen}
                onClose={() => setReplyModalOpen(false)}
                reply={currentReply.reply}
                comment={currentReply.comment}
                platform={currentReply.platform}
            />

            {/* Loading Overlay */}
            {loading && sentimentData.length > 0 && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-white p-10 rounded-2xl text-center shadow-2xl max-w-sm w-full mx-4">
                        <div className="w-16 h-16 border-4 border-gray-100 border-t-brand rounded-full mx-auto mb-6 animate-spin"></div>
                        <div className="text-xl font-bold text-gray-800 mb-2">
                            🤖 AI is Processing...
                        </div>
                        <div className="text-sm text-gray-500">
                            Analyzing sentiment and updating dashboard
                        </div>
                    </div>
                </div>
            )}

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-brand flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand"><path d="M19 14c1.49-1.28 3.6-1.28 5.14 0 1.55 1.28 1.55 3.36 0 4.64-1.54 1.28-3.65 1.28-5.14 0-1.49-1.28-1.55-3.36 0-4.64C20.5 12.72 22.5 12.72 24 14" /><path d="M1 14c1.49-1.28 3.6-1.28 5.14 0 1.55 1.28 1.55 3.36 0 4.64-1.55 1.28-3.6 1.28-5.14 0-1.49-1.28-1.55-3.36 0-4.64C2.5 12.72 4.6 12.72 6 14" /><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" /></svg>
                        Platform Sentiment Health
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Last Sync: {lastUpdated}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => triggerSimulation('normal')}
                        disabled={isSimulating}
                        className={`px-4 py-2 border border-green-600 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg shadow-sm font-medium transition-colors flex items-center gap-2 ${isSimulating ? 'opacity-60' : ''}`}
                    >
                        📈 Normal Growth
                    </button>
                    <button
                        onClick={() => triggerSimulation('viral')}
                        disabled={isSimulating}
                        className={`px-4 py-2 border border-purple-600 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg shadow-sm font-medium transition-colors flex items-center gap-2 ${isSimulating ? 'opacity-60' : ''}`}
                    >
                        🚀 Viral Growth
                    </button>
                    <button
                        onClick={() => triggerSimulation('crisis')}
                        disabled={isSimulating}
                        className={`px-4 py-2 border border-red-600 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg shadow-sm font-medium transition-colors flex items-center gap-2 ${isSimulating ? 'opacity-60' : ''}`}
                    >
                        🚨 Trigger Crisis
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 border border-brand text-brand-dark bg-brand/10 hover:bg-brand/20 rounded-lg shadow-sm font-medium transition-colors flex items-center gap-2"
                    >
                        🔄 Refresh AI
                    </button>
                </div>
            </div>

            {/* --- SECTION 1: GAUGE GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {sentimentData.map((platform) => {
                    const healthStatus = platform.health_score >= 70 ? 'Strong' : platform.health_score >= 40 ? 'Moderate' : 'Critical';
                    const statusColorClass = platform.health_score >= 70 ? 'text-green-600' : platform.health_score >= 40 ? 'text-yellow-600' : 'text-red-600';
                    const bgStatusClass = platform.health_score >= 70 ? 'bg-green-50 text-green-700' : platform.health_score >= 40 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700';

                    return (
                        <div key={platform.platform} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center flex flex-col items-center">
                            <h3 className="text-lg font-bold text-navy capitalize mb-4">{platform.platform}</h3>
                            <div className="flex flex-col items-center w-full">
                                <div className="w-full max-w-[200px] -mb-4">
                                    <GaugeChart
                                        id={`gauge-${platform.platform}`}
                                        nrOfLevels={3}
                                        percent={platform.health_score / 100}
                                        colors={["#EF4444", "#F59E0B", "#10B981"]}
                                        arcWidth={0.15}
                                        hideText={true}
                                    />
                                </div>
                                <div className="text-center pt-4 pb-2">
                                    <span className="text-2xl font-bold text-navy">
                                        {platform.health_score}%
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 text-center w-full">
                                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${bgStatusClass} mb-3`}>
                                    Health: {healthStatus}
                                </div>

                                {/* Sentiment Breakdown */}
                                <div className="grid grid-cols-3 gap-1 text-[10px] border-t border-gray-100 pt-3">
                                    <div className="flex flex-col items-center">
                                        <div className="font-bold text-green-600 text-sm">{platform.distribution.positive}%</div>
                                        <div className="text-gray-400 uppercase tracking-wide">Positive</div>
                                    </div>
                                    <div className="border-l border-r border-gray-100 flex flex-col items-center">
                                        <div className="font-bold text-gray-500 text-sm">{platform.distribution.neutral}%</div>
                                        <div className="text-gray-400 uppercase tracking-wide">Neutral</div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="font-bold text-red-500 text-sm">{platform.distribution.negative}%</div>
                                        <div className="text-gray-400 uppercase tracking-wide">Negative</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- SECTION 2: TREND CHART --- */}
            <div className="mb-8">
                <SentimentTrend data={historyData} />
            </div>

            {/* --- SECTION 3: AD EFFICIENCY MATRIX (PRESERVED) --- */}
            {roiData && roiData.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-navy mb-1">📊 Ad Campaign Performance Matrix</h3>
                            <p className="text-sm text-gray-500">Analyze campaign efficiency by spend vs. sentiment</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-semibold text-gray-600">Platform:</label>
                            <select
                                value={selectedPlatform}
                                onChange={(e) => setSelectedPlatform(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium focus:ring-2 focus:ring-brand focus:border-transparent outline-none"
                            >
                                <option value="All Platforms">All Platforms</option>
                                <option value="Facebook Ads">Facebook Ads</option>
                                <option value="Instagram Ads">Instagram Ads</option>
                                <option value="Google Ads">Google Ads</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
                            <div>
                                <strong className="block text-gray-800 mb-2">How to read:</strong>
                                <ul className="space-y-1 list-disc list-inside">
                                    <li>X-axis: Total Spend</li>
                                    <li>Y-axis: Net Sentiment (-100 to +100)</li>
                                    <li>Bubble size: Engagement Volume</li>
                                </ul>
                            </div>
                            <div>
                                <strong className="block text-gray-800 mb-2">Quadrants:</strong>
                                <ul className="space-y-1">
                                    <li><span className="text-green-600 font-bold">●</span> Top Left: High Sentiment/Low Spend (Scale)</li>
                                    <li><span className="text-emerald-600 font-bold">●</span> Top Right: High Sentiment/High Spend (Keep)</li>
                                    <li><span className="text-orange-500 font-bold">●</span> Bottom Left: Low Sentiment/Low Spend (Optimize)</li>
                                    <li><span className="text-red-500 font-bold">●</span> Bottom Right: Low Sentiment/High Spend (Stop)</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="h-96 w-full">
                        <ResponsiveContainer>
                            <ScatterChart margin={{ top: 20, right: 30, bottom: 50, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    type="number"
                                    dataKey="spend"
                                    name="Spend"
                                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                                    tick={{ fontSize: 12, fill: '#888' }}
                                    tickMargin={10}
                                    label={{ value: 'Total Spend (₹)', position: 'insideBottom', offset: -10, fill: '#666', fontSize: 13 }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="sentiment"
                                    name="Sentiment"
                                    domain={[-100, 100]}
                                    tickFormatter={(val) => `${val}%`}
                                    tick={{ fontSize: 12, fill: '#888' }}
                                    tickMargin={10}
                                    label={{ value: 'Net Sentiment Score', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' }, fill: '#666', fontSize: 13, dx: -10 }}
                                />
                                <ZAxis type="number" dataKey="volume" range={[100, 1000]} />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            const isGood = d.sentiment > 0;
                                            const isHighSpend = d.spend > 60000;
                                            const color = isGood ? (isHighSpend ? '#059669' : '#10B981') : (isHighSpend ? '#EF4444' : '#F59E0B');
                                            return (
                                                <div className="bg-white p-3 border rounded-lg shadow-lg" style={{ borderColor: color, borderTopWidth: 4 }}>
                                                    <p className="font-bold text-gray-800 mb-1">{d.name}</p>
                                                    <p className="text-xs text-gray-500 mb-2">{d.platform}</p>
                                                    <div className="text-xs space-y-1">
                                                        <p>Spend: <span className="font-medium">₹{d.spend.toLocaleString()}</span></p>
                                                        <p>Sentiment: <span className="font-bold" style={{ color }}>{d.sentiment}%</span></p>
                                                        <p>Engagement: <span className="font-medium">{d.volume}</span></p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceLine y={0} stroke="#cbd5e1" />
                                <ReferenceLine x={60000} stroke="#cbd5e1" strokeDasharray="3 3" />
                                <Scatter name="Campaigns" data={selectedPlatform === 'All Platforms' ? roiData : roiData.filter(i => i.platform === selectedPlatform)}>
                                    {(selectedPlatform === 'All Platforms' ? roiData : roiData.filter(i => i.platform === selectedPlatform)).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.sentiment > 0 ? (entry.spend > 60000 ? '#059669' : '#10B981') : (entry.spend > 60000 ? '#EF4444' : '#F59E0B')} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* --- SECTION 4: ACTION CENTER --- */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-50">
                <h3 className="text-red-600 text-lg font-bold mb-6 flex items-center gap-2">
                    ⚠️ Urgent Attention Required
                </h3>
                <div className="flex flex-col gap-4">
                    {alerts.filter((_, i) => !dismissedAlerts.includes(i)).length > 0 ? (
                        alerts
                            .map((a, i) => ({ ...a, originalIndex: i }))
                            .filter((a) => !dismissedAlerts.includes(a.originalIndex))
                            .map((alert) => (
                                <div key={alert.originalIndex} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 border border-gray-100 rounded-xl gap-4">
                                    <div className="flex-1">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{alert.platform}</span>
                                        <p className="my-1 text-sm text-gray-800 font-medium">"{alert.comment_text}"</p>
                                        <small className="text-gray-500">User: {alert.user_handle}</small>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => dismissAlert(alert.originalIndex)}
                                            className="px-3 py-2 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Dismiss
                                        </button>
                                        <button
                                            onClick={() => generateAIReply(alert.comment_text, alert.platform, alert.originalIndex)}
                                            disabled={generatingReplyIndex !== null}
                                            className="px-4 py-2 bg-navy hover:bg-navy-light text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                                        >
                                            {generatingReplyIndex === alert.originalIndex ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>Generating...</span>
                                                </>
                                            ) : (
                                                'Draft Reply'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))
                    ) : (
                        <p className="text-gray-500 text-sm flex items-center gap-2 p-4 bg-green-50 rounded-lg text-green-700">
                            ✅ All comments are healthy. No urgent actions needed.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SentimentDashboard;