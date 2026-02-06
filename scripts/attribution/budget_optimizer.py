"""
Phase 5: Budget Optimization

Generates budget recommendations based on attributed ROAS.
Output: budget_recommendations.json
"""

import pandas as pd
import json
from datetime import datetime
import config

class BudgetOptimizer:
    """Generate budget recommendations from attribution data."""
    
    def __init__(self, platform_summary_df, current_budgets=None):
        """
        Initialize budget optimizer.
        
        Args:
            platform_summary_df: Platform-level attribution summary
            current_budgets: Dict of current budgets per platform (optional)
        """
        self.platform_summary = platform_summary_df
        self.current_budgets = current_budgets or self._estimate_budgets()
    
    def optimize(self):
        """
        Generate budget recommendations.
        
        Returns:
            dict: Budget recommendations
        """
        print("\n" + "="*70)
        print("PHASE 5: BUDGET OPTIMIZATION")
        print("="*70)
        
        print(f"\n⚙️  Configuration:")
        print(f"   Max change: ±{config.BUDGET_CONFIG['max_increase_pct']}%")
        print(f"   Min budget: ${config.BUDGET_CONFIG['min_budget_per_platform']}")
        print(f"   ROAS thresholds: {config.BUDGET_CONFIG['roas_threshold_increase']:.2f} / {config.BUDGET_CONFIG['roas_threshold_decrease']:.2f}")
        
        # Calculate average ROAS (benchmark)
        total_revenue = self.platform_summary['attributed_revenue'].sum()
        total_spend = self.platform_summary['total_spend'].sum()
        avg_roas = total_revenue / total_spend if total_spend > 0 else 0
        
        print(f"\n📊 Portfolio Metrics:")
        print(f"   Total Spend: ${total_spend:,.0f}")
        print(f"   Total Revenue: ${total_revenue:,.0f}")
        print(f"   Average ROAS: {avg_roas:.2f}x (benchmark)")
        
        # Generate recommendations per platform
        recommendations = []
        total_current_budget = sum(self.current_budgets.values())
        
        print(f"\n🔄 Analyzing platforms...")
        
        for _, row in self.platform_summary.iterrows():
            platform = row['platform']
            rec = self._optimize_platform(platform, row, avg_roas)
            recommendations.append(rec)
            
            print(f"\n   {platform.title()}:")
            print(f"      Current: ${rec['current_budget']:,.0f}")
            print(f"      Recommended: ${rec['recommended_budget']:,.0f} ({rec['change_pct']:+.1f}%)")
            print(f"      Action: {rec['action'].upper()}")
        
        # Build final recommendation object
        result = {
            'calculation_date': datetime.now().strftime('%Y-%m-%d'),
            'total_budget': total_current_budget,
            'average_attributed_roas': round(avg_roas, 2),
            'platforms': recommendations,
            'expected_impact': self._calculate_expected_impact(recommendations, avg_roas)
        }
        
        # Save to JSON
        output_path = config.get_output_path('budget_recommendations')
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        print(f"\n💾 Saved to: {output_path}")
        
        print("\n" + "="*70)
        print("PHASE 5 COMPLETE")
        print("="*70)
        
        return result
    
    def _estimate_budgets(self):
        """Estimate current budgets from spend data."""
        # If no budgets provided, use recent spend as proxy
        budgets = {}
        for _, row in self.platform_summary.iterrows():
            budgets[row['platform']] = row['total_spend']
        return budgets
    
    def _optimize_platform(self, platform, data, avg_roas):
        """Generate recommendation for single platform."""
        current_budget = self.current_budgets.get(platform, data['total_spend'])
        attributed_roas = data['attributed_roas']
        
        # Calculate ROAS ratio
        roas_ratio = attributed_roas / avg_roas if avg_roas > 0 else 1.0
        
        cfg = config.BUDGET_CONFIG
        
        # Determine action based on ROAS ratio
        if roas_ratio > cfg['roas_threshold_increase']:
            action = 'increase'
            change_pct = cfg['max_increase_pct']
            reasoning = f"Attributed ROAS ({attributed_roas:.2f}x) is {(roas_ratio - 1) * 100:.0f}% above platform average ({avg_roas:.2f}x)"
        elif roas_ratio < cfg['roas_threshold_decrease']:
            action = 'decrease'
            change_pct = -cfg['max_decrease_pct']
            reasoning = f"Attributed ROAS ({attributed_roas:.2f}x) is {(1 - roas_ratio) * 100:.0f}% below platform average ({avg_roas:.2f}x)"
        else:
            action = 'maintain'
            change_pct = 0
            reasoning = f"Attributed ROAS ({attributed_roas:.2f}x) is near platform average ({avg_roas:.2f}x)"
        
        # Calculate new budget
        recommended_budget = current_budget * (1 + change_pct / 100)
        
        # Apply minimum budget constraint
        recommended_budget = max(recommended_budget, cfg['min_budget_per_platform'])
        
        # Recalculate actual change
        actual_change = recommended_budget - current_budget
        actual_change_pct = (actual_change / current_budget * 100) if current_budget > 0 else 0
        
        # Determine confidence
        if data['attributed_conversions'] >= cfg['min_conversions']:
            confidence = 'high'
        elif data['attributed_conversions'] >= cfg['min_conversions'] / 2:
            confidence = 'medium'
        else:
            confidence = 'low'
            reasoning += f" (Note: Only {data['attributed_conversions']:.0f} conversions, below minimum threshold)"
        
        return {
            'platform': platform,
            'current_budget': round(current_budget, 2),
            'recommended_budget': round(recommended_budget, 2),
            'change_amount': round(actual_change, 2),
            'change_pct': round(actual_change_pct, 2),
            'action': action,
            'attributed_roas': round(attributed_roas, 2),
            'roas_ratio': round(roas_ratio, 2),
            'confidence': confidence,
            'reasoning': reasoning
        }
    
    def _calculate_expected_impact(self, recommendations, current_avg_roas):
        """Calculate expected impact of budget changes."""
        # Simplified projection
        # Assume ROAS stays constant per platform
        
        current_total_spend = sum(r['current_budget'] for r in recommendations)
        new_total_spend = sum(r['recommended_budget'] for r in recommendations)
        
        # Calculate weighted ROAS
        current_weighted_roas = 0
        new_weighted_roas = 0
        
        for rec in recommendations:
            platform_data = self.platform_summary[
                self.platform_summary['platform'] == rec['platform']
            ].iloc[0]
            
            platform_roas = platform_data['attributed_roas']
            
            current_weight = rec['current_budget'] / current_total_spend if current_total_spend > 0 else 0
            new_weight = rec['recommended_budget'] / new_total_spend if new_total_spend > 0 else 0
            
            current_weighted_roas += platform_roas * current_weight
            new_weighted_roas += platform_roas * new_weight
        
        improvement_pct = ((new_weighted_roas - current_weighted_roas) / current_weighted_roas * 100) if current_weighted_roas > 0 else 0
        
        return {
            'current_portfolio_roas': round(current_avg_roas, 2),
            'projected_portfolio_roas': round(new_weighted_roas, 2),
            'improvement_pct': round(improvement_pct, 2),
            'current_total_budget': round(current_total_spend, 2),
            'recommended_total_budget': round(new_total_spend, 2)
        }

# ============================================================================
# MAIN (for testing)
# ============================================================================

if __name__ == '__main__':
    # Load platform summary
    input_path = config.get_output_path('platform_summary')
    summary = pd.read_csv(input_path)
    
    # Example current budgets
    current_budgets = {
        'instagram': 4000,
        'facebook': 3000,
        'google': 3000
    }
    
    # Optimize
    optimizer = BudgetOptimizer(summary, current_budgets)
    recommendations = optimizer.optimize()
    
    print(f"\n\nRecommendations:")
    print(json.dumps(recommendations, indent=2))
