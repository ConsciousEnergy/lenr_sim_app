#!/usr/bin/env python3
"""
CLI script for migrating LENR Simulation data from v1 to v2.
"""

import argparse
import logging
import os
import sys
from pathlib import Path

from ..utils.migration_v1_to_v2 import migrate_to_v2

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Migrate LENR Simulation data from v1 to v2"
    )
    
    parser.add_argument(
        "--source-dir",
        required=True,
        help="Directory containing v1 files"
    )
    
    parser.add_argument(
        "--config",
        required=True,
        help="Path to v1 configuration file"
    )
    
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Directory for v2 output"
    )
    
    parser.add_argument(
        "--backup-dir",
        help="Optional backup directory path"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    
    return parser.parse_args()

def validate_paths(args):
    """Validate input paths."""
    # Check source directory
    if not os.path.isdir(args.source_dir):
        logger.error(f"Source directory does not exist: {args.source_dir}")
        return False
        
    # Check config file
    if not os.path.isfile(args.config):
        logger.error(f"Configuration file does not exist: {args.config}")
        return False
        
    # Create output directory if needed
    try:
        Path(args.output_dir).mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.error(f"Failed to create output directory: {str(e)}")
        return False
        
    return True

def main():
    """Main entry point."""
    args = parse_args()
    
    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Validate paths
    if not validate_paths(args):
        sys.exit(1)
    
    try:
        # Run migration
        migrate_to_v2(
            source_dir=args.source_dir,
            config_path=args.config,
            output_dir=args.output_dir,
            backup_dir=args.backup_dir
        )
        
        logger.info("Migration completed successfully!")
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 