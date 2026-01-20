import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY') || '';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path.endsWith('/api-key')) {
      // Return API key
      return new Response(
        JSON.stringify({ api_key: GOOGLE_MAPS_API_KEY }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (path.endsWith('/geocode')) {
      // Geocode address
      const { address } = await req.json();

      if (!address) {
        return new Response(
          JSON.stringify({ error: 'Address is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&language=ja`
      );

      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        return new Response(
          JSON.stringify({ error: `Geocoding failed: ${data.status}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const result = data.results[0];
      return new Response(
        JSON.stringify({
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formatted_address: result.formatted_address,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (path.endsWith('/distance-matrix')) {
      // Distance Matrix
      const { origins, destinations } = await req.json();

      if (!origins || !destinations) {
        return new Response(
          JSON.stringify({ error: 'Origins and destinations are required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const originsStr = origins.map((o: { lat: number; lng: number }) => `${o.lat},${o.lng}`).join('|');
      const destinationsStr = destinations
        .map((d: { lat: number; lng: number }) => `${d.lat},${d.lng}`)
        .join('|');

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&key=${GOOGLE_MAPS_API_KEY}&language=ja&units=metric`
      );

      const data = await response.json();

      if (data.status !== 'OK') {
        return new Response(
          JSON.stringify({ error: `Distance Matrix failed: ${data.status} - ${data.error_message || ''}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // 直線距離計算用のヘルパー関数
      const calculateDistance = (origin: { lat: number; lng: number }, dest: { lat: number; lng: number }): number => {
        const R = 6371000; // 地球の半径（メートル）
        const φ1 = (origin.lat * Math.PI) / 180;
        const φ2 = (dest.lat * Math.PI) / 180;
        const Δφ = ((dest.lat - origin.lat) * Math.PI) / 180;
        const Δλ = ((dest.lng - origin.lng) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
      };

      // 距離から車両での移動時間を計算（時速40km/hを仮定）
      const calculateDrivingTime = (distanceMeters: number): number => {
        const distanceKm = distanceMeters / 1000;
        const averageSpeedKmh = 40; // 市街地での平均速度（km/h）
        const timeHours = distanceKm / averageSpeedKmh;
        return Math.round(timeHours * 3600); // 秒に変換
      };

      const rows = data.rows.map((row: any, rowIndex: number) =>
        row.elements.map((element: any, elementIndex: number) => {
          if (element.status === 'OK') {
            return {
              distance: element.distance?.value || 0,
              duration: element.duration?.value || 0,
            };
          } else {
            // NOT_FOUND や他のエラーの場合、直線距離で近似
            const origin = origins[rowIndex];
            const destination = destinations[elementIndex];
            if (origin && destination) {
              const dist = calculateDistance(origin, destination);
              return {
                distance: dist,
                duration: calculateDrivingTime(dist), // 車両での移動時間を計算
              };
            }
            return {
              distance: 0,
              duration: 0,
            };
          }
        })
      );

      return new Response(JSON.stringify({ rows }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
