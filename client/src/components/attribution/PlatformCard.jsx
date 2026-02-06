import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

const PlatformCard = ({ data }) => {
  const {
    platform,
    attributed_roas,
    last_click_roas,
    attributed_conversions,
    last_click_conversions,
    attributed_revenue,
    total_spend,
    status
  } = data;

  const roasLift = ((attributed_roas - last_click_roas) / last_click_roas * 100);
  const convLift = ((attributed_conversions - last_click_conversions) / last_click_conversions * 100);

  // Platform colors
  const platformColors = {
    instagram: { bg: 'bg-gradient-to-br from-purple-500 to-pink-500', text: 'text-purple-600', light: 'bg-purple-50' },
    facebook: { bg: 'bg-gradient-to-br from-blue-500 to-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
    google: { bg: 'bg-gradient-to-br from-red-500 to-yellow-500', text: 'text-red-600', light: 'bg-red-50' }
  };

  const colors = platformColors[platform] || platformColors.instagram;

  // Status indicator
  const statusConfig = {
    outperforming: { color: 'text-green-600', bg: 'bg-green-50', label: '🟢 Outperforming' },
    average: { color: 'text-yellow-600', bg: 'bg-yellow-50', label: '🟡 Average' },
    underperforming: { color: 'text-red-600', bg: 'bg-red-50', label: '🔴 Underperforming' }
  };

  const currentStatus = statusConfig[status] || statusConfig.average;

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Header with platform gradient */}
      <div className={`${colors.bg} p-4`}>
        <h3 className="text-lg font-bold text-white capitalize flex items-center justify-between">
          {platform}
          <span className={`text-xs px-2 py-1 rounded ${currentStatus.bg} ${currentStatus.color} bg-opacity-90`}>
            {currentStatus.label}
          </span>
        </h3>
      </div>

      <div className="p-6 space-y-4">
        {/* Main ROAS Metric */}
        <div className="text-center pb-4 border-b border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Attributed ROAS</div>
          <div className="text-3xl font-bold text-gray-900">
            {attributed_roas.toFixed(2)}x
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs text-gray-500">vs {last_click_roas.toFixed(2)}x</span>
            <span className={`text-xs font-medium flex items-center ${roasLift >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {roasLift >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(roasLift).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Conversions</span>
            <div className="text-right">
              <span className="font-semibold text-gray-900">{attributed_conversions.toFixed(0)}</span>
              <span className="text-xs text-green-600 ml-2">+{convLift.toFixed(0)}%</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Revenue</span>
            <span className="font-semibold text-gray-900">
              ${(attributed_revenue / 1000).toFixed(1)}K
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Spend</span>
            <span className="font-semibold text-gray-900">
              ${(total_spend / 1000).toFixed(1)}K
            </span>
          </div>
        </div>

        {/* Key Insight */}
        <div className={`${colors.light} ${colors.text} p-3 rounded-lg text-xs`}>
          <div className="font-medium mb-1">💡 Key Insight:</div>
          {roasLift > 30 ? (
            <div>
              This platform is <strong>undervalued</strong> by last-click attribution. 
              Contributes {roasLift.toFixed(0)}% more value through assists.
            </div>
          ) : roasLift > 10 ? (
            <div>
              Moderate assist value. Plays important role in customer journeys.
            </div>
          ) : (
            <div>
              Primarily a direct conversion platform with fewer multi-touch journeys.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatformCard;
