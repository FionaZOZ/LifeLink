"""
Canonical emergency scenarios for CardiacLink demo and testing.
Python mirror of lib/scenarios.ts - keep in sync!
"""
from typing import Dict, List
from dataclasses import dataclass


@dataclass
class Location:
    lat: float
    lon: float
    label: str


@dataclass
class Scenario:
    id: str
    label: str
    location: Location
    narrative: str
    expected_agents: List[str]


# Canonical scenarios - must match lib/scenarios.ts
SCENARIOS: Dict[str, Scenario] = {
    "royce-hall": Scenario(
        id="royce-hall",
        label="Royce Hall Lecture",
        location=Location(
            lat=34.0727,
            lon=-118.4421,
            label="Royce Hall, UCLA",
        ),
        narrative="Student collapses during lecture at Royce Hall",
        expected_agents=["coordinator", "aed", "voice", "ems", "triage", "handoff"],
    ),
    "pauley-pavilion": Scenario(
        id="pauley-pavilion",
        label="Pauley Pavilion Game",
        location=Location(
            lat=34.0703,
            lon=-118.4470,
            label="Pauley Pavilion, UCLA",
        ),
        narrative="Fan goes into cardiac arrest during a Pauley Pavilion game",
        expected_agents=["coordinator", "aed", "voice", "ems", "drone", "triage", "handoff"],
    ),
    "bruin-walk": Scenario(
        id="bruin-walk",
        label="Bruin Walk Jogger",
        location=Location(
            lat=34.0710,
            lon=-118.4445,
            label="Bruin Walk near Ackerman Union, UCLA",
        ),
        narrative="Jogger collapses on Bruin Walk near Ackerman",
        expected_agents=["coordinator", "aed", "voice", "ems", "triage", "handoff"],
    ),
}


def get_scenario(scenario_id: str) -> Scenario:
    """Get scenario by ID, with fallback to default if not found."""
    return SCENARIOS.get(scenario_id, SCENARIOS["royce-hall"])


def get_scenario_ids() -> List[str]:
    """List all scenario IDs."""
    return list(SCENARIOS.keys())
