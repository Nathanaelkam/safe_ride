import math
from typing import List, Tuple

EARTH_RADIUS = 6371000.0  # Earth radius in meters

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in meters."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    return 2 * EARTH_RADIUS * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the initial bearing from point 1 to point 2 in radians."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    l1, l2 = math.radians(lon1), math.radians(lon2)
    y = math.sin(l2 - l1) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(l2 - l1)
    return math.atan2(y, x)

def cross_track_distance(lat_p: float, lon_p: float, lat_a: float, lon_a: float, lat_b: float, lon_b: float) -> float:
    """
    Calculate cross-track error (distance in meters) from point p to the path segment between a and b.
    """
    dist_ap = haversine(lat_a, lon_a, lat_p, lon_p) / EARTH_RADIUS
    brg_ap = bearing(lat_a, lon_a, lat_p, lon_p)
    brg_ab = bearing(lat_a, lon_a, lat_b, lon_b)
    
    return abs(math.asin(math.sin(dist_ap) * math.sin(brg_ap - brg_ab)) * EARTH_RADIUS)

def min_distance_to_route(lat: float, lng: float, route: List[Tuple[float, float]]) -> float:
    """Find the minimum distance in meters from live coordinate to any segment of the intended route."""
    if not route or len(route) < 2:
        return 0.0

    min_dist = float('inf')
    for i in range(len(route) - 1):
        lat_a, lon_a = route[i]
        lat_b, lon_b = route[i+1]
        
        # Distances
        dist_ap = haversine(lat_a, lon_a, lat, lng)
        dist_bp = haversine(lat_b, lon_b, lat, lng)
        
        # To determine if the projection falls onto the line segment:
        brg_ab = bearing(lat_a, lon_a, lat_b, lon_b)
        brg_ap = bearing(lat_a, lon_a, lat, lng)
        brg_ba = bearing(lat_b, lon_b, lat_a, lon_a)
        brg_bp = bearing(lat_b, lon_b, lat, lng)

        # Cross track error
        xt_dist = cross_track_distance(lat, lng, lat_a, lon_a, lat_b, lon_b)
        
        # If projection is beyond A (cos(angle) < 0 implies angle > 90deg)
        if math.cos(brg_ap - brg_ab) < 0:
            min_dist = min(min_dist, dist_ap)
        # If projection is beyond B
        elif math.cos(brg_bp - brg_ba) < 0:
            min_dist = min(min_dist, dist_bp)
        # Projection is between A and B
        else:
            min_dist = min(min_dist, xt_dist)

    return min_dist

def analyze_gps(lat: float, lng: float, route: List[Tuple[float, float]] = None) -> Tuple[bool, str, float]:
    """
    Route analyzer testing coordinate against route via cross-track error.
    Returns:
        is_anomaly (bool): True if an anomaly is detected (>50m off route).
        anomaly_type (str): Type of anomaly.
        confidence (float): Confidence score (0.0 to 1.0).
    """
    if route is None or len(route) == 0:
        # Default mock route for testing (New York coordinates)
        # Just a short synthetic path: (40.7128, -74.0060) to (40.7138, -74.0070)
        route = [(40.7128, -74.0060), (40.7138, -74.0070)]
        
    error_distance = min_distance_to_route(lat, lng, route)
    
    # Threshold: flag an anomaly if the driver is further than 50 meters off the ideal geometric route
    if error_distance > 50.0:
        # Pseudo-confidence scale: 50m = 0.5 confidence, 100m+ = 1.0 confidence
        confidence = min((error_distance - 50.0) / 100.0 + 0.5, 1.0)
        return True, "OFF_ROUTE_DEVIATION", round(confidence, 2)

    return False, "OK", 0.0
