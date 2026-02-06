"""
Quick Attribution Summary

Shows key metrics in an easy-to-read format
"""

import pandas as pd
import numpy as np

def print_summary():
    """Print attribution summary."""
    
    print("\n" + "="*70)
    print("ATTRIBUTION SUMMARY")
    print("="*70)
    
    # Load data
    attributed = pd.read_csv('../data/attribution/attributed_campaigns.csv')
    platform_summary = pd.read_csv('../data/attribution/platform_summary.csv')
    sessions = pd.read_csv('../data/attribution/ad_sessions.csv')
    
    # Overall stats
    print("\n📊 OVERALL METRICS:")
    print("-"*70)
    
    total_lc_conv = attributed['last_click_conversions'].sum()
    total_attr_conv = attributed['attributed_conversions'].sum()
    total_lc_rev = attributed['last_click_revenue'].sum()
    total_attr_rev = attributed['attributed_revenue'].sum()
    total_spend = attributed['total_spend'].sum()
    
    lc_roas = total_lc_rev / total_spend if total_spend > 0 else 0
    attr_roas = total_attr_rev / total_spend if total_spend > 0 else 0
    
    print(f"Total Campaigns:        {len(attributed)}")
    print(f"Total Journeys:         {sessions['user_id'].nunique():,}")
    print(f"Total Sessions:         {len(sessions):,}")
    print(f"Avg Sessions/Journey:   {len(sessions) / sessions['user_id'].nunique():.2f}")
    
    print(f"\n{'Metric':<25} {'Last-Click':>15} {'Attributed':>15} {'Lift':>10}")
    print("-"*70)
    print(f"{'Conversions':<25} {total_lc_conv:>15,.0f} {total_attr_conv:>15,.0f} {(total_attr_conv/total_lc_conv-1)*100:>9.1f}%")
    print(f"{'Revenue':<25} ${total_lc_rev:>14,.0f} ${total_attr_rev:>14,.0f} {(total_attr_rev/total_lc_rev-1)*100:>9.1f}%")
    print(f"{'ROAS':<25} {lc_roas:>15.2f}x {attr_roas:>15.2f}x {(attr_roas/lc_roas-1)*100:>9.1f}%")
    print(f"{'Spend':<25} ${total_spend:>14,.0f} ${total_spend:>14,.0f} {'0.0%':>10}")
    
    # Platform breakdown
    print("\n📱 PLATFORM BREAKDOWN:")
    print("-"*70)
    print(f"{'Platform':<12} {'Campaigns':>10} {'Last-Click':>12} {'Attributed':>12} {'Lift':>8} {'ROAS':>8}")
    print("-"*70)
    
    for _, row in platform_summary.iterrows():
        platform = row['platform'].title()
        campaigns = len(attributed[attributed['platform'] == row['platform']])
        lc_conv = row['last_click_conversions']
        attr_conv = row['attributed_conversions']
        lift = (attr_conv / lc_conv - 1) * 100 if lc_conv > 0 else 0
        roas = row['attributed_roas']
        
        print(f"{platform:<12} {campaigns:>10} {lc_conv:>12,.0f} {attr_conv:>12,.0f} {lift:>7.1f}% {roas:>7.2f}x")
    
    # Top performers
    print("\n🏆 TOP 5 CAMPAIGNS (by Attributed ROAS):")
    print("-"*70)
    top_campaigns = attributed.nlargest(5, 'attributed_roas')[
        ['campaign_name', 'platform', 'attributed_conversions', 'attributed_roas']
    ]
    
    for idx, row in top_campaigns.iterrows():
        print(f"{row['campaign_name'][:40]:<40}")
        print(f"  Platform: {row['platform']:10s} | Conversions: {row['attributed_conversions']:>6.1f} | ROAS: {row['attributed_roas']:.2f}x")
    
    # Campaigns with biggest lift
    print("\n📈 TOP 5 UNDERVALUED CAMPAIGNS (by Attributed Lift):")
    print("-"*70)
    
    attributed['lift_pct'] = ((attributed['attributed_conversions'] - attributed['last_click_conversions']) 
                               / attributed['last_click_conversions'] * 100)
    top_lift = attributed.nlargest(5, 'lift_pct')[
        ['campaign_name', 'platform', 'last_click_conversions', 'attributed_conversions', 'lift_pct']
    ]
    
    for idx, row in top_lift.iterrows():
        if row['last_click_conversions'] > 0:  # Skip zero divisions
            print(f"{row['campaign_name'][:40]:<40}")
            print(f"  Platform: {row['platform']:10s} | Last-Click: {row['last_click_conversions']:>5.0f} | Attributed: {row['attributed_conversions']:>6.1f} | Lift: {row['lift_pct']:+.1f}%")
    
    # Journey distribution
    print("\n🛤️  JOURNEY DISTRIBUTION:")
    print("-"*70)
    
    user_sessions = sessions.groupby('user_id').size()
    
    single_touch = (user_sessions == 1).sum()
    two_touch = (user_sessions == 2).sum()
    three_plus = (user_sessions >= 3).sum()
    total = len(user_sessions)
    
    print(f"Single-touch:  {single_touch:>6,} ({single_touch/total*100:>5.1f}%)")
    print(f"Two-touch:     {two_touch:>6,} ({two_touch/total*100:>5.1f}%)")
    print(f"Three+ touch:  {three_plus:>6,} ({three_plus/total*100:>5.1f}%)")
    print(f"Total:         {total:>6,} (100.0%)")
    
    print("\n" + "="*70)

if __name__ == '__main__':
    try:
        print_summary()
    except FileNotFoundError as e:
        print(f"\n❌ ERROR: {e}")
        print("   Make sure attribution has been run first: python main.py")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
