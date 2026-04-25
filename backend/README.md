# CardiacLink Backend

FastAPI backend for CardiacLink emergency response system.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables in `.env`:
- Twilio credentials (already configured)
- Textbelt API key (already configured)

3. Run the server:
```bash
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- `POST /api/emergency/trigger` - Trigger emergency, notify volunteers
- `GET /api/emergency/status` - Get current emergency status
- `POST /api/volunteer/respond/{phone}` - Record volunteer response
- `POST /api/emergency/reset` - Reset emergency state (demo)

## Integration

The backend integrates with:
- **Twilio Voice API** - Makes phone calls to volunteers
- **Textbelt SMS API** - Sends SMS notifications
- **Next.js Frontend** - Located in parent directory

## Testing

```bash
# Trigger emergency
curl -X POST http://localhost:8000/api/emergency/trigger \
  -H "Content-Type: application/json" \
  -d '{"lat": 33.6846, "lng": -117.8265, "address": "3200 California Ave, Irvine CA"}'

# Check status
curl http://localhost:8000/api/emergency/status

# Reset
curl -X POST http://localhost:8000/api/emergency/reset
```
