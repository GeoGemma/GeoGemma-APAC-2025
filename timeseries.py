# timeseries.py
import ee
import logging
import datetime
import matplotlib.pyplot as plt  # For plotting
import io  # For creating in-memory image

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def generate_time_series_data(geometry, analysis_type, start_date, end_date, satellite=None):
    """
    Generates time series data for a given location, analysis type, and date range.

    Args:
        geometry (ee.Geometry):  Region of interest.
        analysis_type (str):  "NDVI", "LST", etc.
        start_date (str):  Start date (YYYY-MM-DD).
        end_date (str):  End date (YYYY-MM-DD).
        satellite (str, optional):  Satellite to use (e.g., "Sentinel-2", "Landsat 8"). Defaults to None.

    Returns:
        list: A list of (date, value) tuples.  Returns an empty list on error.
    """
    try:
        date_range = datetime.datetime.strptime(start_date, '%Y-%m-%d'), datetime.datetime.strptime(end_date, '%Y-%m-%d')
        time_difference = date_range[1] - date_range[0]
        total_days = time_difference.days
        if total_days <= 0:
            logging.error("Invalid date range: End date must be after start date.")
            return []

        # Determine appropriate interval
        if total_days <= 365:  # One year or less
            interval = 'month'
            date_format = '%Y-%m'
            time_delta = 30  # approximation
        elif total_days <= 365 * 5:  # Five years or less
            interval = 'quarter'
            date_format = '%Y-%m'
            time_delta = 90
        else:  # More than five years
            interval = 'year'
            date_format = '%Y'
            time_delta = 365

        # Create a list of dates for time series analysis
        num_intervals = total_days // time_delta
        dates = [(date_range[0] + datetime.timedelta(days=i * time_delta)) for i in range(num_intervals)]

        time_series_data = []
        for date in dates:
            date_str = date.strftime('%Y-%m-%d')
            next_date_str = (date + datetime.timedelta(days=time_delta)).strftime('%Y-%m-%d')

            # Get data for specific analysis type
            if analysis_type == 'NDVI':
                from ee_modules import ndvi
                try:
                    image, _ = ndvi.add_sentinel_ndvi(geometry, date_str, next_date_str)
                except Exception as e:
                    logging.error(f"NDVI image creation failed for {date_str}: {e}")
                    image = None
            elif analysis_type == 'LST':
                from ee_modules import lst
                year = date.year
                try:
                    image, _ = lst.add_landsat_lst(geometry, year)
                except Exception as e:
                    logging.error(f"LST image creation failed for {date_str}: {e}")
                    image = None
            else:
                logging.error(f"Unsupported analysis type: {analysis_type}")
                return []

            if image is None:
                logging.warning(f"No image available for {analysis_type} on {date_str}")
                time_series_data.append((date.strftime(date_format), None))
                continue

            # Calculate the mean value within the geometry
            try:
                mean_dict = image.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=geometry,
                    scale=30,  # Adjust scale as needed
                    maxPixels=1e9
                ).getInfo()

                # Extract the value (NDVI, LST, etc.)
                value = list(mean_dict.values())[0] if mean_dict else None
                time_series_data.append((date.strftime(date_format), value))

                # Debug print: Show values as they are computed
                logging.info(f"Time Series Data Point: Date={date.strftime(date_format)}, Value={value}")

            except Exception as e:
                logging.error(f"Error reducing region for {analysis_type} on {date_str}: {e}")
                time_series_data.append((date.strftime(date_format), None))

        return time_series_data

    except Exception as e:
        logging.exception(f"Error generating time series data: {e}")
        return []

def plot_time_series(time_series_data, title):
    """
    Plots time series data using matplotlib and returns the plot as a PNG image.

    Args:
        time_series_data (list): A list of (date_string, value) tuples.
        title (str): The title of the plot.

    Returns:
        bytes: PNG image data, or None on error.
    """
    try:
        # Separate dates and values
        dates = [item[0] for item in time_series_data]
        values = [item[1] for item in time_series_data]

        # Convert None values to NaN for plotting
        values = [val if val is not None else float('nan') for val in values]
        # Plotting

        plt.figure(figsize=(10, 6)) #increased fig size
        plt.plot(dates, values, marker='o', linestyle='-') #plot the graph
        plt.xlabel("Date") #plot Date label
        plt.ylabel("Value") #plot value label
        plt.title(title)  #plot title

        plt.xticks(rotation=45, ha='right')# Rotated date labels for readability

        plt.tight_layout()  # Adjust layout to prevent labels from overlapping

        # Save the plot to a BytesIO object (in-memory file)
        img_buf = io.BytesIO()
        plt.savefig(img_buf, format='png')

        # Close the plot to free memory
        plt.close()

        # Return the PNG image data
        return img_buf.getvalue()

    except Exception as e:
        logging.exception(f"Error plotting time series: {e}")
        return None