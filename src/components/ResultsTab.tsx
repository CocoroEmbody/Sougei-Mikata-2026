import { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, CheckCircle2, MapPin, Clock, Route } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { optimizeRoutes } from '../lib/routeOptimizer';
import { loadRequests, loadResources } from '../lib/storage';
import RouteMap from './RouteMap';
import type { OptimizedRoute, UserRequest, ResourceAssignment, Facility, Vehicle, Driver, User, OptimizationError } from '../types';

export default function ResultsTab() {
  const [routes, setRoutes] = useState<OptimizedRoute[]>([]);
  const [errors, setErrors] = useState<OptimizationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      if (!supabaseUrl || supabaseUrl.includes('your-') || supabaseUrl === '') {
        console.warn('Supabase環境変数が設定されていません');
        return;
      }

      const [facilitiesResult, vehiclesResult, driversResult, usersResult] = await Promise.all([
        supabase.from('facilities').select('*').order('name'),
        supabase.from('vehicles').select('*').order('name'),
        supabase.from('drivers').select('*').order('name'),
        supabase.from('users').select('*').order('name'),
      ]);

      if (facilitiesResult.error) {
        console.error('Error loading facilities:', facilitiesResult.error);
        throw facilitiesResult.error;
      }
      if (vehiclesResult.error) {
        console.error('Error loading vehicles:', vehiclesResult.error);
        throw vehiclesResult.error;
      }
      if (driversResult.error) {
        console.error('Error loading drivers:', driversResult.error);
        throw driversResult.error;
      }
      if (usersResult.error) {
        console.error('Error loading users:', usersResult.error);
        throw usersResult.error;
      }

      setFacilities(facilitiesResult.data || []);
      setVehicles(vehiclesResult.data || []);
      setDrivers(driversResult.data || []);
      setUsers(usersResult.data || []);

      console.log('Loaded data:', {
        facilities: facilitiesResult.data?.length || 0,
        vehicles: vehiclesResult.data?.length || 0,
        drivers: driversResult.data?.length || 0,
        users: usersResult.data?.length || 0,
        vehiclesDetail: vehiclesResult.data?.map(v => ({
          name: v.name,
          capacity: v.capacity,
          welfare_vehicle: v.welfare_vehicle,
          wheelchair_capacity: v.wheelchair_capacity,
        })),
      });
    } catch (error) {
      console.error('Error loading data:', error);
      alert(`データの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleOptimize = async () => {
    setLoading(true);
    setRoutes([]);
    setErrors([]);

    try {
      const requests = loadRequests();
      const assignments = loadResources();

      if (requests.filter((r) => r.selected).length === 0) {
        alert('送迎が必要な利用者を選択してください（本日のリクエストタブ）');
        setLoading(false);
        return;
      }

      if (assignments.length === 0) {
        alert('リソース割り当てを設定してください（リソース設定タブ）');
        setLoading(false);
        return;
      }

      const result = await optimizeRoutes(
        requests,
        assignments,
        facilities,
        vehicles,
        drivers,
        users
      );

      setRoutes(result.routes);
      setErrors(result.errors);
    } catch (error) {
      console.error('Error optimizing routes:', error);
      alert('ルート最適化に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">最適化結果</h2>
        <p className="text-gray-600">
          AIルート計算ボタンをクリックして、最適な送迎ルートを生成します
        </p>
      </div>

      <div className="mb-6 flex justify-center">
        <button
          onClick={handleOptimize}
          disabled={loading}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-4 rounded-lg hover:from-blue-700 hover:to-blue-900 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              計算中...
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              AIルート計算
            </>
          )}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-800">エラー</h3>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {routes.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Route className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">AIルート計算ボタンをクリックしてルートを生成してください</p>
        </div>
      )}

      {routes.length > 0 && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-800">
                ルートが {routes.length} 件生成されました
              </h3>
            </div>
          </div>

          {routes.map((route, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
                <h3 className="text-xl font-bold mb-2">ルート {index + 1}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="opacity-75">車両:</span>
                    <div className="font-semibold">{route.vehicle_name}</div>
                  </div>
                  <div>
                    <span className="opacity-75">ドライバー:</span>
                    <div className="font-semibold">{route.driver_name}</div>
                  </div>
                  <div>
                    <span className="opacity-75">施設:</span>
                    <div className="font-semibold">{route.facility_name}</div>
                  </div>
                  <div>
                    <span className="opacity-75">利用者数:</span>
                    <div className="font-semibold">{route.stops.length}名</div>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Route className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-500">総距離</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatDistance(route.total_distance)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-500">総時間</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatDuration(route.total_duration)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">停車地</h4>
                  <div className="space-y-3">
                    {route.stops.map((stop, stopIndex) => (
                      <div
                        key={stop.stop_number}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                          {stop.stop_number}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{stop.user_name}</div>
                          <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                            <MapPin className="w-4 h-4" />
                            {stop.address}
                          </div>
                          {stop.arrival_time && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                              <Clock className="w-4 h-4" />
                              到着予定: {stop.arrival_time}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Google Maps ルート表示 */}
      {routes.length > 0 && (
        <div className="mt-6">
          <RouteMap routes={routes} facilities={facilities} />
        </div>
      )}
    </div>
  );
}
