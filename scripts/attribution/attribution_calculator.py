"""
Phase 3: Time Decay Attribution Calculation

Applies Time Decay attribution model to user journeys.
Output: attributed_campaigns.csv
"""

import pandas as pd
import numpy as np
from datetime import timedelta
import config

class AttributionCalculator:
    """Calculate Time Decay attribution from session data."""
    
    def __init__(self, sessions_df, campaign_data):
        """
        Initialize attribution calculator.
        
        Args:
            sessions_df: Session-based journey data
            campaign_data: Dict of platform campaign dataframes
        """
        self.sessions_df = sessions_df
        self.campaign_data = campaign_data
        self.attribution_results = {}
    
    def calculate(self):
        """
        Calculate attribution for all journeys.
        
        Returns:
            DataFrame: Campaign-level attributed metrics
        """
        print("\n" + "="*70)
        print("PHASE 3: TIME DECAY ATTRIBUTION CALCULATION")
        print("="*70)
        
        print(f"\n⚙️  Attribution Model: Time Decay (decay factor = {config.ATTRIBUTION_CONFIG['decay_factor']})")
        print(f"   Attribution Window: {config.ATTRIBUTION_CONFIG['attribution_window_days']} days")
        
        # Initialize attribution tracking
        campaign_attribution = {}
        
        # Get unique user journeys
        user_ids = self.sessions_df['user_id'].unique()
        total_journeys = len(user_ids)
        
        print(f"\n🔄 Processing {total_journeys} journeys...")
        
        # Process each journey
        for user_id in user_ids:
            journey = self._get_user_journey(user_id)
            if journey is None:
                continue
            
            # Apply attribution window filter
            journey = self._filter_attribution_window(journey)
            
            if len(journey) == 0:
                continue
            
            # Calculate Time Decay credits
            credits = self._calculate_time_decay(journey)
            
            # Accumulate credits per campaign
            for campaign_id, credit in credits.items():
                if campaign_id not in campaign_attribution:
                    campaign_attribution[campaign_id] = {
                        'attributed_conversions': 0,
                        'attributed_revenue': 0
                    }
                
                campaign_attribution[campaign_id]['attributed_conversions'] += credit['conversions']
                campaign_attribution[campaign_id]['attributed_revenue'] += credit['revenue']
        
        # Build results dataframe
        results = self._build_results_dataframe(campaign_attribution)
        
        print(f"\n✅ Attribution calculated for {len(results)} campaigns")
        
        # Save to CSV
        output_path = config.get_output_path('attributed_campaigns')
        results.to_csv(output_path, index=False)
        print(f"\n💾 Saved to: {output_path}")
        
        self._print_summary(results)
        
        print("\n" + "="*70)
        print("PHASE 3 COMPLETE")
        print("="*70)
        
        return results
    
    def _get_user_journey(self, user_id):
        """Extract journey sessions for a user."""
        journey = self.sessions_df[
            self.sessions_df['user_id'] == user_id
        ].sort_values('session_order').copy()
        
        if len(journey) == 0 or journey['converted'].sum() == 0:
            return None
        
        return journey
    
    def _filter_attribution_window(self, journey):
        """
        Filter journey to attribution window.
        
        Only credit touchpoints within N days of conversion.
        """
        window_days = config.ATTRIBUTION_CONFIG['attribution_window_days']
        
        # Get conversion date (last session)
        conversion_date = journey[journey['converted']].iloc[0]['timestamp']
        
        # Filter to window
        cutoff_date = conversion_date - timedelta(days=window_days)
        journey = journey[journey['timestamp'] >= cutoff_date].copy()
        
        return journey
    
    def _calculate_time_decay(self, journey):
        """
        Calculate Time Decay attribution credits.
        
        Formula: credit = decay_factor^(last_position - current_position)
        
        Returns:
            dict: Campaign credits {campaign_id: {conversions, revenue}}
        """
        decay_factor = config.ATTRIBUTION_CONFIG['decay_factor']
        
        # Get conversion value
        converting_session = journey[journey['converted']].iloc[0]
        conversion_value = converting_session['conversion_value']
        
        # Calculate positions
        positions = list(range(1, len(journey) + 1))
        last_position = max(positions)
        
        # Calculate decay values
        decay_values = []
        for pos in positions:
            decay = decay_factor ** (last_position - pos)
            decay_values.append(decay)
        
        # Sum of decays
        total_decay = sum(decay_values)
        
        # Calculate credits
        credits = {}
        for idx, row in journey.iterrows():
            pos = row['session_order']
            campaign_id = row['campaign_id']
            
            # Calculate credit percentage
            credit_pct = decay_values[pos - 1] / total_decay
            
            # Calculate attributed values
            attributed_conversions = credit_pct  # Fractional conversions
            attributed_revenue = conversion_value * credit_pct
            
            if campaign_id not in credits:
                credits[campaign_id] = {
                    'conversions': 0,
                    'revenue': 0
                }
            
            credits[campaign_id]['conversions'] += attributed_conversions
            credits[campaign_id]['revenue'] += attributed_revenue
        
        return credits
    
    def _build_results_dataframe(self, campaign_attribution):
        """Build final attributed campaigns dataframe."""
        rows = []
        
        # Get all campaigns from original data
        for platform, df in self.campaign_data.items():
            for _, campaign in df.iterrows():
                campaign_id = campaign['campaign_id']
                
                # Get attributed values (or 0 if not in attribution)
                if campaign_id in campaign_attribution:
                    attr = campaign_attribution[campaign_id]
                    attributed_conversions = attr['attributed_conversions']
                    attributed_revenue = attr['attributed_revenue']
                else:
                    attributed_conversions = 0
                    attributed_revenue = 0
                
                # Last-click values
                last_click_conversions = campaign['conversions']
                last_click_revenue = campaign['revenue']
                last_click_roas = campaign['roas']
                total_spend = campaign['total_spend']
                
                # Calculate attributed metrics
                attributed_roas = attributed_revenue / total_spend if total_spend > 0 else 0
                attributed_cpa = total_spend / attributed_conversions if attributed_conversions > 0 else 0
                attributed_conv_rate = (attributed_conversions / campaign.get('clicks', 1)) * 100 if 'clicks' in campaign else 0
                
                # Calculate lifts
                conv_lift_pct = ((attributed_conversions - last_click_conversions) / last_click_conversions * 100) if last_click_conversions > 0 else 0
                revenue_lift_pct = ((attributed_revenue - last_click_revenue) / last_click_revenue * 100) if last_click_revenue > 0 else 0
                roas_lift = attributed_roas - last_click_roas
                
                row = {
                    'campaign_id': campaign_id,
                    'campaign_name': campaign['campaign_name'],
                    'platform': platform,
                    
                    # Last-click metrics
                    'last_click_conversions': round(last_click_conversions, 2),
                    'last_click_revenue': round(last_click_revenue, 2),
                    'last_click_roas': round(last_click_roas, 2),
                    
                    # Attributed metrics
                    'attributed_conversions': round(attributed_conversions, 2),
                    'attributed_revenue': round(attributed_revenue, 2),
                    'attributed_roas': round(attributed_roas, 2),
                    'attributed_cpa': round(attributed_cpa, 2),
                    'attributed_conversion_rate': round(attributed_conv_rate, 2),
                    
                    # Lifts
                    'conversion_lift_pct': round(conv_lift_pct, 2),
                    'revenue_lift_pct': round(revenue_lift_pct, 2),
                    'roas_lift': round(roas_lift, 2),
                    
                    # Other
                    'total_spend': round(total_spend, 2)
                }
                
                rows.append(row)
        
        return pd.DataFrame(rows)
    
    def _print_summary(self, results):
        """Print attribution summary."""
        print(f"\n📊 Attribution Summary:")
        
        total_lastclick_conv = results['last_click_conversions'].sum()
        total_attributed_conv = results['attributed_conversions'].sum()
        total_lastclick_rev = results['last_click_revenue'].sum()
        total_attributed_rev = results['attributed_revenue'].sum()
        
        conv_lift = ((total_attributed_conv - total_lastclick_conv) / total_lastclick_conv * 100) if total_lastclick_conv > 0 else 0
        rev_lift = ((total_attributed_rev - total_lastclick_rev) / total_lastclick_rev * 100) if total_lastclick_rev > 0 else 0
        
        print(f"   Total Conversions:")
        print(f"      Last-Click: {total_lastclick_conv:.0f}")
        print(f"      Attributed: {total_attributed_conv:.0f} ({conv_lift:+.1f}%)")
        print(f"   Total Revenue:")
        print(f"      Last-Click: ${total_lastclick_rev:,.0f}")
        print(f"      Attributed: ${total_attributed_rev:,.0f} ({rev_lift:+.1f}%)")

# ============================================================================
# MAIN (for testing)
# ============================================================================

if __name__ == '__main__':
    from data_loader import DataLoader
    from journey_generator import JourneyGenerator
    
    # Load data
    loader = DataLoader(validate=True)
    data = loader.load_all()
    platform_convs = loader.get_platform_conversions()
    
    # Generate journeys
    generator = JourneyGenerator(data, platform_convs)
    sessions_df = generator.generate()
    
    # Calculate attribution
    calculator = AttributionCalculator(sessions_df, data)
    results = calculator.calculate()
    
    print(f"\n\nSample results:")
    print(results.head())
