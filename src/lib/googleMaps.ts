const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address: string;
}

export interface DistanceMatrixResult {
  distance: number; // meters
  duration: number; // seconds
}

/**
 * 2点間の直線距離を計算（ハーバーサイン公式）
 */
function calculateStraightLineDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): number {
  const R = 6371000; // 地球の半径（メートル）
  const φ1 = (origin.lat * Math.PI) / 180;
  const φ2 = (destination.lat * Math.PI) / 180;
  const Δφ = ((destination.lat - origin.lat) * Math.PI) / 180;
  const Δλ = ((destination.lng - origin.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 距離から車両での移動時間を計算（時速40km/hを仮定、市街地を考慮）
 */
function calculateDrivingTime(distanceMeters: number): number {
  const distanceKm = distanceMeters / 1000;
  const averageSpeedKmh = 40; // 市街地での平均速度（km/h）
  const timeHours = distanceKm / averageSpeedKmh;
  return Math.round(timeHours * 3600); // 秒に変換
}

/**
 * Google Maps Geocoding APIを使用して住所を座標に変換
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  if (SUPABASE_URL) {
    // Edge Function経由で取得
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-maps-proxy/geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.warn('Edge Function failed, falling back to direct API:', error);
      // Fall through to direct API call
    }
  }

  // 直接APIを呼ぶ場合
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is not set');
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&language=ja`
  );

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' || !data.results || data.results.length === 0) {
    throw new Error(`Geocoding failed: ${data.status}`);
  }

  const result = data.results[0];
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formatted_address: result.formatted_address,
  };
}

/**
 * Google Maps Distance Matrix APIを使用して距離と時間を計算
 */
export async function getDistanceMatrix(
  origins: Array<{ lat: number; lng: number }>,
  destinations: Array<{ lat: number; lng: number }>
): Promise<DistanceMatrixResult[][]> {
  if (SUPABASE_URL) {
    // Edge Function経由で取得
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-maps-proxy/distance-matrix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ origins, destinations }),
      });

      if (!response.ok) {
        throw new Error(`Distance Matrix failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('Edge Function response:', data);
      
      if (!data.rows || !Array.isArray(data.rows)) {
        console.error('Invalid response format from Edge Function:', data);
        throw new Error('Invalid response format from Edge Function');
      }

      const result = data.rows.map((row: any, rowIndex: number) => {
        if (!row.elements || !Array.isArray(row.elements)) {
          console.error(`Invalid row format at index ${rowIndex}:`, row);
          return [];
        }
        return row.elements.map((element: any, elementIndex: number) => {
          if (element.status !== 'OK') {
            console.warn(`Element [${rowIndex}][${elementIndex}] status not OK:`, element.status, element);
            // NOT_FOUNDの場合は直線距離で近似計算を試みる
            if (element.status === 'NOT_FOUND' && origins[rowIndex] && destinations[elementIndex]) {
              const dist = calculateStraightLineDistance(
                origins[rowIndex],
                destinations[elementIndex]
              );
              return {
                distance: dist,
                duration: calculateDrivingTime(dist), // 車両での移動時間を計算
              };
            }
            return { distance: 0, duration: 0 };
          }
          return {
            distance: element.distance?.value || 0,
            duration: element.duration?.value || 0,
          };
        });
      });

      return result;
    } catch (error) {
      console.warn('Edge Function failed, falling back to direct API:', error);
      // Fall through to direct API call
    }
  }

  // 直接APIを呼ぶ場合
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is not set');
  }

  const originsStr = origins.map((o) => `${o.lat},${o.lng}`).join('|');
  const destinationsStr = destinations.map((d) => `${d.lat},${d.lng}`).join('|');

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&key=${GOOGLE_MAPS_API_KEY}&language=ja&units=metric&mode=driving`;
  
  console.log('Distance Matrix API呼び出し (直接):', {
    originsCount: origins.length,
    destinationsCount: destinations.length,
    originsSample: origins.slice(0, 2),
    destinationsSample: destinations.slice(0, 2),
  });

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Distance Matrix API HTTP error:', response.status, errorText);
    throw new Error(`Distance Matrix failed: ${response.statusText}`);
  }

  const data = await response.json();

  console.log('Distance Matrix API response:', {
    status: data.status,
    error_message: data.error_message,
    rowsCount: data.rows?.length,
    firstRowFirstElement: data.rows?.[0]?.elements?.[0],
  });

  if (data.status !== 'OK') {
    console.error('Distance Matrix API error:', data);
    throw new Error(`Distance Matrix failed: ${data.status} - ${data.error_message || JSON.stringify(data)}`);
  }

  // レスポンスを検証
  if (!data.rows || !Array.isArray(data.rows)) {
    console.error('Invalid response format:', data);
    throw new Error('Invalid response format from Distance Matrix API');
  }

  const result = data.rows.map((row: any, rowIndex: number) => {
    if (!row.elements || !Array.isArray(row.elements)) {
      console.error(`Invalid row format at index ${rowIndex}:`, row);
      return [];
    }
    return row.elements.map((element: any, elementIndex: number) => {
      if (element.status !== 'OK') {
        console.warn(`Element [${rowIndex}][${elementIndex}] status not OK:`, element.status, element);
        // NOT_FOUNDの場合は直線距離で近似計算
        if (element.status === 'NOT_FOUND' && origins[rowIndex] && destinations[elementIndex]) {
          const dist = calculateStraightLineDistance(
            origins[rowIndex],
            destinations[elementIndex]
          );
          console.log(`Using straight-line distance for NOT_FOUND: ${dist}m`);
          return {
            distance: dist,
            duration: calculateDrivingTime(dist), // 車両での移動時間を計算
          };
        }
        return { distance: 0, duration: 0 };
      }
      return {
        distance: element.distance?.value || 0,
        duration: element.duration?.value || 0,
      };
    });
  });

  console.log('Distance Matrix result:', {
    rows: result.length,
    elementsPerRow: result.map((r) => r.length),
    sampleData: result[0]?.[0],
  });

  return result;
}
