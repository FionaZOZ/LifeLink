# Phase 3: Claude Orchestration - Testing Guide

## ✅ What's Been Built

Phase 3 implements the full AI orchestration system with 6 agents coordinated by Claude:

### All 6 Agents:
1. **LocationAgent** - GPS + reverse geocoding
2. **ResponderAgent** - Finds & dispatches volunteers
3. **AEDAgent** - Locates AED + assigns retrieval (with Mapbox routing)
4. **CPRAgent** - Real-time CPR guidance with 100 BPM metronome
5. **DispatchAgent** - Claude-generated 911 dispatcher dialogue
6. **FamilyAgent** - SMS notification (Twilio or simulated)

### The Coordinator:
- **Claude-powered orchestrator** that decides which agents to call and when
- Uses Claude's tool use API with all 6 agents as tools
- **Streams reasoning in real-time** via Server-Sent Events (SSE)
- Executes agents in parallel for maximum speed
- Terminal-style UI showing AI decision-making

## 🧪 How to Test

### 1. Refresh the Page
The new code is deployed. **Refresh http://localhost:3000**

You should see:
- New **black Coordinator panel** at the top with green terminal text
- 6 agent cards below (all idle)
- Map with volunteers and AEDs

### 2. Trigger an Emergency
Click the **"🚨 TRIGGER EMERGENCY"** button

### 3. Watch the Magic ✨

**Coordinator Panel (top):**
- Will show Claude's real-time thinking:
  ```
  Cardiac arrest detected. Priority actions:
  1) Get precise location
  2) Mobilize volunteers
  3) Locate AED
  4) Connect dispatch

  Executing in parallel...
  ```
- Watch as it decides to call multiple agents simultaneously

**Agent Cards:**
All 6 cards should light up in **2-3 parallel waves** (not sequential):
- **Location** → Shows GPS + address
- **Responder** → "3 volunteers dispatched" (or "No volunteers within 500m")
- **AED** → "AED located at [location], [distance]m away"
- **CPR** → "CPR guidance issued - 100 BPM metronome started"
- **Dispatch** → Realistic 911 dialogue (Claude-generated)
- **Family** → "SMS sent" (simulated unless Twilio configured)

**Map:**
- Volunteers animate toward patient
- One volunteer detours to AED location, then to patient
- Smooth realtime updates

## 📊 Expected Timeline

| Time | What Happens |
|------|--------------|
| 0s | Click trigger |
| 1-2s | Coordinator starts thinking, stream appears |
| 2-3s | Location + Responder + Dispatch + AED agents activate (parallel) |
| 3-4s | CPR + Family agents activate |
| 5s+ | Dispatcher messages arrive every 3s |
| 20-30s | Volunteers arrive at patient |
| 30s+ | AED arrives, agents mark "done" |

## 🐛 Troubleshooting

### "No volunteers within 500m"
- Your geolocation might be outside UCI area
- Volunteers are seeded around UCI campus
- **Solution**: Deny geolocation permission → uses UCI default location

### Coordinator not streaming
- Check browser console for errors
- Verify ANTHROPIC_API_KEY is set in `.env.local`
- Check server logs for Coordinator errors

### Agents not activating
- Check Supabase dashboard → `agent_events` table for logs
- Verify all 6 agents are writing events

## 🎯 Demo Tips for Hackathon

1. **Pre-load the page** before demo starts
2. **Zoom in on Coordinator panel** - that's the wow factor
3. **Narrate**: "Watch as Claude decides which agents to deploy..."
4. **Point out parallel execution** - multiple cards lighting up at once
5. **Show the database** - open Supabase `agent_events` table in another tab
6. **For SMS demo**: Set up Twilio and have your phone ready to buzz

## 📱 Optional: Enable Real SMS

To get actual SMS notifications:

1. Sign up at https://twilio.com/try-twilio (free trial)
2. Get a Twilio phone number
3. Add to `.env.local`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_PHONE_NUMBER=+1234567890
   TEST_RECIPIENT_NUMBER=+1234567890  # Your phone
   ```
4. Restart server
5. Trigger emergency → **YOUR PHONE WILL BUZZ** 📱

## 🚀 Phase 3 Complete!

You now have a fully working AI multi-agent orchestration system:
- ✅ Claude makes real-time decisions
- ✅ 6 agents work in parallel
- ✅ Streaming coordinator reasoning
- ✅ Real routing (Mapbox)
- ✅ Real SMS (optional)
- ✅ Real dispatcher dialogue (Claude)

**This is hackathon-ready!** 🏆
