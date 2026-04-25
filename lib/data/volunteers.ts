// Synthetic volunteer responder pool for the /demo orchestration view.
// Schema mirrors PulsePoint Respond's responder model so the integration shape
// matches a production Good Samaritan dispatch system.
//
// For the hackathon: positions are real UCLA campus buildings; identifiers are
// synthetic. Production would source these from a verified responder registry.

export interface DemoVolunteer {
  id: string;
  name: string;            // anonymized: "Volunteer A", etc.
  startLat: number;
  startLon: number;
  startBuilding: string;
  trainingLevel: 'BLS' | 'ACLS' | 'EMR' | 'Lay';
  hasAed: boolean;         // does this volunteer carry their own AED?
  walkSpeedMps: number;    // ~1.4 m/s normal, 1.8 m/s urgent jog
  arrivalDelaySeconds: number; // delay before they "see" the alert and start moving
}

// 5 volunteers scattered across UCLA campus. Distinct buildings so animation
// trajectories don't overlap visually.
export const UCLA_VOLUNTEERS: DemoVolunteer[] = [
  {
    id: 'vol-a',
    name: 'Volunteer A',
    startBuilding: 'Kerckhoff Hall',
    startLat: 34.0709,
    startLon: -118.4436,
    trainingLevel: 'BLS',
    hasAed: false,
    walkSpeedMps: 1.8,
    arrivalDelaySeconds: 0.2,
  },
  {
    id: 'vol-b',
    name: 'Volunteer B',
    startBuilding: 'Boelter Hall',
    startLat: 34.0691,
    startLon: -118.4431,
    trainingLevel: 'EMR',
    hasAed: true,         // EMR carries their own AED — backup if drone delayed
    walkSpeedMps: 1.7,
    arrivalDelaySeconds: 0.3,
  },
  {
    id: 'vol-c',
    name: 'Volunteer C',
    startBuilding: 'Anderson School of Management',
    startLat: 34.0743,
    startLon: -118.4434,
    trainingLevel: 'BLS',
    hasAed: false,
    walkSpeedMps: 1.6,
    arrivalDelaySeconds: 0.5,
  },
  {
    id: 'vol-d',
    name: 'Volunteer D',
    startBuilding: 'De Neve Plaza',
    startLat: 34.0732,
    startLon: -118.4512,
    trainingLevel: 'Lay',
    hasAed: false,
    walkSpeedMps: 1.5,
    arrivalDelaySeconds: 0.6,
  },
  {
    id: 'vol-e',
    name: 'Volunteer E',
    startBuilding: 'Drake Stadium',
    startLat: 34.0677,
    startLon: -118.4486,
    trainingLevel: 'ACLS',
    hasAed: false,
    walkSpeedMps: 1.7,
    arrivalDelaySeconds: 0.4,
  },
];
