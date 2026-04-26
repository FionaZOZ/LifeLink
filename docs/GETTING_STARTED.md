# CardiacLink - Getting Started

Complete cardiac emergency response system with Next.js frontend and FastAPI backend.

## 🚀 Quick Start

### 1. Frontend Setup (Next.js)

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

### 2. Backend Setup (FastAPI)

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run backend server
python main.py
```

Backend API will be available at `http://localhost:8000`

## 📱 Application Flow

The app follows this emergency response flow:

1. **Home** (`/`) - Emergency button
2. **Location** (`/emergency/location`) - Confirm GPS location
3. **Dispatch** (`/emergency/dispatch`) - View 911 + volunteer notifications
4. **CPR** (`/emergency/cpr`) - 110 BPM metronome with audio beep
5. **Assessment** (`/emergency/assessment`) - Check patient after 2 minutes
6. **Complete** (`/emergency/complete`) - Mission summary

### Additional Screens

- **CPR Hardware** (`/emergency/cpr-hardware`) - With simulated sensor feedback
- **Volunteer Map** (`/volunteer/map`) - What volunteers see on their phones

## 🔧 Backend Integration

The backend provides these endpoints:

- `POST /api/emergency/trigger` - Triggers emergency, sends Twilio calls + SMS
- `GET /api/emergency/status` - Polls current emergency state
- `POST /api/volunteer/respond/{phone}` - Records volunteer accept/decline
- `POST /api/emergency/reset` - Resets state for demo

### Twilio Integration

The backend uses your Twilio credentials (already configured in `backend/.env`):
- Makes voice calls to volunteers with emergency alerts
- Volunteers press 1 to accept, 2 to decline
- SMS sent via Textbelt API

## 🎨 Key Features

### Screen 4: CPR Guidance (Most Critical)

- **110 BPM metronome** with visual pulse + audio beep
- Auto-counts compressions
- 2-minute timer to assessment
- Dark background (#111827) for visibility
- "Need help?" modal for questions

### Screen 5: CPR Hardware

- Same as Screen 4 + real-time sensor feedback
- Simulated depth (4-6.5cm), rate (95-130 BPM), quality (60-95)
- Visual depth gauge with green zone
- BLE Connected badge

### Screen 3: Dispatch Status

- Polls backend every 3 seconds
- Shows volunteer notification status
- 911 confirmation
- AED location

## 🧪 Testing the Full Flow

1. Start both servers (frontend + backend)
2. Open `http://localhost:3000`
3. Click the big red EMERGENCY button
4. Confirm location → Backend triggers Twilio calls + SMS
5. View dispatch status with volunteer responses
6. Click "Start CPR Guidance"
7. Follow metronome for 2 minutes
8. Assessment screen appears
9. Continue or complete

## 📝 Environment Variables

### Frontend (.env.local)
- Already configured with Supabase (optional)

### Backend (backend/.env)
```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TEXTBELT_API_KEY=your_textbelt_api_key
```

## 🎯 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: FastAPI, Twilio SDK, python-dotenv
- **Notifications**: Twilio Voice + Textbelt SMS
- **Maps**: Hardcoded demos (can integrate Google Maps/Mapbox)
- **Audio**: Web Audio API for metronome beep

## 🐛 Troubleshooting

### Metronome not beeping?
- Browser may block audio until user interaction
- Click anywhere on the page first

### Backend not triggering notifications?
- Check Twilio credentials in `backend/.env`
- Verify phone numbers are in E.164 format (+1XXXXXXXXXX)
- Check console for error messages

### CORS errors?
- Ensure backend is running on port 8000
- Frontend CORS is configured for localhost:3000

## 📦 Project Structure

```
cardiaclink/
├── app/                          # Next.js app directory
│   ├── page.tsx                  # Screen 1: Home
│   ├── emergency/
│   │   ├── location/page.tsx     # Screen 2: Location
│   │   ├── dispatch/page.tsx     # Screen 3: Dispatch
│   │   ├── cpr/page.tsx          # Screen 4: CPR
│   │   ├── cpr-hardware/page.tsx # Screen 5: CPR Hardware
│   │   ├── assessment/page.tsx   # Screen 6: Assessment
│   │   └── complete/page.tsx     # Screen 8: Complete
│   └── volunteer/
│       └── map/page.tsx          # Screen 7: Volunteer Map
├── backend/
│   ├── main.py                   # FastAPI server
│   ├── requirements.txt          # Python dependencies
│   └── .env                      # Twilio credentials
└── components/                   # React components
```

## 🎬 Demo Tips

1. Run backend first to ensure notifications work
2. Use desktop browser for best experience (full width design)
3. Audio permission required for metronome beep
4. Backend logs show Twilio call/SMS status
5. Press Emergency button → Full flow takes ~5 minutes

## 📞 Contact & Support

Check `/api/docs` (FastAPI auto-generated docs) at `http://localhost:8000/docs` for API reference.

---

**Built for emergency response. Every second counts. 🫀**
