# CardiacLink Quick Start 🚀

## 30-Second Setup

```bash
# Terminal 1: Frontend
cd /Users/emilysun/Downloads/cardiaclink
npm run dev

# Terminal 2: Backend
cd /Users/emilysun/Downloads/cardiaclink/backend
pip install -r requirements.txt
python main.py
```

Open **http://localhost:3000**

## The Flow (5 minutes)

1. **Click red EMERGENCY button** → Location screen
2. **Confirm location** → Backend sends Twilio calls + SMS
3. **View dispatch** → See volunteer notifications
4. **Start CPR** → 110 BPM metronome (THE HERO SCREEN)
5. **After 2 min** → Assessment → Continue or Complete

## Key Routes

- `/` - Home with emergency button
- `/emergency/location` - GPS confirmation
- `/emergency/dispatch` - Notifications status
- `/emergency/cpr` - **THE METRONOME** 🫀
- `/emergency/cpr-hardware` - With sensor feedback
- `/emergency/assessment` - Check patient
- `/emergency/complete` - Mission summary
- `/volunteer/map` - Volunteer view

## API Endpoints

**Backend**: http://localhost:8000

- `POST /api/emergency/trigger` - Trigger emergency
- `GET /api/emergency/status` - Get status
- `POST /api/emergency/reset` - Reset demo
- `GET /docs` - API documentation

## Environment

**Backend** (`backend/.env`):
```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## Testing Notifications

The backend makes **real Twilio calls** to:
- Volunteer A: +19495190927 (call)
- Volunteer B: +19493440799 (SMS)
- Volunteer C: +19492223333 (call)

Check backend console for call status!

## Troubleshooting

### No metronome beep?
Click anywhere on page first (browser audio permission)

### Backend errors?
Check Twilio credentials in `backend/.env`

### CORS issues?
Ensure backend is on port 8000, frontend on 3000

## Demo Tips

1. ✅ Run backend FIRST
2. ✅ Use desktop browser (full width design)
3. ✅ Allow audio permissions
4. ✅ Watch backend logs for Twilio status
5. ✅ Full flow takes ~5 minutes

---

**Read More**: `GETTING_STARTED.md` | `BUILD_SUMMARY.md`

🫀 **Every second counts**
