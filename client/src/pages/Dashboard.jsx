import { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import EngagementChart from '../components/EngagementChart';
import PlatformDistribution from '../components/PlatformDistribution';

import TopPosts from '../components/TopPosts';
import AudienceGrowth from '../components/AudienceGrowth';
import OverallSentiment from '../components/OverallSentiment';

import { useFilter } from '../context/FilterContext';

import { APP_CONFIG } from '../config';

// Helper to map icon types
const getIconForPlatform = (platform) => {
    const p = platform.toLowerCase();
    if (p.includes('insta')) return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
    );
    if (p.includes('facebook')) return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
    );
    if (p.includes('twitter') || p.includes('x')) return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
            <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
        </svg>
    );
    if (p.includes('linkedin')) return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect x="2" y="9" width="4" height="12" />
            <circle cx="4" cy="4" r="2" />
        </svg>
    );
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>;
};

// KPI Icons Map
const kpiIcons = [
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.28 3.6-1.28 5.14 0 1.55 1.28 1.55 3.36 0 4.64-1.54 1.28-3.65 1.28-5.14 0-1.49-1.28-1.55-3.36 0-4.64C20.5 12.72 22.5 12.72 24 14" /><path d="M1 14c1.49-1.28 3.6-1.28 5.14 0 1.55 1.28 1.55 3.36 0 4.64-1.55 1.28-3.6 1.28-5.14 0-1.49-1.28-1.55-3.36 0-4.64C2.5 12.72 4.6 12.72 6 14" /><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" /></svg>,
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>,
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" /></svg>
];

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const { currentFilter } = useFilter();



    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                let url = `${APP_CONFIG.apiBaseUrl}/api/dashboard/stats?range=${currentFilter.range}`;
                if (currentFilter.range === 'custom' && currentFilter.startDate && currentFilter.endDate) {
                    url += `&startDate=${currentFilter.startDate.toISOString()}&endDate=${currentFilter.endDate.toISOString()}`;
                }

                const res = await fetch(url);
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error("Failed to load dashboard stats", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [currentFilter]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen text-brand">
                <svg className="animate-spin h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header Row Removed */}

            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats && stats.kpis.slice(0, 4).map((kpi, idx) => (
                    <StatCard
                        key={idx}
                        {...kpi}
                        icon={kpiIcons[idx]}
                    />
                ))}
            </div>

            {/* Row 2: Distributions & Sentiment (3 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[400px]">
                <div className="h-96 lg:h-full">
                    <PlatformDistribution
                        data={stats ? stats.charts.adsDistribution : []}
                        title="Ads Distribution"
                        subtitle="Campaigns by platform"
                    />
                </div>
                <div className="h-96 lg:h-full">
                    <PlatformDistribution
                        data={stats ? stats.charts.organicDistribution : []}
                        title="Organic Reach"
                        subtitle="Followers by platform"
                    />
                </div>
                <div className="h-96 lg:h-full">
                    <OverallSentiment
                        score={stats && stats.kpis[4] ? parseInt(stats.kpis[4].value) : 0}
                    />
                </div>
            </div>

            {/* Row 3: Engagement & Growth (2 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-[400px]">
                <div className="h-96 lg:h-full">
                    <EngagementChart data={stats ? stats.charts.engagementTrend : []} />
                </div>
                <div className="h-96 lg:h-full">
                    <AudienceGrowth data={stats ? stats.charts.audienceTrend : []} />
                </div>
            </div>

            {/* Row 4: Top Posts (Full Width) */}
            <div className="w-full">
                <TopPosts
                    posts={stats ? stats.topPosts.map(p => ({
                        ...p,
                        icon: getIconForPlatform(p.platform)
                    })) : []}
                />
            </div>
        </div>
    );
}
