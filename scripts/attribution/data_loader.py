"""
Phase 1: Data Loading & Validation

Loads ad campaign CSVs and validates data quality.
"""

import pandas as pd
import numpy as np
from datetime import datetime
import config

class DataLoader:
    """Load and validate ad campaign data."""
    
    def __init__(self, validate=True):
        """
        Initialize data loader.
        
        Args:
            validate: Whether to perform data validation
        """
        self.validate = validate
        self.data = {}
        self.summary = {}
    
    def load_all(self):
        """
        Load all platform ad campaign files.
        
        Returns:
            dict: Platform-specific dataframes
        """
        print("\n" + "="*70)
        print("PHASE 1: DATA LOADING & VALIDATION")
        print("="*70)
        
        for platform in ['instagram', 'facebook', 'google']:
            print(f"\n📂 Loading {platform.title()} ads...")
            self.data[platform] = self._load_platform(platform)
            print(f"✅ Loaded {len(self.data[platform])} campaigns")
        
        # Calculate summary stats (internal only)
        self._calculate_summary()
        
        print("\n" + "="*70)
        print("PHASE 1 COMPLETE")
        print("="*70)
        self._print_summary()
        
        return self.data
    
    def _load_platform(self, platform):
        """Load and validate single platform file."""
        file_path = config.get_input_path(platform)
        
        try:
            # Load CSV
            df = pd.read_csv(file_path)
            
            # Validate if enabled
            if self.validate:
                df = self._validate_data(df, platform)
            
            # Parse dates
            df['start_date'] = pd.to_datetime(df['start_date'])
            df['end_date'] = pd.to_datetime(df['end_date'])
            
            # Ensure platform column exists and is consistent
            df['platform'] = platform
            
            return df
            
        except FileNotFoundError:
            print(f"❌ ERROR: File not found: {file_path}")
            print(f"   Please ensure {config.AD_FILES[platform]} exists in {config.ADS_INPUT_PATH}")
            raise
        except Exception as e:
            print(f"❌ ERROR loading {platform} data: {str(e)}")
            raise
    
    def _validate_data(self, df, platform):
        """
        Validate data quality.
        
        Args:
            df: DataFrame to validate
            platform: Platform name for error messages
        
        Returns:
            DataFrame: Validated data
        """
        if not config.VALIDATION_CONFIG['enabled']:
            return df
        
        issues = []
        
        # Check required columns
        required = config.VALIDATION_CONFIG['required_columns']
        missing = [col for col in required if col not in df.columns]
        if missing:
            issues.append(f"Missing columns: {missing}")
        
        # Check for nulls in key fields
        key_fields = ['campaign_id', 'total_spend', 'conversions', 'revenue']
        for field in key_fields:
            if field in df.columns:
                null_count = df[field].isnull().sum()
                if null_count > 0:
                    issues.append(f"{field}: {null_count} null values")
        
        # Validate ranges
        rules = config.VALIDATION_CONFIG['rules']
        
        if 'conversions' in df.columns:
            invalid = df[df['conversions'] < rules['conversions_min']]
            if len(invalid) > 0:
                issues.append(f"conversions: {len(invalid)} rows with negative values")
                df = df[df['conversions'] >= rules['conversions_min']]
        
        if 'total_spend' in df.columns:
            invalid = df[df['total_spend'] <= rules['spend_min']]
            if len(invalid) > 0:
                issues.append(f"total_spend: {len(invalid)} rows with zero/negative values")
                df = df[df['total_spend'] > rules['spend_min']]
        
        if 'revenue' in df.columns:
            invalid = df[df['revenue'] < rules['revenue_min']]
            if len(invalid) > 0:
                issues.append(f"revenue: {len(invalid)} rows with negative values")
                df = df[df['revenue'] >= rules['revenue_min']]
        
        if 'roas' in df.columns:
            # Flag suspiciously high ROAS
            suspicious = df[df['roas'] > rules['roas_max']]
            if len(suspicious) > 0:
                issues.append(f"roas: {len(suspicious)} rows with ROAS > {rules['roas_max']}x (possible data error)")
            
            # Remove negative ROAS
            invalid = df[df['roas'] < rules['roas_min']]
            if len(invalid) > 0:
                issues.append(f"roas: {len(invalid)} rows with negative values")
                df = df[df['roas'] >= rules['roas_min']]
        
        # Print issues if any
        if issues:
            print(f"   ⚠️  Validation issues found:")
            for issue in issues:
                print(f"      - {issue}")
        else:
            print(f"   ✓ Validation passed")
        
        return df
    
    def _calculate_summary(self):
        """Calculate internal summary statistics."""
        self.summary = {
            'total_campaigns': sum(len(df) for df in self.data.values()),
            'by_platform': {}
        }
        
        for platform, df in self.data.items():
            self.summary['by_platform'][platform] = {
                'campaigns': len(df),
                'conversions': df['conversions'].sum() if 'conversions' in df.columns else 0,
                'spend': df['total_spend'].sum() if 'total_spend' in df.columns else 0,
                'revenue': df['revenue'].sum() if 'revenue' in df.columns else 0,
                'avg_roas': df['roas'].mean() if 'roas' in df.columns else 0
            }
    
    def _print_summary(self):
        """Print summary statistics (for logging only)."""
        print(f"\n📊 Data Summary:")
        print(f"   Total Campaigns: {self.summary['total_campaigns']}")
        
        for platform, stats in self.summary['by_platform'].items():
            print(f"\n   {platform.title()}:")
            print(f"      Campaigns: {stats['campaigns']}")
            print(f"      Conversions: {stats['conversions']:.0f}")
            print(f"      Spend: ${stats['spend']:,.0f}")
            print(f"      Revenue: ${stats['revenue']:,.0f}")
            print(f"      Avg ROAS: {stats['avg_roas']:.2f}x")
    
    def get_total_conversions(self):
        """Get total conversions for journey generation."""
        total = sum(
            self.summary['by_platform'][p]['conversions'] 
            for p in self.data.keys()
        )
        return int(total)
    
    def get_platform_conversions(self):
        """Get conversions by platform for weighted selection."""
        return {
            p: int(self.summary['by_platform'][p]['conversions'])
            for p in self.data.keys()
        }
    
    def filter_by_date_range(self, start_date, end_date):
        """
        Filter campaigns by date range.
        
        Args:
            start_date: Start date (datetime)
            end_date: End date (datetime)
        
        Returns:
            dict: Filtered platform dataframes
        """
        filtered_data = {}
        
        for platform, df in self.data.items():
            # Include campaigns that overlap with the date range
            mask = (
                (df['start_date'] <= end_date) & 
                (df['end_date'] >= start_date)
            )
            filtered_data[platform] = df[mask].copy()
        
        return filtered_data

# ============================================================================
# MAIN (for testing)
# ============================================================================

if __name__ == '__main__':
    loader = DataLoader(validate=True)
    data = loader.load_all()
    
    print(f"\n\nTotal conversions: {loader.get_total_conversions()}")
    print(f"By platform: {loader.get_platform_conversions()}")
