import { supabaseServer } from '../supabase/server';
import { calculateDistance, moveTowards } from '../utils/distance';

export async function runAEDAgent(emergencyId: string) {
  try {
    console.log(`[AEDAgent] Starting for emergency ${emergencyId}`);

    // 1. Get emergency location
    const { data: emergency, error: emergencyError } = await supabaseServer
      .from('emergencies')
      .select('patient_lat, patient_lon')
      .eq('id', emergencyId)
      .single();

    if (emergencyError || !emergency) {
      console.error('[AEDAgent] Failed to get emergency:', emergencyError);
      return;
    }

    const { patient_lat, patient_lon } = emergency;

    // 2. Find nearest AED
    const { data: aeds, error: aedsError } = await supabaseServer
      .from('aeds')
      .select('*')
      .eq('available', true);

    if (aedsError || !aeds || aeds.length === 0) {
      console.log('[AEDAgent] No AEDs available');
      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'aed',
        event_type: 'no_aeds',
        payload: { message: 'No AEDs available in the area' },
      });
      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'aed',
        event_type: 'complete',
        payload: {},
      });
      return;
    }

    // Calculate distances and find nearest
    const aedsWithDistance = aeds.map((aed) => ({
      ...aed,
      distance: calculateDistance(aed.lat, aed.lon, patient_lat, patient_lon),
    }));

    const nearestAed = aedsWithDistance.sort((a, b) => a.distance - b.distance)[0];

    // 3. Log AED located
    await supabaseServer.from('agent_events').insert({
      emergency_id: emergencyId,
      agent_name: 'aed',
      event_type: 'aed_located',
      payload: {
        aed_id: nearestAed.id,
        location: nearestAed.location_name || 'Unknown',
        distance: Math.round(nearestAed.distance),
        address: nearestAed.address,
      },
    });

    console.log(`[AEDAgent] Located AED at ${nearestAed.location_name}, ${Math.round(nearestAed.distance)}m away`);

    // 4. Find responding volunteers to assign AED retrieval
    const { data: volunteers, error: volunteersError } = await supabaseServer
      .from('volunteers')
      .select('*')
      .eq('status', 'responding');

    if (volunteersError || !volunteers || volunteers.length === 0) {
      console.log('[AEDAgent] No responding volunteers to assign');
      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'aed',
        event_type: 'complete',
        payload: { message: 'AED located but no volunteers available to retrieve' },
      });
      return;
    }

    // Find volunteer closest to the AED
    const volunteersWithDistance = volunteers.map((v) => ({
      ...v,
      distanceToAed: calculateDistance(v.lat, v.lon, nearestAed.lat, nearestAed.lon),
    }));

    const assignedVolunteer = volunteersWithDistance.sort(
      (a, b) => a.distanceToAed - b.distanceToAed
    )[0];

    // 5. Log volunteer assigned
    await supabaseServer.from('agent_events').insert({
      emergency_id: emergencyId,
      agent_name: 'aed',
      event_type: 'volunteer_assigned',
      payload: {
        volunteer_id: assignedVolunteer.id,
        volunteer_name: assignedVolunteer.name,
        distance_to_aed: Math.round(assignedVolunteer.distanceToAed),
      },
    });

    console.log(`[AEDAgent] Assigned ${assignedVolunteer.name} to retrieve AED`);

    // 6. Get route from Mapbox Directions API
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/walking/${assignedVolunteer.lon},${assignedVolunteer.lat};${nearestAed.lon},${nearestAed.lat};${patient_lon},${patient_lat}?geometries=geojson&access_token=${mapboxToken}`;

    try {
      const response = await fetch(directionsUrl);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const duration = route.duration; // seconds
        const distance = route.distance; // meters

        await supabaseServer.from('agent_events').insert({
          emergency_id: emergencyId,
          agent_name: 'aed',
          event_type: 'route_calculated',
          payload: {
            total_distance: Math.round(distance),
            estimated_time: Math.round(duration),
            waypoints: ['Current location', nearestAed.location_name || 'AED', 'Patient'],
          },
        });

        console.log(`[AEDAgent] Route calculated: ${Math.round(distance)}m, ~${Math.round(duration)}s`);
      }
    } catch (error) {
      console.error('[AEDAgent] Failed to get route:', error);
    }

    // 7. Start simulation (volunteer goes to AED, then to patient)
    simulateAEDRetrieval(
      emergencyId,
      assignedVolunteer,
      nearestAed,
      patient_lat,
      patient_lon
    );
  } catch (error) {
    console.error('[AEDAgent] Error:', error);
  }
}

async function simulateAEDRetrieval(
  emergencyId: string,
  volunteer: any,
  aed: any,
  patientLat: number,
  patientLon: number
) {
  const interval = 2000; // 2 seconds
  const movePercent = 0.15; // Move 15% closer each step

  let currentPos = { lat: volunteer.lat, lon: volunteer.lon };
  let phase: 'to_aed' | 'to_patient' = 'to_aed';
  let targetLat = aed.lat;
  let targetLon = aed.lon;

  await supabaseServer.from('agent_events').insert({
    emergency_id: emergencyId,
    agent_name: 'aed',
    event_type: 'aed_in_transit',
    payload: {
      volunteer_name: volunteer.name,
      phase: 'retrieving_aed',
    },
  });

  const intervalId = setInterval(async () => {
    try {
      const distance = calculateDistance(
        currentPos.lat,
        currentPos.lon,
        targetLat,
        targetLon
      );

      // Check if reached target
      if (distance < 20) {
        if (phase === 'to_aed') {
          // Reached AED, now go to patient
          phase = 'to_patient';
          targetLat = patientLat;
          targetLon = patientLon;

          await supabaseServer.from('agent_events').insert({
            emergency_id: emergencyId,
            agent_name: 'aed',
            event_type: 'aed_retrieved',
            payload: {
              volunteer_name: volunteer.name,
              location: aed.location_name,
            },
          });

          await supabaseServer.from('agent_events').insert({
            emergency_id: emergencyId,
            agent_name: 'aed',
            event_type: 'aed_in_transit',
            payload: {
              volunteer_name: volunteer.name,
              phase: 'delivering_to_patient',
            },
          });

          console.log(`[AEDAgent] ${volunteer.name} retrieved AED, heading to patient`);
        } else {
          // Reached patient with AED
          clearInterval(intervalId);

          await supabaseServer.from('agent_events').insert({
            emergency_id: emergencyId,
            agent_name: 'aed',
            event_type: 'aed_arrived',
            payload: {
              volunteer_name: volunteer.name,
            },
          });

          await supabaseServer.from('agent_events').insert({
            emergency_id: emergencyId,
            agent_name: 'aed',
            event_type: 'complete',
            payload: {},
          });

          console.log(`[AEDAgent] AED delivered to patient - Complete`);
        }
      } else {
        // Move towards target
        const newPos = moveTowards(
          currentPos.lat,
          currentPos.lon,
          targetLat,
          targetLon,
          movePercent
        );
        currentPos = newPos;

        // Update volunteer position in database
        await supabaseServer
          .from('volunteers')
          .update({ lat: newPos.lat, lon: newPos.lon })
          .eq('id', volunteer.id);
      }
    } catch (error) {
      console.error('[AEDAgent] Simulation error:', error);
      clearInterval(intervalId);
    }
  }, interval);
}
