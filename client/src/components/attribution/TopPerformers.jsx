import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Trophy, TrendingUp } from 'lucide-react';

const TopPerformers = ({ campaigns }) => {
  const [sortBy, setSortBy] = useState('attributed_roas');
  const [sortOrder, setSortOrder] = useState('desc');

  // Sort campaigns
  const sortedCampaigns = [...campaigns]
    .sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    })
    .slice(0, 10); // Top 10

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'desc' ? 
      <ArrowDown className="w-3 h-3 inline ml-1" /> : 
      <ArrowUp className="w-3 h-3 inline ml-1" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Top Performing Campaigns
          </h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          By attributed ROAS • Top 10 campaigns
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Campaign
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Platform
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:text-gray-900"
                onClick={() => handleSort('attributed_conversions')}
              >
                Conversions <SortIcon field="attributed_conversions" />
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:text-gray-900"
                onClick={() => handleSort('attributed_roas')}
              >
                ROAS <SortIcon field="attributed_roas" />
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Lift
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedCampaigns.map((campaign, index) => {
              const roasLift = ((campaign.attributed_roas - campaign.last_click_roas) / campaign.last_click_roas * 100);
              
              return (
                <tr key={campaign.campaign_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {index < 3 ? (
                        <span className="text-2xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gray-500">
                          #{index + 1}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                      {campaign.campaign_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize
                      ${campaign.platform === 'instagram' ? 'bg-purple-100 text-purple-800' :
                        campaign.platform === 'facebook' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'}`}>
                      {campaign.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {campaign.attributed_conversions.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {campaign.attributed_roas.toFixed(2)}x
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`text-sm font-medium flex items-center justify-end ${
                      roasLift >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {roasLift >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : '↓'}
                      {Math.abs(roasLift).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopPerformers;
