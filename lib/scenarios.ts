/**
 * Canonical emergency scenarios for CardiacLink demo and testing.
 * Complete specification with patient location, helpers, AEDs, and EMS data.
 */

export type ScenarioId = 'royce-hall' | 'pauley-pavilion' | 'bruin-walk';

export interface Scenario {
  id: ScenarioId;
  label: string;
  narrative: string;
  chatPrompt: string;
  patient: { lat: number; lon: number; address: string };
  helpers: Array<{ id: string; name: string; role: string; lat: number; lon: number; color: string }>;
  aeds: Array<{ id: string; name: string; lat: number; lon: number }>;
  ems: { lat: number; lon: number; unit: string };
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  'royce-hall': {
    id: 'royce-hall',
    label: 'Royce Hall Collapse',
    narrative: 'Student collapses during a Royce Hall lecture.',
    chatPrompt: 'Cardiac arrest at Royce Hall',
    patient: { lat: 34.0727, lon: -118.4421, address: 'Royce Hall, UCLA' },
    helpers: [
      { id: 'marcus', name: 'Marcus', role: 'CPR Tier 2',   lat: 34.0732, lon: -118.4438, color: '#3b82f6' },
      { id: 'sarah',  name: 'Sarah',  role: 'AED bringer',  lat: 34.0721, lon: -118.4408, color: '#10b981' },
      { id: 'jordan', name: 'Jordan', role: 'CPR Tier 1',   lat: 34.0738, lon: -118.4415, color: '#a855f7' },
    ],
    aeds: [
      { id: 'powell', name: 'Powell Library AED', lat: 34.0716, lon: -118.4419 },
      { id: 'kaplan', name: 'Kaplan Hall AED',    lat: 34.0729, lon: -118.4404 },
    ],
    ems: { lat: 34.0759, lon: -118.4392, unit: 'LAFD ALS Rescue 37' },
  },
  'pauley-pavilion': {
    id: 'pauley-pavilion',
    label: 'Pauley Pavilion Game',
    narrative: 'Spectator cardiac arrest during a Pauley Pavilion event.',
    chatPrompt: 'Cardiac arrest at Pauley Pavilion',
    patient: { lat: 34.0703, lon: -118.4470, address: 'Pauley Pavilion, UCLA' },
    helpers: [
      { id: 'marcus', name: 'Marcus', role: 'CPR Tier 2',  lat: 34.0710, lon: -118.4458, color: '#3b82f6' },
      { id: 'sarah',  name: 'Sarah',  role: 'AED bringer', lat: 34.0698, lon: -118.4480, color: '#10b981' },
      { id: 'jordan', name: 'Jordan', role: 'CPR Tier 1',  lat: 34.0712, lon: -118.4475, color: '#a855f7' },
    ],
    aeds: [
      { id: 'pauley',   name: 'Pauley Pavilion AED',     lat: 34.0701, lon: -118.4468 },
      { id: 'jdmorgan', name: 'J.D. Morgan Center AED',  lat: 34.0712, lon: -118.4458 },
    ],
    ems: { lat: 34.0759, lon: -118.4392, unit: 'LAFD ALS Rescue 37' },
  },
  'bruin-walk': {
    id: 'bruin-walk',
    label: 'Bruin Walk Incident',
    narrative: 'Jogger collapses on Bruin Walk near Ackerman Union.',
    chatPrompt: 'Jogger collapse on Bruin Walk',
    patient: { lat: 34.0710, lon: -118.4445, address: 'Bruin Walk near Ackerman' },
    helpers: [
      { id: 'marcus', name: 'Marcus', role: 'CPR Tier 2',  lat: 34.0716, lon: -118.4438, color: '#3b82f6' },
      { id: 'sarah',  name: 'Sarah',  role: 'AED bringer', lat: 34.0703, lon: -118.4452, color: '#10b981' },
      { id: 'jordan', name: 'Jordan', role: 'CPR Tier 1',  lat: 34.0708, lon: -118.4458, color: '#a855f7' },
    ],
    aeds: [
      { id: 'ackerman',  name: 'Ackerman Union AED', lat: 34.0705, lon: -118.4450 },
      { id: 'kerckhoff', name: 'Kerckhoff Hall AED', lat: 34.0708, lon: -118.4441 },
    ],
    ems: { lat: 34.0759, lon: -118.4392, unit: 'LAFD ALS Rescue 37' },
  },
};

/**
 * Get scenario by ID, with fallback to default if not found.
 */
export function getScenario(id: string): Scenario {
  return SCENARIOS[id as ScenarioId] || SCENARIOS['royce-hall'];
}

/**
 * List all scenario IDs.
 */
export function getScenarioIds(): ScenarioId[] {
  return Object.keys(SCENARIOS) as ScenarioId[];
}
