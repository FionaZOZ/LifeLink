"""AED coverage analysis using H3 geospatial indexing and Buter 2024 coverage decay.

References:
- Buter, J. et al. (2024). Strategic Placement of Volunteer Responder System Defibrillators.
  Health Care Management Science. https://pmc.ncbi.nlm.nih.gov/articles/PMC11645431/
- Uber H3: https://h3geo.org
"""
import h3
from typing import Literal
from math import radians, cos, sin, asin, sqrt


# Buter et al. 2024 coverage cutoffs (Health Care Management Science)
COVERAGE_CUTOFFS = {
    "walking": 310,   # meters
    "bicycle": 710,   # meters
    "car": 470,       # meters
}

# Coverage weights for multi-modal scoring
COVERAGE_WEIGHTS = {
    "walking": 1.0,
    "bicycle": 0.7,
    "car": 0.5,
}


def coverage_score(distance_m: float, transport: Literal["walking", "bicycle", "car"]) -> float:
    """
    Compute the Buter et al. 2024 coverage decay score.

    f(d) = w * max(1 - d/r, 0)

    Args:
        distance_m: Distance to AED in meters
        transport: Transport mode ("walking", "bicycle", "car")

    Returns:
        Coverage score in [0, 1], where 1.0 = optimal coverage, 0.0 = out of range
    """
    r = COVERAGE_CUTOFFS[transport]
    w = COVERAGE_WEIGHTS[transport]
    return w * max(1 - distance_m / r, 0)


def candidate_aeds_in_h3_neighborhood(
    query_lat: float,
    query_lon: float,
    all_aeds: list,
    k_rings: int = 3,
    resolution: int = 9
) -> list:
    """
    Use H3 hexagonal indexing to find candidate AEDs in a k-ring neighborhood.
    Resolution 9 ~ 174m hex edge, so 3 rings ~ 520m.

    Args:
        query_lat: Query latitude
        query_lon: Query longitude
        all_aeds: List of AED objects with .lat and .lon attributes
        k_rings: Number of H3 rings to search (default 3)
        resolution: H3 resolution (default 9)

    Returns:
        Filtered list of AEDs within the H3 neighborhood
    """
    query_cell = h3.latlng_to_cell(query_lat, query_lon, resolution)
    neighborhood = h3.grid_disk(query_cell, k_rings)

    candidates = []
    for aed in all_aeds:
        aed_cell = h3.latlng_to_cell(aed.lat, aed.lon, resolution)
        if aed_cell in neighborhood:
            candidates.append(aed)

    return candidates


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth in meters.
    """
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371000  # Earth radius in meters
    return c * r


def get_h3_cell(lat: float, lon: float, resolution: int = 9) -> str:
    """Get H3 cell ID for a location."""
    return h3.latlng_to_cell(lat, lon, resolution)
