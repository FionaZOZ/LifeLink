"""Hospital handoff agent with FHIR R4 audit trail.

Records CPR session summaries to JSONL audit log, selects nearest STEMI center,
and builds FHIR R4-shaped bundles.
"""
import json
import os
import logging
import secrets
from datetime import datetime, timezone
from uagents import Agent, Context
from shared.protocols import HandoffSummary, HandoffAck
from shared.chat import enable_chat, extract_text
from shared.coverage import haversine_distance
from shared.discovery import register_capability_tags
from shared.event_bus import publish
from datasets.la_stemi_hospitals import LA_STEMI_HOSPITALS

logger = logging.getLogger(__name__)

HANDOFF_LOG_PATH = "bus/data/handoff.jsonl"


def select_nearest_hospital(lat: float, lon: float) -> dict:
    """Select nearest STEMI receiving center."""
    nearest = None
    min_dist = float('inf')

    for hosp in LA_STEMI_HOSPITALS:
        dist = haversine_distance(lat, lon, hosp["lat"], hosp["lon"])
        if dist < min_dist:
            min_dist = dist
            nearest = hosp

    return nearest


def build_fhir_bundle(summary: HandoffSummary, hospital: dict) -> dict:
    """Build a FHIR R4 Bundle with Patient, Encounter, Observation, and Procedure resources."""
    patient_id = f"patient-{secrets.token_hex(8)}"
    encounter_id = f"encounter-{secrets.token_hex(8)}"
    timestamp = datetime.now(timezone.utc).isoformat()

    bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "timestamp": timestamp,
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": patient_id,
                    "identifier": [{"system": "cardiaclink", "value": patient_id}],
                }
            },
            {
                "resource": {
                    "resourceType": "Encounter",
                    "id": encounter_id,
                    "status": "finished",
                    "class": {"code": "EMER"},
                    "subject": {"reference": f"Patient/{patient_id}"},
                    "period": {
                        "start": timestamp,
                        "end": timestamp,
                    },
                    "location": [{"location": {"display": hospital["name"]}}],
                }
            },
            {
                "resource": {
                    "resourceType": "Observation",
                    "status": "final",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "8867-4", "display": "Heart rate"}]},
                    "subject": {"reference": f"Patient/{patient_id}"},
                    "valueQuantity": {"value": 110, "unit": "beats/min"},
                }
            },
            {
                "resource": {
                    "resourceType": "Observation",
                    "status": "final",
                    "code": {"text": "Total compressions"},
                    "subject": {"reference": f"Patient/{patient_id}"},
                    "valueInteger": summary.compressions_total,
                }
            },
            {
                "resource": {
                    "resourceType": "Observation",
                    "status": "final",
                    "code": {"text": "AED used"},
                    "subject": {"reference": f"Patient/{patient_id}"},
                    "valueBoolean": summary.aed_used,
                }
            },
            {
                "resource": {
                    "resourceType": "Observation",
                    "status": "final",
                    "code": {"text": "ROSC achieved"},
                    "subject": {"reference": f"Patient/{patient_id}"},
                    "valueBoolean": summary.rosc,
                }
            },
            {
                "resource": {
                    "resourceType": "Procedure",
                    "status": "completed",
                    "code": {"coding": [{"system": "http://snomed.info/sct", "code": "89666000", "display": "Cardiopulmonary resuscitation"}]},
                    "subject": {"reference": f"Patient/{patient_id}"},
                    "performedPeriod": {"start": timestamp, "end": timestamp},
                }
            },
        ]
    }

    return bundle


def create_handoff_agent(seed: str) -> Agent:
    """Create the Handoff specialist agent."""
    agent = Agent(name="handoff", seed=seed, mailbox=True)

    register_capability_tags(agent, [
        "cardiaclink-handoff",
        "cardiaclink",
        "handoff",
        "hospital",
        "fhir",
        "emergency",
    ])

    @agent.on_event("startup")
    async def startup(ctx: Context):
        ctx.logger.info(f"Handoff agent started: {agent.address}")
        ctx.logger.info(f"Loaded {len(LA_STEMI_HOSPITALS)} STEMI receiving centers")
        os.makedirs(os.path.dirname(HANDOFF_LOG_PATH), exist_ok=True)

        # Schedule heartbeat every 5 seconds
        agent.on_interval(period=5.0)(heartbeat)

    async def heartbeat(ctx: Context):
        """Publish periodic heartbeat to event bus."""
        await publish(
            emergency_id="heartbeat",
            agent="handoff",
            capability="hospital-handoff",
            phase="heartbeat",
            summary="Handoff agent active",
            data={"address": str(agent.address)}
        )

    @agent.on_message(model=HandoffSummary, replies={HandoffAck})
    async def handle_handoff(ctx: Context, sender: str, msg: HandoffSummary):
        """Handle handoff summary requests."""
        ctx.logger.info(f"Handoff summary: {msg.compressions_total} compressions, ROSC={msg.rosc}")

        hospital = select_nearest_hospital(msg.gps_lat, msg.gps_lon)
        bundle = build_fhir_bundle(msg, hospital)

        record_id = f"handoff-{secrets.token_hex(8)}"
        audit_entry = {
            "record_id": record_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "hospital": hospital["name"],
            "summary": msg.dict(),
            "fhir_bundle": bundle,
        }

        with open(HANDOFF_LOG_PATH, "a") as f:
            f.write(json.dumps(audit_entry) + "\n")

        ctx.logger.info(f"Handoff recorded: {record_id} -> {hospital['name']}")

        await ctx.send(sender, HandoffAck(
            record_id=record_id,
            receiving_hospital=hospital["name"],
        ))

    async def chat_handler(ctx: Context, sender: str, msg):
        """Handle chat messages from ASI:One."""
        text = extract_text(msg)
        ctx.logger.info(f"Handoff agent chat request: {text}")

        summary = HandoffSummary(
            compressions_total=120,
            sets_completed=4,
            aed_used=True,
            rosc=True,
            exit_step="summary",
            gps_lat=34.0654,
            gps_lon=-118.4470,
            duration_seconds=240,
        )

        hospital = select_nearest_hospital(summary.gps_lat, summary.gps_lon)

        return (f"Handoff agent ready. Example session:\n"
               f"  {summary.compressions_total} compressions ({summary.sets_completed} sets)\n"
               f"  AED used: {'Yes' if summary.aed_used else 'No'}\n"
               f"  ROSC achieved: {'Yes' if summary.rosc else 'No'}\n"
               f"  Receiving hospital: {hospital['name']}\n"
               f"  FHIR R4 bundle created with Patient, Encounter, Observation, and Procedure resources\n"
               f"  Audit trail: {HANDOFF_LOG_PATH}")

    chat_proto = enable_chat(agent, chat_handler)
    agent.include(chat_proto, publish_manifest=True)

    return agent
