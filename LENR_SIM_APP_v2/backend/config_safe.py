"""
Safe mode configuration for backend to prevent memory issues
"""

import os

# Override environment variables for safe mode
os.environ['MEMORY_WARNING_THRESHOLD'] = '85.0'
os.environ['MEMORY_CRITICAL_THRESHOLD'] = '95.0'
os.environ['MEMORY_CHECK_INTERVAL'] = '30.0'
os.environ['ENABLE_TRACEMALLOC'] = 'false'
os.environ['ENABLE_AUTO_GC'] = 'true'
os.environ['LOG_LEVEL'] = 'WARNING'

# Import the main app after setting environment
from app.main import app

# Export app for uvicorn
__all__ = ['app']
