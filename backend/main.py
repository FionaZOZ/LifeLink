"""
CardiacLink FastAPI Backend
Handles emergency triggers, volunteer notifications via Twilio/SMS
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
from twilio.rest import Client
import requests
from datetime import datetime

load_dotenv()

app = FastAPI(title="CardiacLink API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Twilio setup
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
TEXTBELT_API_KEY = os.getenv("TEXTBELT_API_KEY", "c8018180337b1f42f47bc0c8321ca5dc14d8a620GBhJB0Eoh958fDkz3yzNMF4Ha")

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

# In-memory state
emergency_state = {
    "active": False,
    "location": None,
    "notifications_sent": [],
    "volunteers_responded": 0,
    "started_at": None,
}


class EmergencyTrigger(BaseModel):
    lat: float
    lng: float
    address: str


class VolunteerResponse(BaseModel):
    phone: str
    accepted: bool


@app.get("/")
def read_root():
    return {"message": "CardiacLink API", "status": "running"}


@app.post("/api/emergency/trigger")
async def trigger_emergency(emergency: EmergencyTrigger):
    """
    Trigger an emergency and notify volunteers via Twilio calls and SMS
    """
    global emergency_state

    emergency_state["active"] = True
    emergency_state["location"] = {
        "lat": emergency.lat,
        "lng": emergency.lng,
        "address": emergency.address,
    }
    emergency_state["started_at"] = datetime.now().isoformat()
    emergency_state["notifications_sent"] = []
    emergency_state["volunteers_responded"] = 0

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
                    </Response>'''
                )
                notification["call_sid"] = call.sid
                print(f"Call initiated to {volunteer['name']}: {call.sid}")

            elif volunteer["method"] == "sms":
                # Send SMS via Textbelt
                response = requests.post('https://textbelt.com/text', {
                    'phone': volunteer["phone"],
                    'message': f'CardiacLink Emergency Alert: Cardiac arrest at {emergency.address}, {volunteer["distance"]} from you. Respond if available.',
                    'key': TEXTBELT_API_KEY,
                })
                print(f"SMS sent to {volunteer['name']}: {response.json()}")

        except Exception as e:
            print(f"Error notifying {volunteer['name']}: {e}")
            notification["status"] = "failed"

        emergency_state["notifications_sent"].append(notification)

    return {
        "success": True,
        "message": "Emergency triggered",
        "notifications_sent": len(emergency_state["notifications_sent"]),
    }


@app.get("/api/emergency/status")
async def get_emergency_status():
    """
    Get current emergency status
    """
    return emergency_state


@app.post("/api/volunteer/respond/{phone}")
async def volunteer_respond(phone: str, accepted: bool = True):
    """
    Record volunteer response (accept/decline)
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
    Reset emergency state (for demo purposes)
    """
    global emergency_state
    emergency_state = {
        "active": False,
        "location": None,
        "notifications_sent": [],
        "volunteers_responded": 0,
        "started_at": None,
    }
    return {"success": True, "message": "Emergency state reset"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
