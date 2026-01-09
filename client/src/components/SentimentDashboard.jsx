import React, { useEffect, useState } from 'react';
import GaugeChart from 'react-gauge-chart';
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Text
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

            const resROI = await fetch('http://localhost:3001/api/analytics/roi-matrix');
            const roiJson = await resROI.json();
            setRoiData(roiJson);

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
                setTimeout(() => {
                    fetchData(false);
                    setIsSimulating(false);
                }, 6000);
            } else {
                setIsSimulating(false);
                setLoading(false);
            }
        } catch (err) {
            setIsSimulating(false);
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setLoading(true);
        await fetch('http://localhost:3001/api/sentiment/refresh', { method: 'POST' });
        setTimeout(() => fetchData(false), 6000);
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

            // Clean up the reply by removing markdown formatting
            let cleanReply = data.reply || '';

            // Remove markdown headers (##, ###, etc.)
            cleanReply = cleanReply.replace(/^#+\s+/gm, '');

            // Remove markdown bold (**text** or __text__)
            cleanReply = cleanReply.replace(/\*\*(.+?)\*\*/g, '$1');
            cleanReply = cleanReply.replace(/__(.+?)__/g, '$1');

            // Remove markdown italic (*text* or _text_)
            cleanReply = cleanReply.replace(/\*(.+?)\*/g, '$1');
            cleanReply = cleanReply.replace(/_(.+?)_/g, '$1');

            // Remove bullet points and convert to numbered list or clean text
            cleanReply = cleanReply.replace(/^[\s-]*[-*+]\s+/gm, '• ');

            // Remove extra line breaks (more than 2 consecutive)
            cleanReply = cleanReply.replace(/\n{3,}/g, '\n\n');

            // Trim whitespace
            cleanReply = cleanReply.trim();

            setCurrentReply({ reply: cleanReply, comment, platform });
            setReplyModalOpen(true);
        } catch (error) {
            console.error('Failed to generate reply:', error);
            alert('Failed to generate reply. Please try again.');
        } finally {
            setGeneratingReplyIndex(null);
        }
    };

    const dismissAlert = (index) => {
        setDismissedAlerts([...dismissedAlerts, index]);
    };

    if (loading && sentimentData.length === 0) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>🔄 Loading AI Insights...</div>;
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
            <ReplyModal
                isOpen={replyModalOpen}
                onClose={() => setReplyModalOpen(false)}
                reply={currentReply.reply}
                comment={currentReply.comment}
                platform={currentReply.platform}
            />

            {loading && sentimentData.length > 0 && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center' }}>
                        <div style={{ width: '50px', height: '50px', border: '5px solid #f3f3f3', borderTop: '5px solid #007bff', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }}></div>
                        <h3 style={{ margin: 0 }}>🤖 AI Processing...</h3>
                    </div>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>🌍 Platform Sentiment Health</h2>
                    <p style={{ fontSize: '12px', color: '#888' }}>Last Sync: {lastUpdated}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => triggerSimulation('normal')} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>📈 Normal</button>
                    <button onClick={() => triggerSimulation('viral')} style={{ padding: '10px 15px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>🚀 Viral</button>
                    <button onClick={() => triggerSimulation('crisis')} style={{ padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>🚨 Crisis</button>
                    <button onClick={handleRefresh} style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>🔄 Refresh</button>
                </div>
            </div>

            {/* PLATFORM HEALTH GAUGES - IMPROVED */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {sentimentData.map((p) => {
                    const healthStatus = p.health_score >= 70 ? 'Healthy' : p.health_score >= 50 ? 'Moderate' : 'Critical';
                    const statusColor = p.health_score >= 70 ? '#2ecc71' : p.health_score >= 50 ? '#f39c12' : '#e74c3c';

                    return (
                        <div key={p.platform} style={{
                            background: 'white',
                            padding: '24px',
                            borderRadius: '15px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                            border: '1px solid #f0f0f0',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}>
                            {/* Platform Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1a1a1a', textTransform: 'capitalize' }}>
                                    {p.platform}
                                </h3>
                                <div style={{
                                    padding: '4px 12px',
                                    backgroundColor: `${statusColor}15`,
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: statusColor
                                }}>
                                    {healthStatus}
                                </div>
                            </div>

                            {/* Gauge Chart */}
                            <div style={{ marginBottom: '15px' }}>
                                <GaugeChart
                                    id={`g-${p.platform}`}
                                    nrOfLevels={20}
                                    percent={p.health_score / 100}
                                    colors={["#e74c3c", "#f39c12", "#2ecc71"]}
                                    arcWidth={0.25}
                                    textColor="#333"
                                    needleColor="#333"
                                    needleBaseColor="#333"
                                    hideText={true}
                                />
                            </div>

                            {/* Health Score */}
                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: statusColor, marginBottom: '4px' }}>
                                    {p.health_score}%
                                </div>
                                <div style={{ fontSize: '12px', color: '#888', fontWeight: '600' }}>
                                    Sentiment Health Score
                                </div>
                            </div>

                            {/* Sentiment Breakdown */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: '8px',
                                padding: '12px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '10px'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2ecc71', marginBottom: '2px' }}>
                                        {p.distribution.positive}%
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '600' }}>Positive</div>
                                </div>
                                <div style={{ textAlign: 'center', borderLeft: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#95a5a6', marginBottom: '2px' }}>
                                        {p.distribution.neutral}%
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '600' }}>Neutral</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e74c3c', marginBottom: '2px' }}>
                                        {p.distribution.negative}%
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '600' }}>Negative</div>
                                </div>
                            </div>

                            {/* Total Comments */}
                            <div style={{
                                marginTop: '12px',
                                padding: '10px',
                                backgroundColor: '#fff',
                                borderRadius: '8px',
                                border: '1px solid #e9ecef',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Total Comments:</span>
                                <span style={{ fontSize: '14px', color: '#333', fontWeight: 'bold' }}>{p.total_comments.toLocaleString()}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* TREND */}
            <div style={{ marginBottom: '30px' }}>
                <SentimentTrend data={historyData} />
            </div>

            {/* AD EFFICIENCY MATRIX - REDESIGNED */}
            <div style={{ background: 'white', padding: '30px', borderRadius: '15px', marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                {/* Header with Filter */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#1a1a1a' }}>📊 Ad Campaign Performance Matrix</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Analyze campaign efficiency by spend vs. sentiment</p>
                    </div>

                    {/* Platform Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#555' }}>Platform:</label>
                        <select
                            value={selectedPlatform}
                            onChange={(e) => setSelectedPlatform(e.target.value)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '2px solid #e0e0e0',
                                backgroundColor: 'white',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                color: '#333',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.borderColor = '#007bff'}
                            onMouseLeave={(e) => e.target.style.borderColor = '#e0e0e0'}
                        >
                            <option value="All Platforms">All Platforms</option>
                            <option value="Facebook Ads">Facebook Ads</option>
                            <option value="Instagram Ads">Instagram Ads</option>
                            <option value="Google Ads">Google Ads</option>
                        </select>
                    </div>
                </div>

                {/* Info Card */}
                <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e9ecef' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '13px' }}>
                        <div>
                            <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#333' }}>How to read this chart:</p>
                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#555', lineHeight: '1.8' }}>
                                <li><strong>X-axis:</strong> Total ad spend per campaign</li>
                                <li><strong>Y-axis:</strong> Net sentiment score (-100 to +100)</li>
                                <li><strong>Bubble size:</strong> Engagement volume</li>
                            </ul>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#333' }}>Quadrants explained:</p>
                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#555', lineHeight: '1.8' }}>
                                <li><span style={{ color: '#2ecc71', fontWeight: 'bold' }}>●</span> <strong>Top Left:</strong> Low spend, high sentiment → Scale these!</li>
                                <li><span style={{ color: '#27ae60', fontWeight: 'bold' }}>●</span> <strong>Top Right:</strong> High spend, high sentiment → Keep investing</li>
                                <li><span style={{ color: '#f39c12', fontWeight: 'bold' }}>●</span> <strong>Bottom Left:</strong> Low spend, low sentiment → Pause & optimize</li>
                                <li><span style={{ color: '#e74c3c', fontWeight: 'bold' }}>●</span> <strong>Bottom Right:</strong> High spend, low sentiment → URGENT: Stop or pivot</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div style={{ height: '450px', width: '100%', position: 'relative' }}>
                    <ResponsiveContainer>
                        <ScatterChart margin={{ top: 20, right: 30, bottom: 50, left: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

                            <XAxis
                                type="number"
                                dataKey="spend"
                                name="Spend"
                                unit="$"
                                tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                                label={{ value: 'Ad Spend ($)', position: 'insideBottom', offset: -10, style: { fontSize: '14px', fontWeight: 'bold', fill: '#555' } }}
                                tick={{ fontSize: 12, fill: '#666' }}
                            />

                            <YAxis
                                type="number"
                                dataKey="sentiment"
                                name="Sentiment"
                                domain={[-100, 100]}
                                tickFormatter={(value) => `${value}%`}
                                label={{ value: 'Net Sentiment Score', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 'bold', fill: '#555' } }}
                                tick={{ fontSize: 12, fill: '#666' }}
                            />

                            <ZAxis type="number" dataKey="volume" range={[100, 1000]} />

                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        const quadrant = d.sentiment > 0
                                            ? (d.spend > 60000 ? 'Brand Powerhouse' : 'Top Performer - Scale Up!')
                                            : (d.spend > 60000 ? 'DANGER ZONE - Pivot Now!' : 'Creative Misfire - Optimize');

                                        const quadrantColor = d.sentiment > 0
                                            ? (d.spend > 60000 ? '#27ae60' : '#2ecc71')
                                            : (d.spend > 60000 ? '#e74c3c' : '#f39c12');

                                        return (
                                            <div style={{ backgroundColor: '#fff', padding: '14px', border: `2px solid ${quadrantColor}`, borderRadius: '10px', maxWidth: '300px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                                <p style={{ fontWeight: 'bold', margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>{d.name}</p>
                                                <div style={{ padding: '8px', backgroundColor: quadrantColor, borderRadius: '6px', marginBottom: '10px' }}>
                                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: 'white', textAlign: 'center' }}>{quadrant}</p>
                                                </div>
                                                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#555' }}><strong>Platform:</strong> {d.platform}</p>
                                                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#555' }}><strong>Spend:</strong> ${d.spend.toLocaleString()}</p>
                                                <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 'bold', color: d.sentiment >= 0 ? '#2ecc71' : '#e74c3c' }}>
                                                    <strong>Sentiment:</strong> {d.sentiment > 0 ? '+' : ''}{d.sentiment}%
                                                </p>
                                                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#555' }}><strong>Clicks:</strong> {d.clicks.toLocaleString()}</p>
                                                <p style={{ margin: '0', fontSize: '12px', color: '#555' }}><strong>Engagement:</strong> {d.volume} interactions</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />

                            {/* Quadrant Lines */}
                            <ReferenceLine y={0} stroke="#333" strokeWidth={2} strokeDasharray="5 5" />
                            <ReferenceLine x={60000} stroke="#666" strokeWidth={1} strokeDasharray="5 5" />

                            {/* Sentiment Threshold Lines */}
                            <ReferenceLine y={20} stroke="#2ecc71" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.5} />
                            <ReferenceLine y={-20} stroke="#e74c3c" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.5} />

                            <Scatter
                                name="Campaigns"
                                data={selectedPlatform === 'All Platforms' ? roiData : roiData.filter(item => item.platform === selectedPlatform)}
                            >
                                {(selectedPlatform === 'All Platforms' ? roiData : roiData.filter(item => item.platform === selectedPlatform)).map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.sentiment > 0 ? (entry.spend > 60000 ? '#27ae60' : '#2ecc71') : (entry.spend > 60000 ? '#e74c3c' : '#f39c12')}
                                        stroke="#fff"
                                        strokeWidth={2}
                                    />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend and Stats */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e9ecef' }}>
                    <div style={{ fontSize: '13px', color: '#666', fontWeight: '600' }}>
                        Showing {selectedPlatform === 'All Platforms' ? roiData.length : roiData.filter(item => item.platform === selectedPlatform).length} campaigns
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#2ecc71' }}></div>
                            <span style={{ fontWeight: '600', color: '#555' }}>Scale Budget</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27ae60' }}></div>
                            <span style={{ fontWeight: '600', color: '#555' }}>Keep Investing</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f39c12' }}></div>
                            <span style={{ fontWeight: '600', color: '#555' }}>Optimize Creative</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#e74c3c' }}></div>
                            <span style={{ fontWeight: '600', color: '#555' }}>Stop/Pivot</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION CENTER */}
            <div style={{ background: '#fff', padding: '25px', borderRadius: '15px', border: '1px solid #ffebee', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <h3 style={{ color: '#d32f2f', marginTop: 0, marginBottom: '20px' }}>⚠️ Urgent Attention Required</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {alerts.filter((_, i) => !dismissedAlerts.includes(i)).length > 0 ? (
                        alerts
                            .map((a, i) => ({ ...a, originalIndex: i }))
                            .filter((a) => !dismissedAlerts.includes(a.originalIndex))
                            .map((a) => (
                                <div key={a.originalIndex} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#fcfcfc', borderRadius: '8px', border: '1px solid #eee' }}>
                                    <div style={{ flex: 1 }}>
                                        <small style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{a.platform}</small>
                                        <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#333' }}>"{a.comment_text}"</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', marginLeft: '20px' }}>
                                        <button
                                            onClick={() => dismissAlert(a.originalIndex)}
                                            disabled={generatingReplyIndex === a.originalIndex}
                                            style={{
                                                padding: '10px 16px',
                                                background: 'white',
                                                color: '#666',
                                                border: '2px solid #e0e0e0',
                                                borderRadius: '8px',
                                                cursor: generatingReplyIndex === a.originalIndex ? 'not-allowed' : 'pointer',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s',
                                                whiteSpace: 'nowrap'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (generatingReplyIndex !== a.originalIndex) {
                                                    e.target.style.borderColor = '#999';
                                                    e.target.style.color = '#333';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (generatingReplyIndex !== a.originalIndex) {
                                                    e.target.style.borderColor = '#e0e0e0';
                                                    e.target.style.color = '#666';
                                                }
                                            }}
                                        >
                                            <span>✕</span>
                                            <span>Dismiss</span>
                                        </button>
                                        <button
                                            onClick={() => generateAIReply(a.comment_text, a.platform, a.originalIndex)}
                                            disabled={generatingReplyIndex !== null}
                                            style={{
                                                padding: '10px 20px',
                                                background: generatingReplyIndex === a.originalIndex ? '#95a5a6' : generatingReplyIndex !== null ? '#d0d0d0' : '#1a1a1a',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: generatingReplyIndex !== null ? 'not-allowed' : 'pointer',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                transition: 'background 0.2s',
                                                whiteSpace: 'nowrap'
                                            }}
                                            onMouseEnter={(e) => generatingReplyIndex === null && (e.target.style.background = '#333')}
                                            onMouseLeave={(e) => generatingReplyIndex === null && (e.target.style.background = '#1a1a1a')}
                                        >
                                            {generatingReplyIndex === a.originalIndex ? (
                                                <>
                                                    <div style={{
                                                        width: '14px',
                                                        height: '14px',
                                                        border: '2px solid #fff',
                                                        borderTop: '2px solid transparent',
                                                        borderRadius: '50%',
                                                        animation: 'spin 0.8s linear infinite'
                                                    }}></div>
                                                    <span>Generating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>✨</span>
                                                    <span>Draft Reply</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))
                    ) : (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
                            <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>No urgent actions needed</p>
                            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#999' }}>All sentiment is looking good!</p>
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default SentimentDashboard;