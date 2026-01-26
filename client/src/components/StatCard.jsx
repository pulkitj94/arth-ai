export default function StatCard({ title, value, label, trend, trendIsPositive, icon, color = 'brand' }) {
    const getIconColor = () => {
        switch (color) {
            case 'brand': return 'text-brand bg-brand/10';
            case 'accent': return 'text-accent bg-accent/10';
            case 'warning': return 'text-warning bg-warning/10';
            default: return 'text-brand bg-brand/10';
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${getIconColor()}`}>
                    {icon}
                </div>
                {trend && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendIsPositive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {trendIsPositive ? '+' : ''}{trend}
                    </span>
                )}
            </div>

            <div>
                <h3 className="text-3xl font-semibold text-navy mb-1">{value}</h3>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
            </div>
        </div>
    );
}
