"""
CardiacLink FastAPI Backend
Handles emergency triggers, volunteer notifications, and patient profile handoff.
"""
from datetime import datetime, timezone
import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
import requests
from twilio.rest import Client

load_dotenv()

app = FastAPI(title="CardiacLink API")

# Enable CORS for frontend. Keep localhost defaults, but allow overriding for deployment.
DEFAULT_CORS_ORIGINS = ["http://localhost:3000", "http://localhost:3001"]
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", ",".join(DEFAULT_CORS_ORIGINS)).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Twilio setup
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
TEXTBELT_API_KEY = os.getenv(
    "TEXTBELT_API_KEY",
    "c8018180337b1f42f47bc0c8321ca5dc14d8a620GBhJB0Eoh958fDkz3yzNMF4Ha",
)

# Initialize Twilio client
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Demo volunteer database
VOLUNTEERS = [
    {"phone": "+19495190927", "name": "Volunteer A", "distance": "150m", "method": "call"},
    {"phone": "+19493440799", "name": "Volunteer B", "distance": "280m", "method": "sms"},
    {"phone": "+19492223333", "name": "Volunteer C", "distance": "320m", "method": "call"},
]

# In-memory state for the demo server. Replace with DB persistence for production.
emergency_state: Dict[str, Any] = {
    "active": False,
    "location": None,
    "notifications_sent": [],
    "volunteers_responded": 0,
    "started_at": None,
    "patient_profile": None,
    "patient_profile_received_at": None,
    "patient_profile_source": None,
}


class EmergencyTrigger(BaseModel):
    lat: float
    lng: float
    address: str


class VolunteerResponse(BaseModel):
    phone: str
    accepted: bool


class EmergencyContact(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: Optional[str] = None
    relation: Optional[str] = None
    phone: Optional[str] = None


class Physician(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: Optional[str] = None
    phone: Optional[str] = None


class PatientProfile(BaseModel):
    """
    Payload received from the volunteer browser after Web Serial reads the Arduino.
    The Arduino profile is hardcoded, but this model stays permissive so extra
    fields can be added without breaking the emergency handoff path.
    """

    model_config = ConfigDict(extra="allow")

    name: Optional[str] = None
    dob: Optional[str] = None
    blood_type: Optional[str] = Field(default=None, alias="bloodType")
    phone: Optional[str] = None
    address: Optional[str] = None
    allergies: Optional[str] = None
    conditions: Optional[str] = None
    medications: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = Field(default=None, alias="emergencyContact")
    physician: Optional[Physician] = None
    notes: Optional[str] = None
    source: Optional[str] = "arduino_serial"
    received_by: Optional[str] = Field(default=None, alias="receivedBy")
    client_timestamp: Optional[str] = Field(default=None, alias="clientTimestamp")

    def to_handoff_dict(self) -> Dict[str, Any]:
        return self.model_dump(by_alias=True, exclude_none=True)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/")
def read_root():
    return {"message": "CardiacLink API", "status": "running"}


@app.post("/api/patient/profile")
async def receive_patient_profile(profile: PatientProfile):
    """
    Store the patient profile sent by the volunteer browser.

    Flow:
    Arduino hardcoded profile -> Web Serial in volunteer browser -> this endpoint.
    EMS / responder views can retrieve it through /api/patient/profile or
    /api/emergency/status.
    """
    global emergency_state

    profile_payload = profile.to_handoff_dict()
    if not profile_payload:
        raise HTTPException(status_code=400, detail="Patient profile payload is empty")

    received_at = utc_now_iso()
    source = profile_payload.get("source") or "arduino_serial"

    emergency_state["patient_profile"] = profile_payload
    emergency_state["patient_profile_received_at"] = received_at
    emergency_state["patient_profile_source"] = source

    print(
        "[PatientProfile] received",
        {
            "name": profile_payload.get("name"),
            "bloodType": profile_payload.get("bloodType"),
            "source": source,
            "receivedAt": received_at,
        },
    )

    return {
        "success": True,
        "message": "Patient profile received",
        "received_at": received_at,
        "profile": profile_payload,
    }


@app.get("/api/patient/profile")
async def get_patient_profile():
    """
    Return the latest patient profile available to responders / EMS dashboard.
    """
    return {
        "success": True,
        "has_profile": emergency_state["patient_profile"] is not None,
        "received_at": emergency_state["patient_profile_received_at"],
        "source": emergency_state["patient_profile_source"],
        "profile": emergency_state["patient_profile"],
    }


@app.post("/api/emergency/trigger")
async def trigger_emergency(emergency: EmergencyTrigger):
    """
    Trigger an emergency and notify volunteers via Twilio calls and SMS.
    """
    global emergency_state

    previous_profile = emergency_state.get("patient_profile")
    previous_profile_received_at = emergency_state.get("patient_profile_received_at")
    previous_profile_source = emergency_state.get("patient_profile_source")

    emergency_state["active"] = True
    emergency_state["location"] = {
        "lat": emergency.lat,
        "lng": emergency.lng,
        "address": emergency.address,
    }
    emergency_state["started_at"] = datetime.now().isoformat()
    emergency_state["notifications_sent"] = []
    emergency_state["volunteers_responded"] = 0
    emergency_state["patient_profile"] = previous_profile
    emergency_state["patient_profile_received_at"] = previous_profile_received_at
    emergency_state["patient_profile_source"] = previous_profile_source

    # Notify volunteers
    for volunteer in VOLUNTEERS:
        notification = {
            "phone": volunteer["phone"],
            "name": volunteer["name"],
            "distance": volunteer["distance"],
            "method": volunteer["method"],
            "status": "calling" if volunteer["method"] == "call" else "sent",
            "eta": "2-4 min",
        }

        try:
            if volunteer["method"] == "call" and twilio_client:
                # Make phone call
                call = twilio_client.calls.create(
                    to=volunteer["phone"],
                    from_=TWILIO_PHONE_NUMBER,
                    twiml=f'''<Response>
                        <Say language="en-US">
                            CardiacLink Emergency Alert. A cardiac arrest has been reported at {emergency.address}.
                            The location is approximately {volunteer["distance"]} from your current position.
                            If you are available to respond, press 1 to accept or 2 to decline.
                        </Say>
                        <Gather numDigits="1" action="/api/volunteer/respond/{volunteer["phone"]}" method="POST">
                            <Say>Press 1 to accept, or 2 to decline.</Say>
                        </Gather>
                    </Response>''',
                )
                notification["call_sid"] = call.sid
                print(f"Call initiated to {volunteer['name']}: {call.sid}")

            elif volunteer["method"] == "sms":
                # Send SMS via Textbelt
                response = requests.post(
                    "https://textbelt.com/text",
                    {
                        "phone": volunteer["phone"],
                        "message": f'CardiacLink Emergency Alert: Cardiac arrest at {emergency.address}, {volunteer["distance"]} from you. Respond if available.',
                        "key": TEXTBELT_API_KEY,
                    },
                    timeout=10,
                )
                print(f"SMS sent to {volunteer['name']}: {response.json()}")

        except Exception as e:
            print(f"Error notifying {volunteer['name']}: {e}")
            notification["status"] = "failed"

        emergency_state["notifications_sent"].append(notification)

    return {
        "success": True,
        "message": "Emergency triggered",
        "notifications_sent": len(emergency_state["notifications_sent"]),
        "patient_profile_available": emergency_state["patient_profile"] is not None,
    }


@app.get("/api/emergency/status")
async def get_emergency_status():
    """
    Get current emergency status, including the latest Arduino patient profile.
    """
    return emergency_state


@app.post("/api/volunteer/respond/{phone}")
async def volunteer_respond(phone: str, accepted: bool = True):
    """
    Record volunteer response (accept/decline).
    """
    global emergency_state

    for notification in emergency_state["notifications_sent"]:
        if notification["phone"] == phone:
            notification["status"] = "accepted" if accepted else "declined"
            if accepted:
                emergency_state["volunteers_responded"] += 1

    return {"success": True, "phone": phone, "accepted": accepted}


@app.post("/api/emergency/reset")
async def reset_emergency():
    """
    Reset emergency state (for demo purposes).
    """
    global emergency_state
    emergency_state = {
        "active": False,
        "location": None,
        "notifications_sent": [],
        "volunteers_responded": 0,
        "started_at": None,
        "patient_profile": None,
        "patient_profile_received_at": None,
        "patient_profile_source": None,
    }
    return {"success": True, "message": "Emergency state reset"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
