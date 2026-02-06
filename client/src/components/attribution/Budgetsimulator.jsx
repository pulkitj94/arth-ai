import React, { useState, useEffect } from 'react';
import { Sliders, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';

const BudgetSimulator = ({ platformData }) => {
    const [budgets, setBudgets] = useState({});
    const [totalBudget, setTotalBudget] = useState(10000);
    const [projectedRoas, setProjectedRoas] = useState(0);

    useEffect(() => {
        if (platformData) {
            // Initialize with current budgets
            const initial = {};
            platformData.forEach(p => {
                initial[p.platform] = p.current_budget || 3000;
            });
            setBudgets(initial);

            const total = Object.values(initial).reduce((sum, val) => sum + val, 0);
            setTotalBudget(total);

            calculateProjectedRoas(initial);
        }
    }, [platformData]);

    const calculateProjectedRoas = (newBudgets) => {
        // Simple ROAS projection based on platform ROAS
        let totalSpend = 0;
        let totalRevenue = 0;

        platformData.forEach(platform => {
            const budget = newBudgets[platform.platform] || 0;
            totalSpend += budget;
            totalRevenue += budget * platform.attributed_roas;
        });

        const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
        setProjectedRoas(roas);
    };

    const handleBudgetChange = (platform, value) => {
        const newBudgets = {
            ...budgets,
            [platform]: parseInt(value) || 0
        };
        setBudgets(newBudgets);

        const total = Object.values(newBudgets).reduce((sum, val) => sum + val, 0);
        setTotalBudget(total);

        calculateProjectedRoas(newBudgets);
    };

    const handlePercentageChange = (platform, percentage) => {
        const newValue = Math.round(totalBudget * percentage / 100);
        handleBudgetChange(platform, newValue);
    };

    const resetToRecommended = () => {
        const recommended = {};
        platformData.forEach(p => {
            recommended[p.platform] = p.recommended_budget;
        });
        setBudgets(recommended);

        const total = Object.values(recommended).reduce((sum, val) => sum + val, 0);
        setTotalBudget(total);

        calculateProjectedRoas(recommended);
    };

    const resetToCurrent = () => {
        const current = {};
        platformData.forEach(p => {
            current[p.platform] = p.current_budget;
        });
        setBudgets(current);

        const total = Object.values(current).reduce((sum, val) => sum + val, 0);
        setTotalBudget(total);

        calculateProjectedRoas(current);
    };

    if (!platformData || platformData.length === 0) {
        return null;
    }

    // Calculate current ROAS for comparison
    const currentRoas = platformData.reduce((acc, p) => {
        return acc + (p.current_budget * p.attributed_roas);
    }, 0) / platformData.reduce((acc, p) => acc + p.current_budget, 0);

    const roasImprovement = ((projectedRoas - currentRoas) / currentRoas * 100);

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-purple-500" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Budget Simulator
                        </h3>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={resetToCurrent}
                            className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                        >
                            Reset to Current
                        </button>
                        <button
                            onClick={resetToRecommended}
                            className="text-sm px-3 py-1 bg-cyan-100 text-cyan-700 rounded hover:bg-cyan-200"
                        >
                            Load Recommended
                        </button>
                    </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                    Experiment with different budget allocations
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Total Budget */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Total Monthly Budget</span>
                        <span className="text-2xl font-bold text-gray-900">
                            ${totalBudget.toLocaleString()}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="5000"
                        max="50000"
                        step="500"
                        value={totalBudget}
                        onChange={(e) => {
                            const newTotal = parseInt(e.target.value);
                            setTotalBudget(newTotal);

                            // Proportionally adjust all platform budgets
                            const currentTotal = Object.values(budgets).reduce((sum, val) => sum + val, 0);
                            const ratio = newTotal / currentTotal;

                            const newBudgets = {};
                            Object.keys(budgets).forEach(platform => {
                                newBudgets[platform] = Math.round(budgets[platform] * ratio);
                            });

                            setBudgets(newBudgets);
                            calculateProjectedRoas(newBudgets);
                        }}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* Platform Sliders */}
                <div className="space-y-6">
                    {platformData.map((platform) => {
                        const budget = budgets[platform.platform] || 0;
                        const percentage = totalBudget > 0 ? (budget / totalBudget * 100) : 0;

                        const platformColors = {
                            instagram: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700' },
                            facebook: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700' },
                            google: { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-700' }
                        };

                        const colors = platformColors[platform.platform] || platformColors.instagram;

                        return (
                            <div key={platform.platform} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-3 h-3 ${colors.bg} rounded-full`}></span>
                                        <span className="text-sm font-medium text-gray-900 capitalize">
                                            {platform.platform}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            (ROAS: {platform.attributed_roas.toFixed(2)}x)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-sm font-semibold ${colors.text}`}>
                                            {percentage.toFixed(0)}%
                                        </span>
                                        <input
                                            type="number"
                                            value={budget}
                                            onChange={(e) => handleBudgetChange(platform.platform, e.target.value)}
                                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                </div>

                                <input
                                    type="range"
                                    min="0"
                                    max={totalBudget}
                                    step="100"
                                    value={budget}
                                    onChange={(e) => handleBudgetChange(platform.platform, e.target.value)}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, ${colors.bg.replace('bg-', '#')} 0%, ${colors.bg.replace('bg-', '#')} ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
                                    }}
                                />

                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Current: ${platform.current_budget.toLocaleString()}</span>
                                    <span>Recommended: ${platform.recommended_budget.toLocaleString()}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Projected Results */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Projected Outcomes</h4>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-xs text-gray-600 mb-1">Portfolio ROAS</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {projectedRoas.toFixed(2)}x
                            </div>
                            <div className={`text-xs mt-1 flex items-center ${roasImprovement >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                <TrendingUp className="w-3 h-3 mr-1" />
                                {roasImprovement > 0 ? '+' : ''}{roasImprovement.toFixed(1)}%
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-gray-600 mb-1">Monthly Revenue</div>
                            <div className="text-2xl font-bold text-gray-900">
                                ${((projectedRoas * totalBudget) / 1000).toFixed(0)}K
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Projected
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-gray-600 mb-1">Annual Impact</div>
                            <div className="text-2xl font-bold text-gray-900">
                                ${((projectedRoas - currentRoas) * totalBudget * 12 / 1000).toFixed(0)}K
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                vs Current
                            </div>
                        </div>
                    </div>

                    {/* Risk Assessment */}
                    <div className="mt-4 pt-4 border-t border-green-200">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">Risk Assessment:</span>
                            <span className={`font-medium ${Math.abs(roasImprovement) < 5 ? 'text-green-600' :
                                    Math.abs(roasImprovement) < 15 ? 'text-yellow-600' :
                                        'text-red-600'
                                }`}>
                                {Math.abs(roasImprovement) < 5 ? '🟢 Low Risk' :
                                    Math.abs(roasImprovement) < 15 ? '🟡 Moderate Risk' :
                                        '🔴 High Risk'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                            {Math.abs(roasImprovement) < 5
                                ? 'Conservative adjustment with minimal risk'
                                : Math.abs(roasImprovement) < 15
                                    ? 'Moderate changes - monitor performance closely'
                                    : 'Aggressive reallocation - test gradually'}
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <RefreshCw className="w-4 h-4" />
                        Save Scenario
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700">
                        <DollarSign className="w-4 h-4" />
                        Apply This Budget
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BudgetSimulator;