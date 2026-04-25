-- Volunteers: trained bystanders who can respond
CREATE TABLE volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'idle', -- 'idle' | 'responding' | 'arrived'
  cpr_certified BOOLEAN DEFAULT true,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AEDs: automated external defibrillator locations
CREATE TABLE aeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  address TEXT,
  location_name TEXT, -- "Gold's Gym", "Starbucks", etc.
  available BOOLEAN DEFAULT true,
  hours TEXT -- "24/7" or "6am-10pm"
);

-- Emergencies: incidents being coordinated
CREATE TABLE emergencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_lat DOUBLE PRECISION NOT NULL,
  patient_lon DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'active', -- 'active' | 'resolved'
  started_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  notes TEXT
);

-- Agent events: log of what each agent does (for visualization)
CREATE TABLE agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID REFERENCES emergencies(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL, -- 'location' | 'responder' | 'aed' | 'cpr' | 'dispatch' | 'family'
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE volunteers;
ALTER PUBLICATION supabase_realtime ADD TABLE emergencies;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_events;
