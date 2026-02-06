"""
Multi-Touch Attribution System - Main Pipeline

Runs the complete MTA pipeline from data loading to budget recommendations.

Usage:
    # Default: Last 60 days, calculate budgets
    python main.py
    
    # Custom date range
    python main.py --start-date 2024-10-01 --end-date 2024-11-30
    
    # Just attribution, no budget calculation
    python main.py --skip-budget
    
    # Custom days lookback
    python main.py --days 90
"""

import argparse
from datetime import datetime
import sys
import config
from data_loader import DataLoader
from journey_generator import JourneyGenerator
from attribution_calculator import AttributionCalculator
from platform_aggregator import PlatformAggregator
from budget_optimizer import BudgetOptimizer

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Multi-Touch Attribution System',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                                    # Default: ALL data (no date filter)
  python main.py --days 90                          # Last 90 days only
  python main.py --start-date 2024-10-01 --end-date 2024-11-30
  python main.py --skip-budget                      # Attribution only
  python main.py --skip-validation                  # Skip data validation
  python main.py --clear                            # Delete existing output files first
        """
    )
    
    parser.add_argument(
        '--days',
        type=int,
        default=None,
        help='Number of days to look back (omit to use ALL data)'
    )
    
    parser.add_argument(
        '--start-date',
        type=str,
        default=None,
        help='Start date (YYYY-MM-DD) for date filtering'
    )
    
    parser.add_argument(
        '--end-date',
        type=str,
        default=None,
        help='End date (YYYY-MM-DD) for date filtering'
    )
    
    parser.add_argument(
        '--skip-budget',
        action='store_true',
        help='Skip budget optimization (only run attribution)'
    )
    
    parser.add_argument(
        '--skip-validation',
        action='store_true',
        help='Skip data validation'
    )
    
    parser.add_argument(
        '--current-budgets',
        type=str,
        default=None,
        help='JSON string with current budgets: {"instagram": 4000, "facebook": 3000, "google": 3000}'
    )
    
    parser.add_argument(
        '--clear',
        action='store_true',
        help='Delete existing output files before running'
    )
    
    return parser.parse_args()

def main():
    """Run complete MTA pipeline."""
    args = parse_args()
    
    print("\n" + "="*70)
    print(" MULTI-TOUCH ATTRIBUTION SYSTEM")
    print("="*70)
    print(f" Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)
    
    # Show configuration
    config.print_config()
    
    try:
        # Clear existing output files if requested
        if args.clear:
            print("\n" + "="*70)
            print("CLEARING EXISTING OUTPUT FILES")
            print("="*70)
            import os
            output_path = config.ATTRIBUTION_OUTPUT_PATH
            files_to_delete = [
                'ad_sessions.csv',
                'attributed_campaigns.csv',
                'platform_summary.csv',
                'budget_recommendations.json'
            ]
            for file in files_to_delete:
                file_path = os.path.join(output_path, file)
                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"🗑️  Deleted: {file}")
            print("="*70)
        
        # ====================================================================
        # PHASE 1: DATA LOADING
        # ====================================================================
        loader = DataLoader(validate=not args.skip_validation)
        all_campaign_data = loader.load_all()
        
        # ====================================================================
        # DATE FILTERING (Optional - Default: Use ALL data)
        # ====================================================================
        use_date_filter = args.start_date or args.end_date or args.days
        
        if use_date_filter:
            # User explicitly requested date filtering
            if args.start_date and args.end_date:
                start_date = datetime.strptime(args.start_date, '%Y-%m-%d')
                end_date = datetime.strptime(args.end_date, '%Y-%m-%d')
                print(f"\n📅 Date Filter: {args.start_date} to {args.end_date}")
            elif args.days:
                start_date, end_date = config.get_date_range(days=args.days)
                print(f"\n📅 Date Filter: Last {args.days} days")
            
            # Apply date filter
            campaign_data = loader.filter_by_date_range(start_date, end_date)
            
            # Show filtered counts
            filtered_campaigns = sum(len(df) for df in campaign_data.values())
            print(f"   Campaigns after filter: {filtered_campaigns}")
        else:
            # Default: Use ALL data (no date filtering)
            campaign_data = all_campaign_data
            print(f"\n📅 Date Filter: NONE (using ALL data)")
            print(f"   Processing all {loader.summary['total_campaigns']} campaigns")
        
        # Recalculate conversions after filtering
        platform_conversions = {}
        for platform, df in campaign_data.items():
            platform_conversions[platform] = int(df['conversions'].sum()) if len(df) > 0 else 0
        
        total_conversions = sum(platform_conversions.values())
        
        if total_conversions == 0:
            print("\n❌ ERROR: No conversions found in selected date range!")
            print("   Try using --days 365 or remove date filter")
            return 1
        
        print(f"\n📊 Total conversions to process: {total_conversions:,}")
        
        # ====================================================================
        # PHASE 2: JOURNEY GENERATION
        # ====================================================================
        generator = JourneyGenerator(campaign_data, platform_conversions)
        sessions_df = generator.generate()
        
        # ====================================================================
        # PHASE 3: ATTRIBUTION CALCULATION
        # ====================================================================
        calculator = AttributionCalculator(sessions_df, campaign_data)
        attributed_campaigns = calculator.calculate()
        
        # ====================================================================
        # PHASE 4: PLATFORM AGGREGATION
        # ====================================================================
        aggregator = PlatformAggregator(attributed_campaigns)
        platform_summary = aggregator.aggregate()
        
        # ====================================================================
        # PHASE 5: BUDGET OPTIMIZATION (Optional)
        # ====================================================================
        if not args.skip_budget:
            # Parse current budgets if provided
            current_budgets = None
            if args.current_budgets:
                import json
                current_budgets = json.loads(args.current_budgets)
            
            optimizer = BudgetOptimizer(platform_summary, current_budgets)
            recommendations = optimizer.optimize()
        else:
            print("\n⏭️  Skipping budget optimization (--skip-budget flag)")
        
        # ====================================================================
        # COMPLETION
        # ====================================================================
        print("\n" + "="*70)
        print(" ✅ PIPELINE COMPLETE")
        print("="*70)
        print(f" Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("\n 📁 Output Files:")
        print(f"    • {config.get_output_path('sessions')}")
        print(f"    • {config.get_output_path('attributed_campaigns')}")
        print(f"    • {config.get_output_path('platform_summary')}")
        if not args.skip_budget:
            print(f"    • {config.get_output_path('budget_recommendations')}")
        print("="*70)
        
        return 0
        
    except Exception as e:
        print("\n" + "="*70)
        print(" ❌ ERROR")
        print("="*70)
        print(f" {str(e)}")
        print("="*70)
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
