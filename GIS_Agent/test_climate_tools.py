"""
Test script for climate analysis and resilience planning tools.

This script tests all climate analysis and resilience planning tools with detailed
error handling and debugging information.
"""

import asyncio
import json
import sys
import traceback
import logging
from typing import Dict, Any, List, Callable, Awaitable
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("tools_test")

# Add the project root to Python path
sys.path.insert(0, '.')

# Import the tools
from src.tools.climate_analysis import climate_analysis_tools
from src.tools.resilience_planning import resilience_planning_tools


async def test_tool(tool_name: str, tool_func: Callable, test_args: Dict[str, Any]) -> Dict[str, Any]:
    """Test a single tool with provided arguments."""
    logger.info(f"Testing tool: {tool_name}")
    logger.info(f"Arguments: {json.dumps(test_args, indent=2)}")
    
    try:
        # Execute the tool
        start_time = asyncio.get_event_loop().time()
        result = await tool_func(test_args)
        end_time = asyncio.get_event_loop().time()
        
        # Log execution time
        execution_time = end_time - start_time
        logger.info(f"Tool execution time: {execution_time:.2f}s")
        
        # Check result
        if "error" in result and not result.get("success", False):
            logger.error(f"Tool {tool_name} failed with error: {result['error']}")
            return {"tool": tool_name, "status": "failed", "error": result.get("error"), "result": result}
        else:
            logger.info(f"Tool {tool_name} executed successfully")
            return {"tool": tool_name, "status": "success", "result": result}
    
    except Exception as e:
        logger.error(f"Exception during tool execution: {e}")
        traceback.print_exc()
        return {"tool": tool_name, "status": "exception", "error": str(e)}


async def run_all_tests() -> None:
    """Run tests for all climate analysis and resilience planning tools."""
    results = []
    
    # Test data for climate analysis tools
    climate_test_args = {
        "analyze_climate_trends": {
            "region": "Phoenix, Arizona",
            "variables": ["temperature", "precipitation"],
            "start_year": 1990,
            "end_year": 2020,
            "interval": "yearly"
        },
        "track_emissions": {
            "area": "Los Angeles, California",
            "gas_types": ["CO2", "CH4"],
            "start_date": "2010-01-01",
            "end_date": "2020-01-01",
            "source_categories": ["industrial", "transportation"]
        },
        "project_climate_scenarios": {
            "region": "Miami, Florida",
            "scenario": "RCP4.5",
            "variables": ["temperature", "sea_level"],
            "target_years": [2030, 2050],
            "baseline_period": {"start_year": 1980, "end_year": 2010}
        },
        "analyze_renewable_energy_potential": {
            "area": "Arizona",
            "energy_types": ["solar", "wind"],
            "resolution": "medium",
            "constraints": {
                "environmental": True,
                "technical": True,
                "economic": True,
                "social": False
            }
        }
    }
    
    # Test data for resilience planning tools
    resilience_test_args = {
        "assess_disaster_risk": {
            "area": "New Orleans, Louisiana",
            "hazard_types": ["flood", "hurricane"],
            "time_frame": "2050",
            "climate_scenario": "RCP4.5",
            "include_socioeconomic": True
        },
        "evaluate_infrastructure_vulnerability": {
            "area": "Seattle, Washington",
            "infrastructure_types": ["transportation", "energy"],
            "hazard_types": ["flood", "earthquake"],
            "time_horizon": "2030",
            "include_interdependencies": True
        },
        "design_adaptation_measures": {
            "area": "Florida coastline",
            "risk_types": ["sea_level_rise", "hurricane"],
            "priority_sectors": ["urban", "tourism"],
            "time_frame": "medium-term",
            "constraints": {
                "budget": "medium",
                "technical": "high",
                "social": "medium"
            }
        },
        "assess_community_resilience": {
            "community": "Houston, Texas",
            "indicators": ["social_capital", "economic_resources", "infrastructure"],
            "hazard_focus": ["hurricane", "flood"],
            "include_demographics": True,
            "comparison_regions": ["New Orleans, Louisiana"]
        }
    }
    
    # Run climate analysis tools tests
    logger.info("=== TESTING CLIMATE ANALYSIS TOOLS ===")
    for name, func_info in climate_analysis_tools.items():
        if name in climate_test_args:
            func = func_info["function"]
            args = climate_test_args[name]
            result = await test_tool(name, func, args)
            results.append(result)
        else:
            logger.warning(f"No test arguments for tool: {name}")
    
    # Run resilience planning tools tests
    logger.info("\n=== TESTING RESILIENCE PLANNING TOOLS ===")
    for name, func_info in resilience_planning_tools.items():
        if name in resilience_test_args:
            func = func_info["function"]
            args = resilience_test_args[name]
            result = await test_tool(name, func, args)
            results.append(result)
        else:
            logger.warning(f"No test arguments for tool: {name}")
    
    # Print summary
    logger.info("\n=== TEST RESULTS SUMMARY ===")
    total = len(results)
    successful = sum(1 for r in results if r["status"] == "success")
    failed = sum(1 for r in results if r["status"] == "failed")
    exceptions = sum(1 for r in results if r["status"] == "exception")
    
    logger.info(f"Total tests: {total}")
    logger.info(f"Successful: {successful}")
    logger.info(f"Failed: {failed}")
    logger.info(f"Exceptions: {exceptions}")
    
    if failed > 0 or exceptions > 0:
        logger.info("\n=== FAILED TESTS ===")
        for result in results:
            if result["status"] != "success":
                logger.info(f"Tool: {result['tool']}")
                logger.info(f"Error: {result.get('error', 'Unknown error')}")
                logger.info("")


# Run tests
if __name__ == "__main__":
    logger.info("Starting climate and resilience tools tests")
    
    # Check for specific tool to test
    if len(sys.argv) > 1:
        tool_to_test = sys.argv[1]
        logger.info(f"Testing only tool: {tool_to_test}")
        
        # Find the tool
        if tool_to_test in climate_analysis_tools:
            tool_info = climate_analysis_tools[tool_to_test]
            test_args = {
                "area": "Phoenix, Arizona",
                "region": "Phoenix, Arizona",
                "energy_types": ["solar"]
            }
            asyncio.run(test_tool(tool_to_test, tool_info["function"], test_args))
        elif tool_to_test in resilience_planning_tools:
            tool_info = resilience_planning_tools[tool_to_test]
            test_args = {
                "area": "Phoenix, Arizona",
                "community": "Phoenix, Arizona"
            }
            asyncio.run(test_tool(tool_to_test, tool_info["function"], test_args))
        else:
            logger.error(f"Tool not found: {tool_to_test}")
    else:
        # Run all tests
        asyncio.run(run_all_tests()) 