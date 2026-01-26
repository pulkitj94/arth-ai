import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function EngagementChart({ data }) {
    const [interval, setInterval] = useState('Daily');

    // Aggregate data based on selected interval
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];
        if (interval === 'Daily') return data;

        const grouped = {};

        data.forEach(item => {
            // Safe local date parsing from YYYY-MM-DD
            const [y, m, d] = item.fullDate.split('-').map(Number);
            const date = new Date(y, m - 1, d); // Local time constructor

            let key = item.fullDate;
            let label = item.name;

            if (interval === 'Weekly') {
                // Get start of week (Monday)
                const day = date.getDay(); // 0-6 (Sun-Sat)
                const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
                const monday = new Date(date);
                monday.setDate(diff);

                // Format key as YYYY-MM-DD
                const mYear = monday.getFullYear();
                const mMonth = String(monday.getMonth() + 1).padStart(2, '0');
                const mDay = String(monday.getDate()).padStart(2, '0');
                key = `${mYear}-${mMonth}-${mDay}`;

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

        // Sort by date to ensure correct order
        return Object.values(grouped).sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
    }, [data, interval]);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-navy">Engagement Overview</h3>
                        <div className="group relative">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 cursor-help"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                            <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                                Total active interactions (Likes + Comments + Shares + Saves) aggregated across all connected platforms.
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500">{interval} interaction trends</p>
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

            {/* Split View for Sticky Y-Axis */}
            <div className="flex h-[300px] w-full">
                {/* Left: Fixed Y-Axis */}
                <div className="w-[60px] h-full flex-shrink-0 z-10 bg-white border-r border-gray-100">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 11 }}
                                tickFormatter={(val) => val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val}
                                width={60}
                            />
                            {/* Invisible Area to ensure scale calculation */}
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="none"
                                fill="none"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Right: Scrollable Content */}
                <div className="flex-1 overflow-x-auto pb-2 scrollbar-hide">
                    <div style={{
                        minWidth: `${Math.max(100, chartData.length * (interval === 'Weekly' ? 120 : interval === 'Monthly' ? 80 : 50))}px`,
                        height: '100%'
                    }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#028196" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#028196" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    dy={10}
                                    interval={interval === 'Daily' ? 2 : 0}
                                    padding={{ left: 30, right: 30 }}
                                />
                                {/* Hidden YAxis to ensure grid alignment matches left chart */}
                                <YAxis
                                    hide={true}
                                    width={0}
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(val) => val >= 1000 ? (val / 1000).toFixed(1) + 'K' : val}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#028196"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorEngagement)"
                                    animationDuration={1000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
