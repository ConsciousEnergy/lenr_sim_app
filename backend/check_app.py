import os
import sys
import importlib
import inspect

print("Python Path:")
for path in sys.path:
    print(f"  - {path}")

print("\nChecking key imports:")
imports_to_check = [
    "app.routers",
    "app.core.config",
    "app.utils.logging",
    "app.physics.models",
    "fastapi",
    "uvicorn"
]

for module_name in imports_to_check:
    try:
        module = importlib.import_module(module_name)
        print(f"✓ {module_name} - Found at {inspect.getfile(module)}")
    except ImportError as e:
        print(f"✗ {module_name} - Import Error: {str(e)}")
    except Exception as e:
        print(f"? {module_name} - Other Error: {str(e)}")

# Check for app.main
try:
    from app.main import app
    print("✓ app.main successfully imported")
except ImportError as e:
    print(f"✗ app.main - Import Error: {str(e)}")
except Exception as e:
    print(f"? app.main - Other Error: {str(e)}")

# Check directory structure
print("\nChecking directory structure:")
directories = ["app", "app/routers", "app/models", "app/physics"]
for directory in directories:
    full_path = os.path.join(os.getcwd(), directory)
    if os.path.exists(full_path) and os.path.isdir(full_path):
        print(f"✓ {directory} exists at {full_path}")
    else:
        print(f"✗ {directory} does not exist at {full_path}") 