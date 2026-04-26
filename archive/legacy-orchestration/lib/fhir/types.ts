// Minimal FHIR R4 types — just the resources we use.
// Reference: https://www.hl7.org/fhir/R4

export interface FhirReference {
  reference: string;     // e.g. "Patient/anon-12345"
}

export interface FhirCoding {
  system: string;
  code: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding: FhirCoding[];
  text?: string;
}

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  identifier: Array<{ system: string; value: string }>;
  // No PII — anonymous record only
}

export interface FhirEncounter {
  resourceType: 'Encounter';
  id: string;
  status: 'finished' | 'in-progress';
  class: { code: 'EMER'; display: 'emergency' };
  subject: FhirReference;
  period: { start: string; end?: string };
  location?: Array<{
    location: FhirReference;
    period?: { start: string; end?: string };
  }>;
  serviceProvider?: FhirReference;
  reasonCode?: FhirCodeableConcept[];
}

export interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  status: 'final' | 'preliminary';
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  valueBoolean?: boolean;
}

export interface FhirProcedure {
  resourceType: 'Procedure';
  id: string;
  status: 'completed' | 'in-progress';
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  performedPeriod?: { start: string; end?: string };
}

export interface FhirBundleEntry {
  fullUrl: string;
  resource: FhirPatient | FhirEncounter | FhirObservation | FhirProcedure;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'document' | 'message' | 'transaction' | 'collection';
  timestamp: string;
  entry: FhirBundleEntry[];
}
