import { supabaseServer } from '../supabase/server';

export async function runLocationAgent(emergencyId: string) {
  try {
    console.log(`[LocationAgent] Starting for emergency ${emergencyId}`);

    // 1. Get emergency location
    const { data: emergency, error: emergencyError } = await supabaseServer
      .from('emergencies')
      .select('patient_lat, patient_lon')
      .eq('id', emergencyId)
      .single();

    if (emergencyError || !emergency) {
      console.error('[LocationAgent] Failed to get emergency:', emergencyError);
      return;
    }

    const { patient_lat, patient_lon } = emergency;

    // 2. Log GPS acquired
    await supabaseServer.from('agent_events').insert({
      emergency_id: emergencyId,
      agent_name: 'location',
      event_type: 'gps_acquired',
      payload: {
        lat: patient_lat,
        lon: patient_lon,
        accuracy_m: 10,
      },
    });

    console.log('[LocationAgent] GPS acquired:', patient_lat, patient_lon);

    // 3. Reverse geocode using Mapbox
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${patient_lon},${patient_lat}.json?access_token=${mapboxToken}`;

    try {
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      const address =
        data.features && data.features.length > 0
          ? data.features[0].place_name
          : `${patient_lat.toFixed(4)}, ${patient_lon.toFixed(4)}`;

      // 4. Log address resolved
      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'location',
        event_type: 'address_resolved',
        payload: {
          address,
        },
      });

      console.log('[LocationAgent] Address resolved:', address);
    } catch (geocodeError) {
      console.error('[LocationAgent] Geocoding failed:', geocodeError);
      // Log fallback address
      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'location',
        event_type: 'address_resolved',
        payload: {
          address: `${patient_lat.toFixed(4)}, ${patient_lon.toFixed(4)}`,
        },
      });
    }

    // 5. Log complete
    await supabaseServer.from('agent_events').insert({
      emergency_id: emergencyId,
      agent_name: 'location',
      event_type: 'complete',
      payload: {},
    });

    console.log('[LocationAgent] Complete');
  } catch (error) {
    console.error('[LocationAgent] Error:', error);
  }
}
