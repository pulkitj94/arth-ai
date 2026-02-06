"""
Phase 4: Platform-Level Aggregation

Aggregates campaign-level attribution to platform level.
Output: platform_summary.csv
"""

import pandas as pd
import config

class PlatformAggregator:
    """Aggregate attribution results to platform level."""
    
    def __init__(self, attributed_campaigns_df):
        """
        Initialize aggregator.
        
        Args:
            attributed_campaigns_df: Campaign-level attribution results
        """
        self.campaigns = attributed_campaigns_df
    
    def aggregate(self):
        """
        Aggregate to platform level.
        
        Returns:
            DataFrame: Platform-level summary
        """
        print("\n" + "="*70)
        print("PHASE 4: PLATFORM AGGREGATION")
        print("="*70)
        
        platforms = []
        
        for platform in self.campaigns['platform'].unique():
            platform_data = self.campaigns[self.campaigns['platform'] == platform]
            
            summary = self._aggregate_platform(platform, platform_data)
            platforms.append(summary)
        
        results = pd.DataFrame(platforms)
        
        # Save to CSV
        output_path = config.get_output_path('platform_summary')
        results.to_csv(output_path, index=False)
        print(f"\n💾 Saved to: {output_path}")
        
        self._print_summary(results)
        
        print("\n" + "="*70)
        print("PHASE 4 COMPLETE")
        print("="*70)
        
        return results
    
    def _aggregate_platform(self, platform, data):
        """Aggregate single platform."""
        # Sum metrics
        last_click_conversions = data['last_click_conversions'].sum()
        last_click_revenue = data['last_click_revenue'].sum()
        attributed_conversions = data['attributed_conversions'].sum()
        attributed_revenue = data['attributed_revenue'].sum()
        total_spend = data['total_spend'].sum()
        
        # Calculate ROAS
        last_click_roas = last_click_revenue / total_spend if total_spend > 0 else 0
        attributed_roas = attributed_revenue / total_spend if total_spend > 0 else 0
        
        # Calculate lifts
        conv_lift_pct = ((attributed_conversions - last_click_conversions) / last_click_conversions * 100) if last_click_conversions > 0 else 0
        revenue_lift_pct = ((attributed_revenue - last_click_revenue) / last_click_revenue * 100) if last_click_revenue > 0 else 0
        roas_lift = attributed_roas - last_click_roas
        
        return {
            'platform': platform,
            'num_campaigns': len(data),
            
            # Last-click
            'last_click_conversions': round(last_click_conversions, 2),
            'last_click_revenue': round(last_click_revenue, 2),
            'last_click_roas': round(last_click_roas, 2),
            
            # Attributed
            'attributed_conversions': round(attributed_conversions, 2),
            'attributed_revenue': round(attributed_revenue, 2),
            'attributed_roas': round(attributed_roas, 2),
            
            # Lifts
            'conversion_lift_pct': round(conv_lift_pct, 2),
            'revenue_lift_pct': round(revenue_lift_pct, 2),
            'roas_lift': round(roas_lift, 2),
            
            # Spend
            'total_spend': round(total_spend, 2)
        }
    
    def _print_summary(self, results):
        """Print platform summary."""
        print(f"\n📊 Platform Summary:")
        
        for _, row in results.iterrows():
            print(f"\n   {row['platform'].title()}:")
            print(f"      Campaigns: {row['num_campaigns']}")
            print(f"      Last-Click ROAS: {row['last_click_roas']:.2f}x")
            print(f"      Attributed ROAS: {row['attributed_roas']:.2f}x ({row['roas_lift']:+.2f}x)")
            print(f"      Conversion Lift: {row['conversion_lift_pct']:+.1f}%")
            print(f"      Revenue Lift: {row['revenue_lift_pct']:+.1f}%")

# ============================================================================
# MAIN (for testing)
# ============================================================================

if __name__ == '__main__':
    # Load attributed campaigns
    input_path = config.get_output_path('attributed_campaigns')
    campaigns = pd.read_csv(input_path)
    
    # Aggregate
    aggregator = PlatformAggregator(campaigns)
    summary = aggregator.aggregate()
    
    print(f"\n\nPlatform Summary:")
    print(summary)
