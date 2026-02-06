import React from 'react';
import { Gem, AlertTriangle } from 'lucide-react';

const HiddenGems = ({ campaigns }) => {
  // Find campaigns with high lift (undervalued in last-click)
  const hiddenGems = campaigns
    .map(campaign => ({
      ...campaign,
      lift_pct: ((campaign.attributed_conversions - campaign.last_click_conversions) / campaign.last_click_conversions * 100)
    }))
    .filter(c => c.lift_pct > 50 && c.last_click_conversions > 5) // At least 50% lift and minimum conversions
    .sort((a, b) => b.lift_pct - a.lift_pct)
    .slice(0, 5); // Top 5

  if (hiddenGems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Gem className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Hidden Gems
          </h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Campaigns with high assist value • Would look weak in last-click
        </p>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {hiddenGems.map((campaign) => (
            <div 
              key={campaign.campaign_id}
              className="border border-purple-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    {campaign.campaign_name}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                    <span className={`px-2 py-1 rounded-full capitalize font-medium
                      ${campaign.platform === 'instagram' ? 'bg-purple-100 text-purple-800' :
                        campaign.platform === 'facebook' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'}`}>
                      {campaign.platform}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-gray-500">Last-Click</div>
                      <div className="text-sm font-medium text-gray-900">
                        {campaign.last_click_conversions.toFixed(0)} conversions
                      </div>
                      <div className="text-xs text-gray-600">
                        {campaign.last_click_roas.toFixed(2)}x ROAS
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Attributed</div>
                      <div className="text-sm font-medium text-green-600">
                        {campaign.attributed_conversions.toFixed(0)} conversions
                      </div>
                      <div className="text-xs text-green-700">
                        {campaign.attributed_roas.toFixed(2)}x ROAS
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded p-3">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-yellow-800">
                      <strong>Hidden Value: +{campaign.lift_pct.toFixed(0)}%</strong>
                      <div className="mt-1">
                        This campaign contributes to <strong>{(campaign.attributed_conversions - campaign.last_click_conversions).toFixed(0)}</strong> additional 
                        conversions through assists. Don't pause based on last-click alone!
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ml-4">
                  <div className="bg-purple-100 text-purple-700 rounded-full px-3 py-1 text-xs font-bold">
                    +{campaign.lift_pct.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {hiddenGems.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> These campaigns start or assist in customer journeys 
              but may not get final click credit. They're essential for your marketing funnel!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HiddenGems;
