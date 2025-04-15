# __init__.py (ee_modules) -  It correctly defines the package.
from . import rgb
from . import ndvi
from . import water
from . import lulc
from . import lst
from . import openbuildings

__all__ = ["rgb", "ndvi", "water", "lulc", "lst", "openbuildings"]