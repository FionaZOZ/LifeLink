'use client';

import Link from 'next/link';

export default function DataSourcesPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Data Sources</h1>
      <p className="text-zinc-400 mb-8">
        Every datapoint surfaced in CardiacLink is sourced from a public registry or peer-reviewed publication.
        Citations appear in code comments and UI tooltips. This page is the canonical reference.
      </p>

      <Section title="AED locations">
        <Source
          label="OpenStreetMap (Overpass API)"
          url="https://www.openstreetmap.org"
          license="ODbL"
          detail="Queried for emergency=defibrillator nodes in the greater Westside LA bounding box. Coverage is sparse (1 AED found); supplemented by UCLA EH&S data."
        />
        <Source
          label="UCLA Environmental Health & Safety AED Registry"
          url="https://map.ucla.edu"
          license="UCLA public"
          detail="20 campus buildings verified. Building centroids from OSM building footprints. Exact AED wall positions are approximate."
        />
      </Section>

      <Section title="STEMI Receiving Hospitals">
        <Source
          label="California Department of Public Health — STEMI Receiving Centers"
          url="https://www.cdph.ca.gov/Programs/CHCQ/LCP/Pages/STEMI-Receiving-Centers.aspx"
          license="CA government public"
          detail="12 LA County hospitals with 24h cath lab capability. Coordinates verified via OSM building footprints."
        />
      </Section>

      <Section title="LAFD Fire Stations">
        <Source
          label="LAFD Locations"
          url="https://www.lafd.org/locations"
          license="LAFD public"
          detail="9 stations within 10 miles of UCLA. Coordinates verified via OSM amenity=fire_station nodes."
        />
      </Section>

      <Section title="Response Time Benchmarks">
        <Source
          label="LAFD 2023 Annual Report"
          url="https://www.lafd.org"
          license="LAFD public"
          detail="Median emergency response: 6.2 min. 90th percentile: 9.5 min. Cardiac arrest first arrival: 5.8 min."
        />
        <Source
          label="Schierbeck S et al. — Drone-Delivered AEDs in OHCA"
          url="https://doi.org/10.1016/S2589-7500(23)00141-3"
          license="Lancet Digital Health 2023"
          detail="Median drone arrival: 3.7 min vs ambulance 5.5 min. 1.8 min average lead time."
        />
        <Source
          label="Buter J et al. — Strategic Placement of Volunteer Responder System Defibrillators"
          url="https://doi.org/10.1007/s10729-024-09677-8"
          license="Health Care Management Science 2024"
          detail="Walking radius cutoff: 310m. Bicycle radius cutoff: 710m."
        />
        <Source
          label="Caputo ML et al. — Volunteer Community Responders Network"
          url="https://pubmed.ncbi.nlm.nih.gov/29106973/"
          license="Resuscitation 2017"
          detail="Parallel dispatch vs sequential dispatch reduces time-to-first-responder."
        />
      </Section>

      <Section title="Multi-agent Reasoning">
        <Source
          label="Kim Y et al. — MDAgents: Adaptive Collaboration of LLMs for Medical Decision-Making"
          url="https://arxiv.org/abs/2404.15155"
          license="NeurIPS 2024 Oral"
          detail="Complexity classification framework used for triage agent decision routing."
        />
      </Section>

      <Section title="Clinical Guidelines">
        <Source
          label="American Heart Association — 2020 Guidelines for CPR & Emergency Cardiovascular Care"
          url="https://cpr.heart.org"
          license="AHA public"
          detail="110 BPM target rate, 30:2 compression-to-breath ratio, 2-2.4 inch depth."
        />
      </Section>

      <div className="mt-8">
        <Link href="/" className="text-cyan-400 hover:underline">
          &larr; Back to CardiacLink
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2 text-cyan-400">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Source({ label, url, license, detail }: { label: string; url: string; license: string; detail?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-cyan-400 font-medium">
        {label} &nearr;
      </a>
      <div className="text-xs text-zinc-500 mt-1">{license}</div>
      {detail && <div className="text-xs text-zinc-600 mt-1">{detail}</div>}
    </div>
  );
}
