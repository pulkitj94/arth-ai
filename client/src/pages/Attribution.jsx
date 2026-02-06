import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Target, Zap, RefreshCw } from 'lucide-react';
import AttributionInsights from '../components/attribution/AttributionInsights';
import BudgetOptimizer from '../components/attribution/BudgetOptimizer';

const Attribution = () => {
  const [activeTab, setActiveTab] = useState('insights');
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [status, setStatus] = useState(null);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/attribution/status');
      const data = await response.json();
      setStatus(data);
      if (data.lastCalculated) {
        setLastUpdated(new Date(data.lastCalculated));
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleRecalculate = async () => {
    setIsCalculating(true);
    try {
      const response = await fetch('http://localhost:3001/api/attribution/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('✅ Attribution calculated successfully!');
        fetchStatus();
        // Refresh the current tab
        window.location.reload();
      } else {
        alert('❌ Calculation failed: ' + result.error);
      }
    } catch (error) {
      console.error('Error calculating attribution:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Multi-Touch Attribution
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Understand true campaign value across customer journeys
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-sm text-gray-600">
                Last Updated: {lastUpdated.toLocaleString()}
              </div>
            )}
            
            {/* Recalculate Button */}
            <button
              onClick={handleRecalculate}
              disabled={isCalculating}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
              {isCalculating ? 'Calculating...' : 'Recalculate'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('insights')}
            className={`pb-3 px-1 font-medium text-sm transition-colors relative ${
              activeTab === 'insights'
                ? 'text-cyan-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Attribution Insights
            </div>
            {activeTab === 'insights' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('budget')}
            className={`pb-3 px-1 font-medium text-sm transition-colors relative ${
              activeTab === 'budget'
                ? 'text-cyan-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Budget Optimizer
            </div>
            {activeTab === 'budget' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600"></div>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-8">
        {!status?.ready ? (
          // Show empty state if no data
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Attribution Data Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Run the attribution calculation to analyze your campaign performance
                and get budget recommendations.
              </p>
              <button
                onClick={handleRecalculate}
                disabled={isCalculating}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 shadow-sm"
              >
                <Zap className="w-5 h-5" />
                {isCalculating ? 'Calculating...' : 'Calculate Attribution'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'insights' && <AttributionInsights />}
            {activeTab === 'budget' && <BudgetOptimizer />}
          </>
        )}
      </div>
    </div>
  );
};

export default Attribution;
