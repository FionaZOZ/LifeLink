export interface Volunteer {
  id: string;
  name: string;
  lat: number;
  lon: number;
  status: 'idle' | 'responding' | 'arrived';
  cpr_certified: boolean;
  phone: string | null;
  created_at: string;
}

export interface AED {
  id: string;
  lat: number;
  lon: number;
  address: string | null;
  location_name: string | null;
  available: boolean;
  hours: string | null;
}

export interface Emergency {
  id: string;
  patient_lat: number;
  patient_lon: number;
  status: 'active' | 'resolved';
  started_at: string;
  resolved_at: string | null;
  notes: string | null;
}

export interface AgentEvent {
  id: string;
  emergency_id: string;
  agent_name: 'location' | 'responder' | 'aed' | 'cpr' | 'dispatch' | 'family';
  event_type: string;
  payload: Record<string, any> | null;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      volunteers: {
        Row: Volunteer;
        Insert: Omit<Volunteer, 'id' | 'created_at'>;
        Update: Partial<Omit<Volunteer, 'id' | 'created_at'>>;
      };
      aeds: {
        Row: AED;
        Insert: Omit<AED, 'id'>;
        Update: Partial<Omit<AED, 'id'>>;
      };
      emergencies: {
        Row: Emergency;
        Insert: Omit<Emergency, 'id' | 'started_at'>;
        Update: Partial<Omit<Emergency, 'id' | 'started_at'>>;
      };
      agent_events: {
        Row: AgentEvent;
        Insert: Omit<AgentEvent, 'id' | 'created_at'>;
        Update: Partial<Omit<AgentEvent, 'id' | 'created_at'>>;
      };
    };
  };
};
