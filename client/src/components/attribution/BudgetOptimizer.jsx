import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Download, Check, AlertCircle } from 'lucide-react';

const BudgetOptimizer = () => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/attribution/budget-recommendations');
      const data = await response.json();

      console.log('Budget data received:', data); // Debug

      if (data.success && data.data) {
        setRecommendations(data.data);
      } else {
        setError('No budget data available');
      }
    } catch (error) {
      console.error('Error fetching budget recommendations:', error);
      setError(error.message);
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

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600">{error}</p>
        <button
          onClick={fetchRecommendations}
          className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!recommendations || !recommendations.platforms) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No budget recommendations available</p>
      </div>
    );
  }

  // Calculate summary from the data
  const currentTotalBudget = recommendations.total_budget ||
    recommendations.platforms.reduce((sum, p) => sum + (p.current_budget || 0), 0);

  const recommendedTotalBudget = recommendations.platforms.reduce(
    (sum, p) => sum + (p.recommended_budget || p.current_budget || 0), 0
  );

  const currentRoas = recommendations.average_attributed_roas ||
    recommendations.platforms.reduce((sum, p) => sum + (p.attributed_roas || 0), 0) / recommendations.platforms.length;

  // Calculate projected ROAS based on recommendations
  const projectedRoas = recommendations.platforms.reduce((sum, p) => {
    const budget = p.recommended_budget || p.current_budget || 0;
    const roas = p.attributed_roas || 0;
    return sum + (budget * roas);
  }, 0) / recommendedTotalBudget;

  const projectedAnnualImpact = (projectedRoas - currentRoas) * recommendedTotalBudget * 12;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-4">Budget Optimization Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm opacity-90 mb-1">Current Portfolio ROAS</div>
            <div className="text-3xl font-bold">{currentRoas.toFixed(2)}x</div>
          </div>
          <div>
            <div className="text-sm opacity-90 mb-1">Projected Portfolio ROAS</div>
            <div className="text-3xl font-bold flex items-center gap-2">
              {projectedRoas.toFixed(2)}x
              <span className="text-sm bg-white/20 px-2 py-1 rounded">
                +{((projectedRoas - currentRoas) / currentRoas * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm opacity-90 mb-1">Expected Annual Impact</div>
            <div className="text-3xl font-bold">
              {projectedAnnualImpact >= 0 ? '+' : ''}${(projectedAnnualImpact / 1000).toFixed(0)}K
            </div>
          </div>
        </div>
      </div>

      {/* Platform Recommendations */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Platform Budget Recommendations
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Based on attributed ROAS performance
          </p>
        </div>

        <div className="p-6 space-y-6">
          {recommendations.platforms.map((platform) => {
            const change = (platform.recommended_budget || platform.current_budget) - platform.current_budget;
            const changePct = platform.current_budget > 0
              ? (change / platform.current_budget * 100)
              : 0;
            const isIncrease = change > 0;
            const isDecrease = change < 0;

            return (
              <div key={platform.platform} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 capitalize">
                      {platform.platform}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Attributed ROAS: <span className="font-semibold">{platform.attributed_roas.toFixed(2)}x</span>
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${isIncrease ? 'bg-green-100 text-green-700' :
                      isDecrease ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                    {platform.action === 'increase' || isIncrease ? '📈 Scale' :
                      platform.action === 'decrease' || isDecrease ? '📉 Reduce' :
                        '→ Maintain'}
                  </div>
                </div>

                {/* Budget Visualization */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Current Budget</span>
                      <span className="font-semibold text-gray-900">
                        ${platform.current_budget.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-400 rounded-full"
                        style={{ width: '100%' }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Recommended Budget</span>
                      <span className="font-semibold text-gray-900">
                        ${(platform.recommended_budget || platform.current_budget).toLocaleString()}
                        {changePct !== 0 && (
                          <span className={`ml-2 text-xs ${isIncrease ? 'text-green-600' : isDecrease ? 'text-red-600' : 'text-gray-600'
                            }`}>
                            ({changePct > 0 ? '+' : ''}{changePct.toFixed(0)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isIncrease ? 'bg-green-500' :
                            isDecrease ? 'bg-red-500' :
                              'bg-gray-400'
                          }`}
                        style={{
                          width: platform.current_budget > 0
                            ? `${Math.min(((platform.recommended_budget || platform.current_budget) / platform.current_budget * 100), 100)}%`
                            : '100%'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                {platform.reasoning && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-900">
                      <strong>💡 Why:</strong> {platform.reasoning}
                    </div>
                  </div>
                )}

                {/* Confidence Indicator */}
                {platform.confidence && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                    <span>Confidence:</span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${i < (platform.confidence === 'high' ? 5 : platform.confidence === 'medium' ? 3 : 1)
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                            }`}
                        ></div>
                      ))}
                    </div>
                    <span className="capitalize">{platform.confidence}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">Ready to optimize?</h4>
            <p className="text-sm text-gray-600 mt-1">
              Review recommendations and export for your ad platforms
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all shadow-sm">
              <Check className="w-4 h-4" />
              Apply Recommendations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetOptimizer;