"""
Test script for the Gemini fallback functionality.

This script tests the analyze_query_with_gemini tool that provides a fallback
when no specific tool is available for a user query.
"""

import asyncio
import json
import sys
import logging
from typing import Dict, Any

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("gemini_fallback_test")

# Add the project root to Python path
sys.path.insert(0, '.')

# Import the necessary components
from src.mcp_server.tools import analyze_query_with_gemini


async def test_gemini_fallback():
    """Test the Gemini fallback functionality with various queries."""
    
    # Test queries that don't match specific tools
    test_queries = [
        "What is the impact of climate change on migration patterns?",
        "How do urban heat islands affect public health?",
        "What are the most effective strategies for wildfire prevention?",
        "How does deforestation in the Amazon affect global rainfall patterns?",
        "What is the relationship between coastal development and marine ecosystem health?"
    ]
    
    results = []
    
    # Test each query
    for query in test_queries:
        logger.info(f"Testing Gemini fallback with query: {query}")
        
        try:
            # Call the analyze_query_with_gemini function
            result = await analyze_query_with_gemini({"query": query})
            
            # Log result
            success = result.get("success", False)
            if success:
                logger.info(f"✅ Successfully analyzed query: {query}")
                logger.info(f"Analysis length: {len(result.get('analysis', ''))}")
            else:
                logger.error(f"❌ Failed to analyze query: {query}")
                logger.error(f"Error: {result.get('error', 'Unknown error')}")
            
            results.append({
                "query": query,
                "success": success,
                "analysis_length": len(result.get("analysis", ""))
            })
            
        except Exception as e:
            logger.error(f"Exception testing query '{query}': {e}")
            results.append({
                "query": query,
                "success": False,
                "error": str(e)
            })
    
    # Print summary
    logger.info("\n=== TEST RESULTS SUMMARY ===")
    total = len(results)
    successful = sum(1 for r in results if r["success"])
    failed = total - successful
    
    logger.info(f"Total tests: {total}")
    logger.info(f"Successful: {successful}")
    logger.info(f"Failed: {failed}")


if __name__ == "__main__":
    logger.info("Starting Gemini fallback test")
    asyncio.run(test_gemini_fallback()) 