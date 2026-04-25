"""Inter-agent message protocols for CardiacLink.

All typed message models exchanged between agents.
"""
from typing import Optional, Literal
from uagents import Model


# ============================================================================
# AED locator protocol
# ============================================================================

class AedDevice(Model):
    """A single AED device with location and status."""
    name: str
    address: str
    lat: float
    lon: float
    distance_m: int
    coverage_score: float  # Buter 2024 coverage decay score
    last_checked: str  # ISO 8601 date
    pads_available: bool
    source: Literal["ucla-ehs", "openaedmap"]
    attribution: str  # e.g. "UCLA Environmental Health & Safety"


class AedQuery(Model):
    """Request for nearby AED devices."""
    location: str  # address or "lat,lon"
    radius_m: int = 1000
    transport_mode: Literal["walking", "bicycle", "car"] = "walking"


class AedResult(Model):
    """Response with list of nearby AEDs."""
    devices: list[AedDevice]
    primary_source: str  # which dataset answered
    h3_cell: str  # H3 cell of query location


# ============================================================================
# Voice agent protocol
# ============================================================================

class VoiceSyncRequest(Model):
    """Request to sync voice narration to a CPR step."""
    step: str  # "consent", "responsive", "breathing", "handPlacement", "handPosing", "compressions", "breathWindow", "aed", "summary"
    context: str = ""  # additional context for the step


class VoiceSyncAck(Model):
    """Acknowledgement that voice session is synced."""
    session_id: str
    state: Literal["connecting", "speaking", "idle", "error"]


# ============================================================================
# EMS dispatch protocol
# ============================================================================

class EmsDispatchRequest(Model):
    """Request emergency dispatch."""
    location: str
    status: str  # victim status summary
    callback: Optional[str] = None


class EmsDispatchResult(Model):
    """EMS dispatch confirmation."""
    dispatch_id: str  # synthetic, e.g. LACO-EMS-XXXXXXXX
    eta_seconds: int  # ~360 +/- jitter (LA county benchmark)
    w3w: str  # What3Words encoding of location
    w3w_source: Literal["api", "synthesized"]


# ============================================================================
# Hospital handoff protocol
# ============================================================================

class HandoffSummary(Model):
    """Session summary for hospital handoff."""
    compressions_total: int
    sets_completed: int
    aed_used: bool
    rosc: bool  # return of spontaneous circulation
    exit_step: str
    gps_lat: float
    gps_lon: float
    duration_seconds: int


class HandoffAck(Model):
    """Confirmation of handoff recorded."""
    record_id: str
    receiving_hospital: str


# ============================================================================
# Optimizer protocol (AED placement optimization)
# ============================================================================

class OptimizerRequest(Model):
    """Request for optimal AED placement analysis."""
    region: str  # e.g. "UCLA campus"
    n_new_aeds: int = 3
    transport_mode: Literal["walking", "bicycle", "car"] = "walking"


class OptimizerResult(Model):
    """Proposed AED placement locations."""
    proposed_locations: list[dict]  # {name, lat, lon, marginal_coverage_gain}
    method: str  # "GRASP-mock" -- be honest


# ============================================================================
# Triage protocol (MDAgents-inspired complexity classifier)
# ============================================================================

class TriageRequest(Model):
    """Request to triage an emergency description."""
    text: str  # natural-language emergency description


class TriageResult(Model):
    """Triage classification result."""
    complexity: Literal["Low", "Moderate", "High"]
    suspected_condition: str  # e.g. "cardiac arrest", "syncope", "unclear"
    follow_up_questions: list[str]  # empty if complexity == High and confident
    rationale: str  # short LLM explanation


# ============================================================================
# Drone protocol (UAV-AED delivery)
# ============================================================================

class DroneDispatchRequest(Model):
    """Request drone-delivered AED."""
    target_lat: float
    target_lon: float
    payload: Literal["AED"] = "AED"


class DroneDispatchResult(Model):
    """Drone dispatch confirmation."""
    drone_id: str
    eta_seconds: int  # mocked using Sweden Lancet 2023 benchmarks
    aed_model: str
    available: bool
