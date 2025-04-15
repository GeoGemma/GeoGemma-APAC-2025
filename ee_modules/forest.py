import ee
import logging
from typing import Tuple, Dict, Optional, Union, Any

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def add_forest_cover(geometry, year=2020):
    """
    Add forest cover layer using Hansen Global Forest Change dataset.
    
    Args:
        geometry: The region of interest
        year: Year for forest cover (2000-2022)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Clamp year to available range
        year = max(2000, min(year, 2022))
        
        # Get the Hansen Global Forest Change dataset
        gfc = ee.Image('UMD/hansen/global_forest_change_2022_v1_10')
        
        # Extract tree cover for the year 2000 (baseline)
        treecover2000 = gfc.select(['treecover2000']).clip(geometry)
        
        # Extract yearly tree loss
        # Calculate total loss up to the specified year
        loss_year = gfc.select(['lossyear'])
        
        # Create mask for loss up to the specified year
        # lossyear is 0 for no loss, or 1-22 for the year of loss (1=2001, 22=2022)
        year_offset = year - 2000
        loss_mask = loss_year.lte(year_offset).and(loss_year.gt(0))
        
        # Apply the loss mask to 2000 tree cover
        forest_cover = treecover2000.where(loss_mask, 0)
        
        # Define visualization parameters
        vis_params = {
            'min': 0,
            'max': 100,
            'palette': ['000000', '005500', '00AA00', '00FF00']
        }
        
        return forest_cover, vis_params
        
    except Exception as e:
        logging.error(f"Error processing forest cover: {e}")
        return None, None

def add_forest_loss(geometry, start_year=2010, end_year=2020):
    """
    Add forest loss layer using Hansen Global Forest Change dataset.
    
    Args:
        geometry: The region of interest
        start_year: Starting year for forest loss (2001-2022)
        end_year: Ending year for forest loss (2001-2022)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Clamp years to available range
        start_year = max(2001, min(start_year, 2022))
        end_year = max(2001, min(end_year, 2022))
        
        # Make sure end_year is after start_year
        if end_year < start_year:
            end_year = start_year
        
        # Get the Hansen Global Forest Change dataset
        gfc = ee.Image('UMD/hansen/global_forest_change_2022_v1_10')
        
        # Extract the loss year band
        loss_year = gfc.select(['lossyear']).clip(geometry)
        
        # Convert loss year to actual year (1=2001, 2=2002, etc.)
        loss_year = loss_year.add(2000)
        
        # Create mask for loss during specified period
        loss_mask = loss_year.gte(start_year).and(loss_year.lte(end_year))
        
        # Apply mask to get binary loss map
        forest_loss = loss_mask.selfMask()
        
        # Define visualization parameters
        vis_params = {
            'palette': ['FF0000']
        }
        
        return forest_loss, vis_params
        
    except Exception as e:
        logging.error(f"Error processing forest loss: {e}")
        return None, None

def add_forest_gain(geometry):
    """
    Add forest gain layer using Hansen Global Forest Change dataset.
    
    Args:
        geometry: The region of interest
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Get the Hansen Global Forest Change dataset
        gfc = ee.Image('UMD/hansen/global_forest_change_2022_v1_10')
        
        # Extract the gain band (binary - 0 or 1)
        forest_gain = gfc.select(['gain']).clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'palette': ['00FF00']
        }
        
        return forest_gain, vis_params
        
    except Exception as e:
        logging.error(f"Error processing forest gain: {e}")
        return None, None

def add_forest_change(geometry, start_year=2010, end_year=2020):
    """
    Add forest change layer (loss and gain) using Hansen Global Forest Change dataset.
    
    Args:
        geometry: The region of interest
        start_year: Starting year for forest loss (2001-2022)
        end_year: Ending year for forest loss (2001-2022)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Clamp years to available range
        start_year = max(2001, min(start_year, 2022))
        end_year = max(2001, min(end_year, 2022))
        
        # Make sure end_year is after start_year
        if end_year < start_year:
            end_year = start_year
        
        # Get the Hansen Global Forest Change dataset
        gfc = ee.Image('UMD/hansen/global_forest_change_2022_v1_10')
        
        # Extract the loss year band and gain band
        loss_year = gfc.select(['lossyear'])
        gain = gfc.select(['gain'])
        
        # Convert loss year to actual year (1=2001, 2=2002, etc.)
        loss_year = loss_year.add(2000)
        
        # Create loss mask for specified period
        loss_mask = loss_year.gte(start_year).and(loss_year.lte(end_year))
        
        # Create composite image showing:
        # 1 = loss only, 2 = gain only, 3 = both loss and gain
        loss_only = loss_mask.eq(1).and(gain.eq(0)).multiply(1)
        gain_only = loss_mask.eq(0).and(gain.eq(1)).multiply(2)
        both = loss_mask.eq(1).and(gain.eq(1)).multiply(3)
        
        forest_change = loss_only.add(gain_only).add(both).clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': 1,
            'max': 3,
            'palette': ['FF0000', '00FF00', 'FFFF00']
        }
        
        return forest_change, vis_params
        
    except Exception as e:
        logging.error(f"Error processing forest change: {e}")
        return None, None

def add_tree_cover_percentage(geometry, year=2020, tree_threshold=30):
    """
    Add tree cover percentage layer using Hansen Global Forest Change dataset.
    
    Args:
        geometry: The region of interest
        year: Year for forest cover (2000-2022)
        tree_threshold: Minimum tree cover percentage to be considered forest (0-100)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Get forest cover
        forest_cover, _ = add_forest_cover(geometry, year)
        if forest_cover is None:
            return None, None
        
        # Apply threshold to get binary forest map
        forest_mask = forest_cover.gte(tree_threshold)
        
        # Create visualization with original percentage but only in forested areas
        forest_percentage = forest_cover.updateMask(forest_mask)
        
        # Define visualization parameters
        vis_params = {
            'min': tree_threshold,
            'max': 100,
            'palette': ['006400', '00ff00']
        }
        
        return forest_percentage, vis_params
        
    except Exception as e:
        logging.error(f"Error processing tree cover percentage: {e}")
        return None, None

def calculate_forest_stats(image: ee.Image, geometry: ee.Geometry, year) -> Dict[str, Any]:
    """Calculate forest statistics for an image within a geometry."""
    try:
        # Get the Hansen Global Forest Change dataset
        gfc = ee.Image('UMD/hansen/global_forest_change_2022_v1_10')
        
        # Extract tree cover for 2000 (baseline)
        treecover2000 = gfc.select(['treecover2000'])
        
        # Extract loss year
        loss_year = gfc.select(['lossyear'])
        
        # Calculate total area
        total_area = geometry.area().divide(10000)  # convert to hectares
        
        # Calculate forest area in 2000
        forest_2000 = treecover2000.gt(30)  # 30% threshold
        forest_area_2000 = forest_2000.multiply(ee.Image.pixelArea()).divide(10000)
        forest_stats_2000 = forest_area_2000.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=geometry,
            scale=30,
            maxPixels=1e9
        ).get('treecover2000')
        
        # Calculate forest loss up to specified year
        year_offset = year - 2000
        loss_mask = loss_year.lte(year_offset).and(loss_year.gt(0))
        forest_loss = forest_2000.and(loss_mask)
        forest_loss_area = forest_loss.multiply(ee.Image.pixelArea()).divide(10000)
        forest_loss_stats = forest_loss_area.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=geometry,
            scale=30,
            maxPixels=1e9
        ).get('treecover2000')
        
        # Calculate current forest area
        forest_current = forest_2000.and(loss_mask.Not())
        forest_area_current = forest_current.multiply(ee.Image.pixelArea()).divide(10000)
        forest_stats_current = forest_area_current.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=geometry,
            scale=30,
            maxPixels=1e9
        ).get('treecover2000')
        
        # Get the actual values
        total_area_value = total_area.getInfo()
        forest_area_2000_value = forest_stats_2000.getInfo()
        forest_loss_value = forest_loss_stats.getInfo()
        forest_area_current_value = forest_stats_current.getInfo()
        
        return {
            'total_area_ha': total_area_value,
            'forest_area_2000_ha': forest_area_2000_value,
            'forest_loss_ha': forest_loss_value,
            'forest_area_current_ha': forest_area_current_value,
            'forest_cover_2000_percent': (forest_area_2000_value / total_area_value) * 100 if total_area_value > 0 else 0,
            'forest_cover_current_percent': (forest_area_current_value / total_area_value) * 100 if total_area_value > 0 else 0,
            'forest_loss_percent': (forest_loss_value / forest_area_2000_value) * 100 if forest_area_2000_value > 0 else 0
        }
    except Exception as e:
        logging.error(f"Error calculating forest stats: {e}")
        return None 