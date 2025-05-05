"""
Test script to verify climate analysis and resilience planning tools are properly loaded.
"""

import json
import sys
sys.path.insert(0, '.')

# Import climate tools directly
from src.tools.climate_analysis import climate_analysis_tools
from src.tools.resilience_planning import resilience_planning_tools

def print_tools_info():
    """Print information about available tools."""
    
    # Climate analysis tools
    print("\n==== Climate Analysis Tools ====")
    for name, tool in climate_analysis_tools.items():
        print(f"Tool: {name}")
        print(f"  Description: {tool['description']}")
        print(f"  Parameters: {', '.join(tool['parameters'].keys())}")
        print()
    
    # Resilience planning tools
    print("\n==== Resilience Planning Tools ====")
    for name, tool in resilience_planning_tools.items():
        print(f"Tool: {name}")
        print(f"  Description: {tool['description']}")
        print(f"  Parameters: {', '.join(tool['parameters'].keys())}")
        print()

if __name__ == "__main__":
    print("Testing climate analysis and resilience planning tools...")
    print_tools_info()
    print("\nAll tools loaded successfully!") 