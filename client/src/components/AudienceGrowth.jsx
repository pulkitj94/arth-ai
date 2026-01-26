import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AudienceGrowth({ data }) {
    const [interval, setInterval] = useState('Daily');

    // Aggregate data based on selected interval
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];
        if (interval === 'Daily') return data;

        const grouped = {};

        data.forEach(item => {
            const date = new Date(item.fullDate);
            let key = item.fullDate;
            let label = item.name;

            if (interval === 'Weekly') {
                // Get start of week (Monday)
                const day = date.getDay();
                const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                const monday = new Date(date.setDate(diff));
                key = monday.toISOString().split('T')[0];
                label = `Week of ${monday.getDate()} ${monday.toLocaleString('default', { month: 'short' })}`;
            } else if (interval === 'Monthly') {
                key = `${date.getFullYear()}-${date.getMonth()}`;
                label = date.toLocaleString('default', { month: 'long' });
            }

            if (!grouped[key]) {
                grouped[key] = { name: label, value: 0, count: 0, fullDate: key };
            }
            grouped[key].value += item.value;
            grouped[key].count += 1;
        });

        return Object.values(grouped);
    }, [data, interval]);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-navy">Audience Growth</h3>
                        <div className="group relative">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 cursor-help"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                            <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                                Daily unique reach trend across all organic posts, used as a proxy for audience growth velocity.
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500">{interval} Reach Trend</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {['Daily', 'Weekly', 'Monthly'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setInterval(type)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${interval === type
                                ? 'bg-white text-navy shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[300px] w-full overflow-x-auto pb-2 scrollbar-hide">
                <div style={{ minWidth: `${Math.max(100, chartData.length * 40)}px`, height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                interval={interval === 'Daily' ? 2 : 0}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                domain={['dataMin', 'dataMax']}
                                hide
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#FB6793"
                                strokeWidth={3}
                                dot={{ fill: '#FB6793', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                activeDot={{ r: 6 }}
                                animationDuration={1000}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
