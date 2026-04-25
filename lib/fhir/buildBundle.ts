import type { ScenarioState } from '../useEmergencyTelemetry';
import type {
  FhirBundle,
  FhirPatient,
  FhirEncounter,
  FhirObservation,
  FhirProcedure,
  FhirBundleEntry,
} from './types';

function uuid() {
  return crypto.randomUUID();
}

export function buildHandoffBundle(state: ScenarioState, scenarioName: string): FhirBundle {
  const bundleId = uuid();
  const patientId = `anon-${uuid()}`;
  const encounterId = uuid();
  const startTime = new Date(Date.now() - state.elapsed * 1000).toISOString();
  const endTime = new Date().toISOString();

  const patient: FhirPatient = {
    resourceType: 'Patient',
    id: patientId,
    identifier: [
      { system: 'urn:cardiaclink:session', value: bundleId },
    ],
  };

  const encounter: FhirEncounter = {
    resourceType: 'Encounter',
    id: encounterId,
    status: 'finished',
    class: { code: 'EMER', display: 'emergency' },
    subject: { reference: `Patient/${patientId}` },
    period: { start: startTime, end: endTime },
    location: state.hospital ? [{
      location: { reference: `Location/${state.hospital.name.replace(/\s+/g, '-')}` },
    }] : undefined,
    reasonCode: [{
      coding: [{
        system: 'http://snomed.info/sct',
        code: '410429000',
        display: 'Cardiac arrest',
      }],
      text: scenarioName,
    }],
  };

  const observations: FhirObservation[] = [];

  // Compression rate observation (CPR was at 110 BPM)
  observations.push({
    resourceType: 'Observation',
    id: uuid(),
    status: 'final',
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '8867-4',
        display: 'Heart rate',
      }],
      text: 'CPR compression rate (target)',
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    effectiveDateTime: endTime,
    valueQuantity: { value: 110, unit: '/min', system: 'http://unitsofmeasure.org', code: '/min' },
  });

  // Compressions delivered (estimate: 110 BPM * elapsed_minutes_during_cpr)
  const cprMinutes = (state.elapsed / 60) * 0.5;
  observations.push({
    resourceType: 'Observation',
    id: uuid(),
    status: 'final',
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '67708-4',
        display: 'CPR compressions delivered',
      }],
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    effectiveDateTime: endTime,
    valueQuantity: { value: Math.round(cprMinutes * 110), unit: 'compressions' },
  });

  // AED used flag
  observations.push({
    resourceType: 'Observation',
    id: uuid(),
    status: 'final',
    code: {
      coding: [{
        system: 'urn:cardiaclink:event',
        code: 'aed-deployed',
        display: 'AED deployed by drone',
      }],
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    effectiveDateTime: endTime,
    valueBoolean: state.drone?.status === 'delivered',
  });

  // Drone delivery time observation
  if (state.drone) {
    observations.push({
      resourceType: 'Observation',
      id: uuid(),
      status: 'final',
      code: {
        coding: [{
          system: 'urn:cardiaclink:event',
          code: 'drone-delivery-eta',
          display: 'Drone-delivered AED ETA at session start',
        }],
      },
      subject: { reference: `Patient/${patientId}` },
      encounter: { reference: `Encounter/${encounterId}` },
      effectiveDateTime: endTime,
      valueQuantity: { value: state.drone.eta_seconds, unit: 's' },
    });
  }

  // CPR procedure
  const procedure: FhirProcedure = {
    resourceType: 'Procedure',
    id: uuid(),
    status: 'completed',
    code: {
      coding: [{
        system: 'http://snomed.info/sct',
        code: '89666000',
        display: 'Cardiopulmonary resuscitation',
      }],
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    performedPeriod: { start: startTime, end: endTime },
  };

  const entries: FhirBundleEntry[] = [
    { fullUrl: `urn:uuid:${patientId}`, resource: patient },
    { fullUrl: `urn:uuid:${encounterId}`, resource: encounter },
    ...observations.map(o => ({ fullUrl: `urn:uuid:${o.id}`, resource: o })),
    { fullUrl: `urn:uuid:${procedure.id}`, resource: procedure },
  ];

  return {
    resourceType: 'Bundle',
    id: bundleId,
    type: 'document',
    timestamp: endTime,
    entry: entries,
  };
}
