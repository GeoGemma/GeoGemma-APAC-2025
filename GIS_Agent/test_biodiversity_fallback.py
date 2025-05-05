"""
Test script for the biodiversity fallback functionality.

This script tests that the analyze_query_with_gemini tool properly handles biodiversity queries
with enhanced context.
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
logger = logging.getLogger("biodiversity_fallback_test")

# Add the project root to Python path
sys.path.insert(0, '.')

# Import the necessary components
from src.mcp_server.tools import analyze_query_with_gemini


async def test_biodiversity_fallback():
    """Test the biodiversity fallback functionality with various queries."""
    
    # Test biodiversity-specific queries
    test_queries = [
        "What is the biodiversity in Costa Rica?",
        "Describe the endemic species in Madagascar",
        "How diverse is the coral reef ecosystem in the Great Barrier Reef?",
        "What threatened species are found in the Amazon rainforest?",
        "Compare the biodiversity of Borneo and Sumatra"
    ]
    
    results = []
    
    # Test each query
    for query in test_queries:
        logger.info(f"Testing biodiversity fallback with query: {query}")
        
        try:
            # Call the analyze_query_with_gemini function
            result = await analyze_query_with_gemini({"query": query})
            
            # Log result
            success = result.get("success", False)
            if success:
                logger.info(f"✅ Successfully analyzed biodiversity query: {query}")
                analysis = result.get("analysis", "")
                logger.info(f"Analysis length: {len(analysis)}")
                
                # Check if the analysis contains expected biodiversity terms
                biodiversity_terms = ["species", "endemic", "ecosystem", "threatened", "protected"]
                terms_found = [term for term in biodiversity_terms if term in analysis.lower()]
                logger.info(f"Biodiversity terms found: {terms_found}")
                
            else:
                logger.error(f"❌ Failed to analyze biodiversity query: {query}")
                logger.error(f"Error: {result.get('error', 'Unknown error')}")
            
            results.append({
                "query": query,
                "success": success,
                "analysis_length": len(result.get("analysis", "")),
                "biodiversity_terms_found": len([term for term in biodiversity_terms if term in analysis.lower()]) if success else 0
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
    
    if successful > 0:
        avg_terms = sum(r.get("biodiversity_terms_found", 0) for r in results if r["success"]) / successful
        logger.info(f"Average biodiversity terms found: {avg_terms:.2f}")


if __name__ == "__main__":
    logger.info("Starting biodiversity fallback test")
    asyncio.run(test_biodiversity_fallback()) 