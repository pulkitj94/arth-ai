"""
Phase 2: Synthetic User Journey Generation

Generates realistic user journey data based on actual campaign conversions.
Output: ad_sessions.csv (session-based format)
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import config

class JourneyGenerator:
    """Generate synthetic user journeys from campaign data."""
    
    def __init__(self, campaign_data, platform_conversions):
        """
        Initialize journey generator.
        
        Args:
            campaign_data: Dict of platform dataframes
            platform_conversions: Dict of conversion counts per platform
        """
        self.campaign_data = campaign_data
        self.platform_conversions = platform_conversions
        self.total_conversions = sum(platform_conversions.values())
        self.sessions = []
        self.session_id = 1
        self.user_id = 10000
    
    def generate(self):
        """
        Generate all user journeys.
        
        Returns:
            DataFrame: Session-based journey data
        """
        print("\n" + "="*70)
        print("PHASE 2: SYNTHETIC JOURNEY GENERATION")
        print("="*70)
        
        # Calculate journey type distribution
        cfg = config.JOURNEY_CONFIG
        num_single = int(self.total_conversions * cfg['single_touch_pct'])
        num_two = int(self.total_conversions * cfg['two_touch_pct'])
        num_three_plus = self.total_conversions - num_single - num_two
        
        print(f"\n📊 Journey Distribution:")
        print(f"   Total conversions: {self.total_conversions}")
        print(f"   Single-touch: {num_single} ({cfg['single_touch_pct']:.0%})")
        print(f"   Two-touch: {num_two} ({cfg['two_touch_pct']:.0%})")
        print(f"   Three+ touch: {num_three_plus} ({cfg['three_plus_touch_pct']:.0%})")
        
        # Generate journeys
        print(f"\n🔄 Generating journeys...")
        self._generate_single_touch(num_single)
        self._generate_two_touch(num_two)
        self._generate_multi_touch(num_three_plus)
        
        # Convert to DataFrame
        df = pd.DataFrame(self.sessions)
        
        print(f"\n✅ Generated {len(df)} sessions for {self.total_conversions} conversions")
        print(f"   Avg sessions per journey: {len(df) / self.total_conversions:.2f}")
        
        # Save to CSV
        output_path = config.get_output_path('sessions')
        df.to_csv(output_path, index=False)
        print(f"\n💾 Saved to: {output_path}")
        
        print("\n" + "="*70)
        print("PHASE 2 COMPLETE")
        print("="*70)
        
        return df
    
    def _generate_single_touch(self, count):
        """Generate single-touch journeys."""
        for _ in range(count):
            # Select platform weighted by conversions
            platform = self._select_platform()
            
            # Select random campaign
            campaign = self._select_campaign(platform)
            
            # Get conversion value
            conv_value = self._get_conversion_value(campaign)
            
            # Create single session (converted)
            timestamp = self._random_date(campaign['end_date'])
            
            session = {
                'session_id': f"sess_{self.session_id:06d}",
                'user_id': f"user_{self.user_id:06d}",
                'platform': platform,
                'campaign_id': campaign['campaign_id'],
                'campaign_name': campaign['campaign_name'],
                'timestamp': timestamp,
                'session_order': 1,
                'converted': True,
                'conversion_value': conv_value
            }
            
            self.sessions.append(session)
            self.session_id += 1
            self.user_id += 1
    
    def _generate_two_touch(self, count):
        """Generate two-touch journeys."""
        for _ in range(count):
            # Select converting platform (last touch)
            last_platform = self._select_platform()
            
            # Select first platform (different, collapsed)
            available_platforms = [p for p in self.platform_conversions.keys() 
                                  if p != last_platform]
            if not available_platforms:
                # Fallback: use same platform
                first_platform = last_platform
            else:
                first_platform = np.random.choice(available_platforms)
            
            # Select campaigns
            last_campaign = self._select_campaign(last_platform)
            first_campaign = self._select_campaign(first_platform)
            
            # Get conversion value
            conv_value = self._get_conversion_value(last_campaign)
            
            # Create timestamps
            conversion_date = self._random_date(last_campaign['end_date'])
            days_gap = np.random.randint(
                config.JOURNEY_CONFIG['min_days_between_touches'],
                config.JOURNEY_CONFIG['max_days_between_touches']
            )
            first_date = conversion_date - timedelta(days=days_gap)
            
            # Create first session (not converted)
            self.sessions.append({
                'session_id': f"sess_{self.session_id:06d}",
                'user_id': f"user_{self.user_id:06d}",
                'platform': first_platform,
                'campaign_id': first_campaign['campaign_id'],
                'campaign_name': first_campaign['campaign_name'],
                'timestamp': first_date,
                'session_order': 1,
                'converted': False,
                'conversion_value': 0
            })
            self.session_id += 1
            
            # Create second session (converted)
            self.sessions.append({
                'session_id': f"sess_{self.session_id:06d}",
                'user_id': f"user_{self.user_id:06d}",
                'platform': last_platform,
                'campaign_id': last_campaign['campaign_id'],
                'campaign_name': last_campaign['campaign_name'],
                'timestamp': conversion_date,
                'session_order': 2,
                'converted': True,
                'conversion_value': conv_value
            })
            self.session_id += 1
            self.user_id += 1
    
    def _generate_multi_touch(self, count):
        """Generate three+ touch journeys."""
        for _ in range(count):
            # Random journey length (3 to 7)
            journey_length = np.random.randint(3, min(8, config.ATTRIBUTION_CONFIG['max_journey_length'] + 1))
            
            # Select converting platform (last touch)
            last_platform = self._select_platform()
            
            # Select earlier platforms (all different due to collapse rule)
            platforms = [last_platform]
            available = [p for p in self.platform_conversions.keys() if p != last_platform]
            
            for _ in range(journey_length - 1):
                if available:
                    p = np.random.choice(available)
                    platforms.insert(0, p)
                    available = [x for x in available if x != p]
                else:
                    break  # No more unique platforms
            
            # Select campaigns
            campaigns = [self._select_campaign(p) for p in platforms]
            
            # Get conversion value
            conv_value = self._get_conversion_value(campaigns[-1])
            
            # Create timestamps (working backwards from conversion)
            conversion_date = self._random_date(campaigns[-1]['end_date'])
            timestamps = [conversion_date]
            
            for i in range(len(platforms) - 1):
                days_gap = np.random.randint(
                    config.JOURNEY_CONFIG['min_days_between_touches'],
                    config.JOURNEY_CONFIG['max_days_between_touches']
                )
                prev_date = timestamps[0] - timedelta(days=days_gap)
                timestamps.insert(0, prev_date)
            
            # Create sessions
            for idx, (platform, campaign, timestamp) in enumerate(zip(platforms, campaigns, timestamps)):
                is_last = (idx == len(platforms) - 1)
                
                self.sessions.append({
                    'session_id': f"sess_{self.session_id:06d}",
                    'user_id': f"user_{self.user_id:06d}",
                    'platform': platform,
                    'campaign_id': campaign['campaign_id'],
                    'campaign_name': campaign['campaign_name'],
                    'timestamp': timestamp,
                    'session_order': idx + 1,
                    'converted': is_last,
                    'conversion_value': conv_value if is_last else 0
                })
                self.session_id += 1
            
            self.user_id += 1
    
    def _select_platform(self):
        """Select platform weighted by conversion count."""
        platforms = list(self.platform_conversions.keys())
        weights = list(self.platform_conversions.values())
        return np.random.choice(platforms, p=np.array(weights)/sum(weights))
    
    def _select_campaign(self, platform):
        """Select random campaign from platform."""
        df = self.campaign_data[platform]
        if len(df) == 0:
            raise ValueError(f"No campaigns available for {platform}")
        return df.sample(1).iloc[0]
    
    def _get_conversion_value(self, campaign):
        """Calculate conversion value with variance."""
        if campaign['conversions'] > 0:
            avg_value = campaign['revenue'] / campaign['conversions']
        else:
            avg_value = 100  # Default fallback
        
        # Add variance
        std_dev = avg_value * config.JOURNEY_CONFIG['conversion_value_std_pct']
        value = np.random.normal(avg_value, std_dev)
        
        return max(0, round(value, 2))  # Ensure positive
    
    def _random_date(self, base_date):
        """Generate random datetime near base date."""
        if isinstance(base_date, str):
            base_date = pd.to_datetime(base_date)
        
        # Random time within the day
        random_hours = np.random.randint(0, 24)
        random_minutes = np.random.randint(0, 60)
        
        return base_date.replace(hour=random_hours, minute=random_minutes, second=0)

# ============================================================================
# MAIN (for testing)
# ============================================================================

if __name__ == '__main__':
    from data_loader import DataLoader
    
    # Load data
    loader = DataLoader(validate=True)
    data = loader.load_all()
    platform_convs = loader.get_platform_conversions()
    
    # Generate journeys
    generator = JourneyGenerator(data, platform_convs)
    sessions_df = generator.generate()
    
    print(f"\n\nFirst 10 sessions:")
    print(sessions_df.head(10))
