import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Award, Eye } from 'lucide-react';
import PlatformCard from './PlatformCard';
import MetricsCard from './MetricsCard';
import TopPerformers from './TopPerformers';
import HiddenGems from './HiddenGems';

const AttributionInsights = () => {
  const [summary, setSummary] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch platform summary
      const summaryRes = await fetch('http://localhost:3001/api/attribution/summary');
      const summaryData = await summaryRes.json();
      
      // Fetch campaigns
      const campaignsRes = await fetch('http://localhost:3001/api/attribution/campaigns');
      const campaignsData = await campaignsRes.json();
      
      setSummary(summaryData.data);
      setCampaigns(campaignsData.data);
    } catch (error) {
      console.error('Error fetching attribution data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!summary || summary.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No attribution data available</p>
      </div>
    );
  }

  // Calculate totals
  const totals = summary.reduce((acc, platform) => ({
    conversions: acc.conversions + platform.attributed_conversions,
    revenue: acc.revenue + platform.attributed_revenue,
    spend: acc.spend + platform.total_spend,
    roas: acc.roas + platform.attributed_roas
  }), { conversions: 0, revenue: 0, spend: 0, roas: 0 });

  const avgRoas = totals.roas / summary.length;

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricsCard
          title="Total Campaigns"
          value={campaigns.length}
          icon={<Award className="w-5 h-5" />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <MetricsCard
          title="Total Conversions"
          value={totals.conversions.toFixed(0)}
          subtitle="Attributed"
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <MetricsCard
          title="Total Revenue"
          value={`$${(totals.revenue / 1000).toFixed(1)}K`}
          subtitle="Attributed"
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <MetricsCard
          title="Avg ROAS"
          value={`${avgRoas.toFixed(2)}x`}
          subtitle="Portfolio"
          icon={<Eye className="w-5 h-5" />}
          iconBg="bg-cyan-100"
          iconColor="text-cyan-600"
        />
      </div>

      {/* Platform Performance Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Platform Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {summary.map((platform) => (
            <PlatformCard key={platform.platform} data={platform} />
          ))}
        </div>
      </div>

      {/* Top Performers */}
      <TopPerformers campaigns={campaigns} />

      {/* Hidden Gems */}
      <HiddenGems campaigns={campaigns} />

      {/* Journey Distribution */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          💡 Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-1">
              Multi-Touch Impact
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {summary.reduce((acc, p) => 
                acc + ((p.attributed_conversions - p.last_click_conversions) / p.last_click_conversions * 100), 0
              ).toFixed(0) / summary.length}%
            </div>
            <div className="text-xs text-blue-700 mt-1">
              Avg lift from multi-touch attribution
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm font-medium text-green-900 mb-1">
              Hidden Revenue
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${((totals.revenue - summary.reduce((acc, p) => acc + p.last_click_revenue, 0)) / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-green-700 mt-1">
              Revenue you weren't counting
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm font-medium text-purple-900 mb-1">
              Best Performer
            </div>
            <div className="text-2xl font-bold text-purple-600 capitalize">
              {summary.reduce((best, p) => 
                p.attributed_roas > (best?.attributed_roas || 0) ? p : best, summary[0]
              )?.platform}
            </div>
            <div className="text-xs text-purple-700 mt-1">
              Highest attributed ROAS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttributionInsights;
