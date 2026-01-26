import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#FB6793', '#012639', '#FF9A58', '#028196']; // Pink, Navy, Orange, Teal

export default function PlatformDistribution({ data = [], title = "Platform Distribution", subtitle = "Followers by platform" }) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500">{subtitle}</p>
                </div>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                </button>
            </div>

            <div className="flex-1 w-full relative min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={85}
                            cornerRadius={10}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, fill, x, y }) => {
                                const textAnchor = x > cx ? 'start' : 'end';
                                return (
                                    <text x={x} y={y} fill={fill} textAnchor={textAnchor} dominantBaseline="central">
                                        <tspan x={x} dy="-0.4em" fontSize="14" fontWeight="600">{name}</tspan>
                                        <tspan x={x} dy="1.4em" fontSize="14" fontWeight="bold">{(percent * 100).toFixed(0)}%</tspan>
                                    </text>
                                );
                            }}
                            labelLine={true}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div >
    );
}
