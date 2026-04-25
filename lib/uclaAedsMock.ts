// Phase 1 mock dataset. Phase 2 will replace this with the AED agent's bus response sourced from `bus/datasets/ucla_aeds.py`.

export type UclaAed = {
  id: string;
  name: string;
  building: string;
  lat: number;
  lon: number;
  padsAvailable: boolean;
};

export const UCLA_AEDS_MOCK: UclaAed[] = [
  { id: 'ucla-royce',     name: 'Royce Hall — Lobby',          building: 'Royce Hall',          lat: 34.0727, lon: -118.4421, padsAvailable: true },
  { id: 'ucla-powell',    name: 'Powell Library — Main Floor', building: 'Powell Library',      lat: 34.0716, lon: -118.4421, padsAvailable: true },
  { id: 'ucla-pauley',    name: 'Pauley Pavilion — Concourse', building: 'Pauley Pavilion',     lat: 34.0703, lon: -118.4470, padsAvailable: true },
  { id: 'ucla-ackerman',  name: 'Ackerman Union — 1st Floor',  building: 'Ackerman Union',      lat: 34.0708, lon: -118.4441, padsAvailable: true },
  { id: 'ucla-wooden',    name: 'John Wooden Center — Lobby',  building: 'Wooden Center',       lat: 34.0707, lon: -118.4452, padsAvailable: true },
  { id: 'ucla-boelter',   name: 'Boelter Hall — Lobby',        building: 'Boelter Hall',        lat: 34.0689, lon: -118.4435, padsAvailable: false },
  { id: 'ucla-eng-vi',    name: 'Engineering VI — 1st Floor',  building: 'Engineering VI',      lat: 34.0696, lon: -118.4436, padsAvailable: true },
  { id: 'ucla-cos',       name: 'Court of Sciences — Plaza',   building: 'Young Hall',          lat: 34.0691, lon: -118.4406, padsAvailable: true },
  { id: 'ucla-anderson',  name: 'Anderson School — Atrium',    building: 'Anderson School',     lat: 34.0743, lon: -118.4434, padsAvailable: true },
  { id: 'ucla-rrmc',      name: 'Ronald Reagan UCLA — Lobby',  building: 'Ronald Reagan UCLA',  lat: 34.0664, lon: -118.4452, padsAvailable: true },
  { id: 'ucla-hedrick',   name: 'Hedrick Hall — Lobby',        building: 'Hedrick Hall',        lat: 34.0734, lon: -118.4509, padsAvailable: true },
  { id: 'ucla-deneve',    name: 'De Neve Plaza — Lobby',       building: 'De Neve Plaza',       lat: 34.0718, lon: -118.4502, padsAvailable: true },
];
