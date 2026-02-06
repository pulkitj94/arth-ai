"""
Multi-Touch Attribution System Configuration

All settings in one place for easy customization.
Adapted for arth_ai project structure.
"""

import os
from datetime import datetime, timedelta

# ============================================================================
# FILE PATHS (Adapted for arth_ai structure)
# ============================================================================

# Get the script directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Input: Ad campaign CSV files (in server/data/)
ADS_INPUT_PATH = os.path.join(SCRIPT_DIR, '..', '..', 'server', 'data')

# Output: Attribution results (in server/data/attribution/)
ATTRIBUTION_OUTPUT_PATH = os.path.join(SCRIPT_DIR, '..', '..', 'server', 'data', 'attribution')

# Ensure output directory exists
os.makedirs(ATTRIBUTION_OUTPUT_PATH, exist_ok=True)

# Input file names
AD_FILES = {
    'instagram': 'instagram_ads_ad_campaigns.csv',
    'facebook': 'facebook_ads_ad_campaigns.csv',
    'google': 'google_ads_ad_campaigns.csv'
}

# Output file names
OUTPUT_FILES = {
    'sessions': 'ad_sessions.csv',
    'attributed_campaigns': 'attributed_campaigns.csv',
    'platform_summary': 'platform_summary.csv',
    'budget_recommendations': 'budget_recommendations.json'
}

# ============================================================================
# ATTRIBUTION SETTINGS
# ============================================================================

ATTRIBUTION_CONFIG = {
    # Attribution model
    'model': 'time_decay',  # Only Time Decay for now
    'decay_factor': 0.5,  # Recent touches get more credit
    
    # Time windows
    'attribution_window_days': 30,  # Only credit touches within 30 days
    'default_lookback_days': 60,  # Default data period for analysis
    
    # Journey constraints
    'max_journey_length': 7,  # Max touchpoints per journey
    'collapse_same_platform': True,  # Platform appears only once per journey
}

# ============================================================================
# JOURNEY GENERATION (Synthetic)
# ============================================================================

JOURNEY_CONFIG = {
    # Distribution of journey types
    'single_touch_pct': 0.60,  # 60% of conversions are single-touch
    'two_touch_pct': 0.30,     # 30% are two-touch
    'three_plus_touch_pct': 0.10,  # 10% are three+ touch
    
    # Time between touches
    'min_days_between_touches': 1,
    'max_days_between_touches': 14,
    'avg_days_between_touches': 3,
    
    # Conversion value variance
    'conversion_value_std_pct': 0.20,  # ±20% variance in conversion values
}

# ============================================================================
# BUDGET OPTIMIZATION
# ============================================================================

BUDGET_CONFIG = {
    # Change constraints
    'max_increase_pct': 30,  # Max 30% budget increase
    'max_decrease_pct': 30,  # Max 30% budget decrease
    'min_budget_per_platform': 500,  # Minimum $500 per platform
    
    # Decision thresholds
    'roas_threshold_increase': 1.2,  # Increase if ROAS ratio > 1.2
    'roas_threshold_decrease': 0.8,  # Decrease if ROAS ratio < 0.8
    
    # Data requirements
    'min_data_days': 30,  # Need at least 30 days of data
    'min_conversions': 50,  # Need at least 50 conversions
    'min_spend': 500,  # Need at least $500 spend
    
    # Confidence levels
    'trend_validation_days': 14,  # Trend must be consistent for 14 days
}

# ============================================================================
# DATA VALIDATION
# ============================================================================

VALIDATION_CONFIG = {
    'enabled': True,  # Enable validation
    
    # Required columns in ad CSVs
    'required_columns': [
        'campaign_id',
        'campaign_name',
        'platform',
        'start_date',
        'end_date',
        'total_spend',
        'conversions',
        'revenue',
        'roas'
    ],
    
    # Validation rules
    'rules': {
        'conversions_min': 0,
        'spend_min': 0,
        'revenue_min': 0,
        'roas_min': 0,
        'roas_max': 50,  # Flag if ROAS > 50x (likely data error)
    }
}

# ============================================================================
# DATE RANGE HELPERS
# ============================================================================

def get_date_range(days=None, start_date=None, end_date=None):
    """
    Get date range for attribution calculation.
    
    Args:
        days: Number of days to look back (default: 60)
        start_date: Custom start date (YYYY-MM-DD)
        end_date: Custom end date (YYYY-MM-DD)
    
    Returns:
        tuple: (start_date, end_date) as datetime objects
    """
    if start_date and end_date:
        # Custom date range
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
    elif days:
        # Last N days
        end = datetime.now()
        start = end - timedelta(days=days)
    else:
        # Default: last 60 days
        end = datetime.now()
        start = end - timedelta(days=ATTRIBUTION_CONFIG['default_lookback_days'])
    
    return start, end

# ============================================================================
# LOGGING
# ============================================================================

LOGGING_CONFIG = {
    'enabled': True,
    'level': 'INFO',  # DEBUG, INFO, WARNING, ERROR
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
}

# ============================================================================
# PLATFORM MAPPINGS
# ============================================================================

PLATFORM_NAMES = {
    'instagram': 'Instagram',
    'facebook': 'Facebook',
    'google': 'Google'
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_input_path(platform):
    """Get full path to input ad CSV file."""
    return os.path.join(ADS_INPUT_PATH, AD_FILES[platform])

def get_output_path(file_type):
    """Get full path to output file."""
    return os.path.join(ATTRIBUTION_OUTPUT_PATH, OUTPUT_FILES[file_type])

def print_config():
    """Print current configuration for debugging."""
    print("=" * 70)
    print("MULTI-TOUCH ATTRIBUTION CONFIGURATION")
    print("=" * 70)
    print(f"Input Path: {ADS_INPUT_PATH}")
    print(f"Output Path: {ATTRIBUTION_OUTPUT_PATH}")
    print(f"\nAttribution Model: {ATTRIBUTION_CONFIG['model']}")
    print(f"Decay Factor: {ATTRIBUTION_CONFIG['decay_factor']}")
    print(f"Attribution Window: {ATTRIBUTION_CONFIG['attribution_window_days']} days")
    print(f"Default Lookback: {ATTRIBUTION_CONFIG['default_lookback_days']} days")
    print(f"\nJourney Distribution: {JOURNEY_CONFIG['single_touch_pct']:.0%} / {JOURNEY_CONFIG['two_touch_pct']:.0%} / {JOURNEY_CONFIG['three_plus_touch_pct']:.0%}")
    print(f"\nBudget Constraints: ±{BUDGET_CONFIG['max_increase_pct']}% max change")
    print(f"Min Budget: ${BUDGET_CONFIG['min_budget_per_platform']}")
    print("=" * 70)

if __name__ == '__main__':
    print_config()
