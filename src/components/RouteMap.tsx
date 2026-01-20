import { useEffect, useRef } from 'react';
import type { OptimizedRoute, Facility } from '../types';

interface RouteMapProps {
  routes: OptimizedRoute[];
  facilities: Facility[];
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function RouteMap({ routes, facilities }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any[]>([]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey.includes('your-') || !mapRef.current) {
      return;
    }

    // Google Maps APIが読み込まれていない場合
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&libraries=places,directions`;
      script.async = true;
      script.defer = true;
      
      window.initMap = () => {
        initializeMap();
      };
      
      document.head.appendChild(script);
      return;
    }

    initializeMap();

    function initializeMap() {
      if (!mapRef.current || !window.google) return;

      // 既存のレンダラーをクリア
      directionsRendererRef.current.forEach((renderer) => {
        if (renderer && renderer.setMap) {
          renderer.setMap(null);
        }
      });
      directionsRendererRef.current = [];

      // 地図の初期化
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 35.6812, lng: 139.7671 }, // 東京駅をデフォルト
        mapTypeControl: true,
        streetViewControl: true,
      });

      // 地図が完全に読み込まれるまで待つ
      window.google.maps.event.addListenerOnce(map, 'idle', () => {
        mapInstanceRef.current = map;
        directionsServiceRef.current = new window.google.maps.DirectionsService();

        // 各ルートを表示
        routes.forEach((route, routeIndex) => {
          if (route.stops.length === 0) return;

          const facility = facilities.find((f) => f.id === route.facility_id);
          if (!facility) return;

          // 地図インスタンスが確実に存在することを確認
          if (!mapInstanceRef.current) {
            console.error('Map instance not available');
            return;
          }

          const directionsRenderer = new window.google.maps.DirectionsRenderer({
            map: mapInstanceRef.current,
            suppressMarkers: false,
            polylineOptions: {
              strokeColor: getRouteColor(routeIndex),
              strokeWeight: 4,
              strokeOpacity: 0.8,
            },
          });

          directionsRendererRef.current.push(directionsRenderer);

        // ルートの座標を準備
        const waypoints = route.stops.map((stop) => ({
          location: { lat: stop.lat, lng: stop.lng },
          stopover: true,
        }));

        const request: any = {
          origin: { lat: facility.lat, lng: facility.lng },
          destination: { lat: facility.lat, lng: facility.lng },
          waypoints: waypoints,
          optimizeWaypoints: false,
          travelMode: window.google.maps.TravelMode.DRIVING,
        };

          directionsServiceRef.current.route(request, (result: any, status: any) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              // 地図インスタンスが存在することを確認
              if (!mapInstanceRef.current) {
                console.error('Map instance not available when setting directions');
                return;
              }

              try {
                directionsRenderer.setDirections(result);
              } catch (error) {
                console.error('Error setting directions:', error);
                return;
              }
              
              // マーカーを追加
              route.stops.forEach((stop, stopIndex) => {
                try {
                  new window.google.maps.Marker({
                    position: { lat: stop.lat, lng: stop.lng },
                    map: mapInstanceRef.current,
                    label: {
                      text: `${stopIndex + 1}`,
                      color: 'white',
                      fontWeight: 'bold',
                    },
                    title: `${stop.stop_number}. ${stop.user_name}`,
                    icon: {
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: 8,
                      fillColor: getRouteColor(routeIndex),
                      fillOpacity: 1,
                      strokeColor: 'white',
                      strokeWeight: 2,
                    },
                  });
                } catch (error) {
                  console.error('Error creating marker:', error);
                }
              });

              // 施設マーカーを追加
              try {
                new window.google.maps.Marker({
                  position: { lat: facility.lat, lng: facility.lng },
                  map: mapInstanceRef.current,
                  icon: {
                    path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    scale: 8,
                    fillColor: '#FF0000',
                    fillOpacity: 1,
                    strokeColor: 'white',
                    strokeWeight: 2,
                  },
                  title: `施設: ${facility.name}`,
                });
              } catch (error) {
                console.error('Error creating facility marker:', error);
              }
            } else {
              console.error('Directions request failed:', status);
            }
          });
        });

        // すべてのマーカーが表示されるようにズーム調整
        if (routes.length > 0 && mapInstanceRef.current) {
          const bounds = new window.google.maps.LatLngBounds();
          
          routes.forEach((route) => {
            const facility = facilities.find((f) => f.id === route.facility_id);
            if (facility) {
              bounds.extend(new window.google.maps.LatLng(facility.lat, facility.lng));
            }
            route.stops.forEach((stop) => {
              bounds.extend(new window.google.maps.LatLng(stop.lat, stop.lng));
            });
          });
          
          if (bounds.getNorthEast().lat() !== bounds.getSouthWest().lat() ||
              bounds.getNorthEast().lng() !== bounds.getSouthWest().lng()) {
            mapInstanceRef.current.fitBounds(bounds);
          }
        }
      });
    }
  }, [routes, facilities]);

  const getRouteColor = (index: number): string => {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#84CC16', // lime
    ];
    return colors[index % colors.length];
  };

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const hasApiKey = apiKey && !apiKey.includes('your-') && apiKey !== '';

  if (!hasApiKey) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          Google Maps APIキーが設定されていないため、地図を表示できません。
          .env.localファイルにVITE_GOOGLE_MAPS_API_KEYを設定してください。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">ルートマップ</h3>
        <p className="text-sm text-gray-600 mt-1">
          {routes.length}件のルートを表示中
        </p>
      </div>
      <div ref={mapRef} className="w-full h-[500px]" />
    </div>
  );
}
