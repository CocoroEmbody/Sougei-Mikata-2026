import type { UserRequest, ResourceAssignment, OptimizedRoute, RouteStop, Facility, Vehicle, Driver, User } from '../types';
import { getDistanceMatrix, type DistanceMatrixResult } from './googleMaps';

/**
 * 時間を30分のウィンドウにグループ化
 */
function getTimeWindow(pickupTime: string | undefined): string {
  if (!pickupTime) return '00:00';
  const [hours, minutes] = pickupTime.split(':').map(Number);
  const windowMinutes = Math.floor(minutes / 30) * 30;
  return `${String(hours).padStart(2, '0')}:${String(windowMinutes).padStart(2, '0')}`;
}

/**
 * 最近傍法でルートを最適化
 */
async function optimizeRouteWithNearestNeighbor(
  stops: Array<{ user_id: string; lat: number; lng: number }>,
  facility: { lat: number; lng: number }
): Promise<string[]> {
  if (stops.length === 0) return [];
  if (stops.length === 1) return [stops[0].user_id];

  const visited = new Set<string>();
  const route: string[] = [];
  let current = facility;

  while (visited.size < stops.length) {
    let nearest: { user_id: string; lat: number; lng: number } | null = null;
    let minDistance = Infinity;

    for (const stop of stops) {
      if (visited.has(stop.user_id)) continue;

      const distance = Math.sqrt(
        Math.pow(stop.lat - current.lat, 2) + Math.pow(stop.lng - current.lng, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = stop;
      }
    }

    if (nearest) {
      route.push(nearest.user_id);
      visited.add(nearest.user_id);
      current = nearest;
    }
  }

  return route;
}

/**
 * 同じ位置のピックアップをまとめる（より緩い閾値で近い場所もまとめる）
 */
function groupByLocation(requests: UserRequest[], thresholdKm: number = 0.5): Map<string, UserRequest[]> {
  const groups = new Map<string, UserRequest[]>();
  const thresholdMeters = thresholdKm * 1000;

  for (const request of requests) {
    if (!request.selected) continue;

    const user = request.user;
    const lat = user.pickup_lat ?? user.lat;
    const lng = user.pickup_lng ?? user.lng;

    // 既存のグループに近い場所があるかチェック
    let foundGroup = false;
    for (const [key, groupRequests] of groups.entries()) {
      const [groupLat, groupLng] = key.split(',').map(Number);
      const distance = calculateStraightLineDistance(
        { lat: groupLat, lng: groupLng },
        { lat, lng }
      );

      // 閾値以内の距離なら同じグループに追加
      if (distance <= thresholdMeters) {
        groupRequests.push(request);
        foundGroup = true;
        break;
      }
    }

    // 既存のグループに近い場所がなければ新しいグループを作成
    if (!foundGroup) {
      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      groups.set(key, [request]);
    }
  }

  return groups;
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

export interface OptimizationError {
  type: 'resource' | 'distance' | 'capacity' | 'time_conflict' | 'welfare_vehicle' | 'other';
  message: string;
}

export interface OptimizationResult {
  routes: OptimizedRoute[];
  errors: OptimizationError[];
}

/**
 * ルートを最適化
 */
export async function optimizeRoutes(
  requests: UserRequest[],
  assignments: ResourceAssignment[],
  facilities: Facility[],
  vehicles: Vehicle[],
  drivers: Driver[],
  users: User[]
): Promise<OptimizationResult> {
  const errors: OptimizationError[] = [];
  const routes: OptimizedRoute[] = [];

  // 選択されたリクエストを取得
  const selectedRequests = requests.filter((r) => r.selected);
  if (selectedRequests.length === 0) {
    return { routes, errors };
  }

  // 施設IDごとにグループ化
  const facilityGroups = new Map<string, UserRequest[]>();
  for (const request of selectedRequests) {
    if (!facilityGroups.has(request.target_facility_id)) {
      facilityGroups.set(request.target_facility_id, []);
    }
    facilityGroups.get(request.target_facility_id)!.push(request);
  }

  // 施設ごとに処理
  for (const [facilityId, facilityRequests] of facilityGroups) {
    const facility = facilities.find((f) => f.id === facilityId);
    if (!facility) {
      errors.push({
        type: 'other',
        message: `施設ID ${facilityId} が見つかりません`,
      });
      continue;
    }

    // 時間ウィンドウごとにグループ化
    const timeGroups = new Map<string, UserRequest[]>();
    for (const request of facilityRequests) {
      const window = getTimeWindow(request.user.pickup_time);
      if (!timeGroups.has(window)) {
        timeGroups.set(window, []);
      }
      timeGroups.get(window)!.push(request);
    }

    // 時間ウィンドウごとに処理
    for (const [timeWindow, timeRequests] of timeGroups) {
      // この施設のすべてのルートを取得
      let allFacilityRoutes = routes.filter((r) => r.facility_id === facility.id);
      
      // この時間帯で使用されているルートを取得
      // ルート内の停車地の時間を確認して、同じ時間帯のリクエストと競合する可能性があるルートを除外
      let facilityTimeRoutes = allFacilityRoutes.filter((r) => {
        // ルート内の停車地の時間を確認
        for (const stop of r.stops) {
          const stopTimeWindow = getTimeWindow(stop.arrival_time);
          if (stopTimeWindow === timeWindow) {
            // 同じ時間帯の停車地がある場合は、この時間帯で使用されているとみなす
            return true;
          }
        }
        return false;
      });
      
      // 利用可能なリソースを取得（この時間帯で使用されていないリソース）
      // 異なる時間帯で使用されているリソースも利用可能とする（繰り返し使用）
      const availableResources = assignments.filter((assignment) => {
        const vehicle = vehicles.find((v) => v.id === assignment.vehicle_id);
        const driver = drivers.find((d) => d.id === assignment.driver_id);

        if (!vehicle || !driver) return false;

        // この時間帯で既に使用されているリソースをチェック
        // 異なる時間帯で使用されているリソースは利用可能とする
        const usedInThisTime = facilityTimeRoutes.some(
          (r) => r.vehicle_id === vehicle.id && r.driver_id === driver.id
        );

        return !usedInThisTime;
      });

      if (availableResources.length === 0) {
        // リソースが不足している場合でも、既存のリソースを最大限活用
        // 定員に余裕がある車両を探す
        const existingRoutes = facilityTimeRoutes.filter((r) => {
          const vehicle = vehicles.find((v) => v.id === r.vehicle_id);
          return vehicle && r.stops.length < vehicle.capacity;
        });

        if (existingRoutes.length === 0 && assignments.length > 0) {
          errors.push({
            type: 'other',
            message: `施設「${facility.name}」の時間帯 ${timeWindow} で利用可能なリソースが不足しています（リソース設定タブで追加してください）`,
          });
          continue;
        }
        
        // 既存のルートがある場合は続行
      }

      // 福祉車両が必要な利用者を分離
      const welfareUsers: UserRequest[] = [];
      const regularUsers: UserRequest[] = [];

      for (const request of timeRequests) {
        if (request.user.welfare_vehicle_required) {
          welfareUsers.push(request);
        } else {
          regularUsers.push(request);
        }
      }

      // 既存のルートをこの施設で検索（allFacilityRoutes を使用）

      // 福祉車両が必要な利用者を処理（同じ場所・時間の利用者をまとめる）
      if (welfareUsers.length > 0) {
        // 位置ごとにグループ化（同じ場所の利用者をまとめる、100m以内を同じ場所とみなす）
        const welfareLocationGroups = groupByLocation(welfareUsers, 0.1);
        
        // 福祉車両を車椅子定員の大きい順にソート（大きい車両を優先）
        // 特に、車椅子利用者数に応じて適切な車椅子定員の車両を優先
        // ソートは各位置グループ内で行うため、ここでは基本的なソートのみ
        const welfareVehicles = availableResources
          .filter((assignment) => {
            const vehicle = vehicles.find((v) => v.id === assignment.vehicle_id);
            return vehicle?.welfare_vehicle;
          })
          .sort((a, b) => {
            const vehicleA = vehicles.find((v) => v.id === a.vehicle_id);
            const vehicleB = vehicles.find((v) => v.id === b.vehicle_id);
            const capacityA = vehicleA?.wheelchair_capacity || 0;
            const capacityB = vehicleB?.wheelchair_capacity || 0;
            // 車椅子定員が大きい順にソート（基本ソート）
            return capacityB - capacityA;
          });

        // 各位置グループを処理（同じ場所の利用者を1つのルートにまとめる）
        for (const [, locationRequests] of welfareLocationGroups) {
          // この位置グループの利用者を1つのルートにまとめる
          let assigned = false;
          
          // 車椅子利用者数に応じて、適切な車椅子定員の車両を優先的に選択
          const requiredWheelchairCapacity = locationRequests.length;
          
          console.log(`車椅子利用者${requiredWheelchairCapacity}名のグループを処理中:`, 
            locationRequests.map(r => r.user.name).join('、'));
          
          // 車椅子利用者数に応じて、適切な車椅子定員の車両を優先的にソート
          const sortedWelfareVehicles = [...welfareVehicles].sort((a, b) => {
            const vehicleA = vehicles.find((v) => v.id === a.vehicle_id);
            const vehicleB = vehicles.find((v) => v.id === b.vehicle_id);
            const capacityA = vehicleA?.wheelchair_capacity || 0;
            const capacityB = vehicleB?.wheelchair_capacity || 0;
            
            // 車椅子定員が要求数以上で、最も近い車両を優先
            // 要求数以上の車両の中で、最小の車椅子定員の車両を優先（無駄を避ける）
            if (capacityA >= requiredWheelchairCapacity && capacityB >= requiredWheelchairCapacity) {
              // 両方とも要求数を満たす場合、小さい方を優先（効率的）
              return capacityA - capacityB;
            } else if (capacityA >= requiredWheelchairCapacity) {
              // Aのみが要求数を満たす場合、Aを優先
              return -1;
            } else if (capacityB >= requiredWheelchairCapacity) {
              // Bのみが要求数を満たす場合、Bを優先
              return 1;
            } else {
              // どちらも要求数を満たさない場合、大きい方を優先
              return capacityB - capacityA;
            }
          });
          
          // まず利用可能なリソースを試す（車椅子定員が要求数以上の車両を優先）
          for (const resource of sortedWelfareVehicles) {
            const vehicle = vehicles.find((v) => v.id === resource.vehicle_id);
            const driver = drivers.find((d) => d.id === resource.driver_id);

            if (!vehicle || !driver) continue;

            // 車椅子定員が要求数以上かチェック
            if (vehicle.wheelchair_capacity < requiredWheelchairCapacity) {
              console.log(`車両「${vehicle.name}」の車椅子定員(${vehicle.wheelchair_capacity})が不足(${requiredWheelchairCapacity}名必要)`);
              continue; // 車椅子定員が不足している車両はスキップ
            }

            // この車両で既に使用されているかチェック（この時間帯・施設内）
            // 異なる時間帯で使用されている場合は利用可能とする
            const existingRouteInThisTime = facilityTimeRoutes.find(
              (r) => r.vehicle_id === vehicle.id && r.driver_id === driver.id
            );
            
            // 既存のルートがある場合、定員に余裕があるかチェック
            const existingRoute = existingRouteInThisTime;

            // 既存のルートの車椅子利用者数をカウント
            const currentWheelchairUsers = existingRoute
              ? existingRoute.stops.filter((stop) => {
                  const user = users.find((u) => u.id === stop.user_id);
                  return user?.welfare_vehicle_required;
                }).length
              : 0;

            // 車椅子定員をチェック（福祉車両が必要な利用者 = 車椅子利用者と仮定）
            const newWheelchairUsers = locationRequests.length;
            const totalWheelchairUsers = currentWheelchairUsers + newWheelchairUsers;

            // 車椅子定員と通常定員の両方をチェック
            const currentTotalUsers = existingRoute ? existingRoute.stops.length : 0;
            const newTotalUsers = locationRequests.length;
            const totalUsers = currentTotalUsers + newTotalUsers;

            // 車椅子定員と通常定員の両方を満たすかチェック
            if (
              totalWheelchairUsers <= vehicle.wheelchair_capacity &&
              totalUsers <= vehicle.capacity
            ) {
              // この位置グループの全利用者を追加
              if (!existingRoute) {
                // 新しいルートを作成
                const stops: RouteStop[] = locationRequests.map((req, index) => {
                  const user = users.find((u) => u.id === req.user.id);
                  if (!user) return null;
                  
                  const lat = user.pickup_lat ?? user.lat;
                  const lng = user.pickup_lng ?? user.lng;
                  const address = user.pickup_location_address || user.address;

                  return {
                    user_id: user.id,
                    user_name: user.name,
                    address,
                    lat,
                    lng,
                    arrival_time: user.pickup_time || '00:00',
                    stop_number: index + 1,
                  };
                }).filter((stop): stop is RouteStop => stop !== null);

                if (stops.length > 0) {
                  const newRoute: OptimizedRoute = {
                    vehicle_id: vehicle.id,
                    vehicle_name: vehicle.name,
                    driver_id: driver.id,
                    driver_name: driver.name,
                    facility_id: facility.id,
                    facility_name: facility.name,
                    stops,
                    total_distance: 0,
                    total_duration: 0,
                  };
                  routes.push(newRoute);
                  // 同じ時間帯・施設内でのリソース重複利用を避けるため、ローカルの一覧にも追加
                  facilityTimeRoutes.push(newRoute);
                  assigned = true;
                  break;
                }
              } else {
                // 既存のルートに追加
                const startNumber = existingRoute.stops.length + 1;
                locationRequests.forEach((req, index) => {
                  const user = users.find((u) => u.id === req.user.id);
                  if (!user) return;

                  const lat = user.pickup_lat ?? user.lat;
                  const lng = user.pickup_lng ?? user.lng;
                  const address = user.pickup_location_address || user.address;

                  existingRoute.stops.push({
                    user_id: user.id,
                    user_name: user.name,
                    address,
                    lat,
                    lng,
                    arrival_time: user.pickup_time || '00:00',
                    stop_number: startNumber + index,
                  });
                });
                assigned = true;
                break;
              }
            }
          }

          // 利用可能なリソースで割り当てできなかった場合、他の時間帯で使用されているリソースも試す
          if (!assigned) {
            // 他の時間帯で使用されている福祉車両を取得（繰り返し使用）
            const reusedWelfareVehicles = assignments
              .filter((assignment) => {
                const vehicle = vehicles.find((v) => v.id === assignment.vehicle_id);
                if (!vehicle?.welfare_vehicle) return false;
                
                // 車椅子定員が要求数以上かチェック
                if (vehicle.wheelchair_capacity < requiredWheelchairCapacity) return false;
                
                // この時間帯では使用されていないリソース
                const usedInThisTime = allFacilityRoutes.some(
                  (r) => r.vehicle_id === vehicle.id && r.driver_id === assignment.driver_id
                );
                return !usedInThisTime;
              })
              .sort((a, b) => {
                const vehicleA = vehicles.find((v) => v.id === a.vehicle_id);
                const vehicleB = vehicles.find((v) => v.id === b.vehicle_id);
                const capacityA = vehicleA?.wheelchair_capacity || 0;
                const capacityB = vehicleB?.wheelchair_capacity || 0;
                
                // 要求数以上の車両の中で、最小の車椅子定員の車両を優先
                if (capacityA >= requiredWheelchairCapacity && capacityB >= requiredWheelchairCapacity) {
                  return capacityA - capacityB;
                } else if (capacityA >= requiredWheelchairCapacity) {
                  return -1;
                } else if (capacityB >= requiredWheelchairCapacity) {
                  return 1;
                } else {
                  return capacityB - capacityA;
                }
              });

            for (const resource of reusedWelfareVehicles) {
              const vehicle = vehicles.find((v) => v.id === resource.vehicle_id);
              const driver = drivers.find((d) => d.id === resource.driver_id);

              if (!vehicle || !driver) continue;

              // 車椅子定員が要求数以上か再確認
              if (vehicle.wheelchair_capacity < requiredWheelchairCapacity) {
                continue;
              }

              // この時間帯で使用されているかチェック（この時間帯で使用されていない場合は null）
              const existingRoute = facilityTimeRoutes.find(
                (r) => r.vehicle_id === vehicle.id && r.driver_id === driver.id
              );

              // 既存のルートの車椅子利用者数をカウント
              const currentWheelchairUsers = existingRoute
                ? existingRoute.stops.filter((stop) => {
                    const user = users.find((u) => u.id === stop.user_id);
                    return user?.welfare_vehicle_required;
                  }).length
                : 0;

              // 車椅子定員をチェック
              const newWheelchairUsers = locationRequests.length;
              const totalWheelchairUsers = currentWheelchairUsers + newWheelchairUsers;

              // 車椅子定員と通常定員の両方をチェック
              const currentTotalUsers = existingRoute ? existingRoute.stops.length : 0;
              const newTotalUsers = locationRequests.length;
              const totalUsers = currentTotalUsers + newTotalUsers;

              if (
                totalWheelchairUsers <= vehicle.wheelchair_capacity &&
                totalUsers <= vehicle.capacity
              ) {
                // 時間を遅らせて送迎する案として新しいルートを作成
                if (!existingRoute) {
                  const stops: RouteStop[] = locationRequests.map((req, index) => {
                    const user = users.find((u) => u.id === req.user.id);
                    if (!user) return null;
                    
                    const lat = user.pickup_lat ?? user.lat;
                    const lng = user.pickup_lng ?? user.lng;
                    const address = user.pickup_location_address || user.address;

                    return {
                      user_id: user.id,
                      user_name: user.name,
                      address,
                      lat,
                      lng,
                      arrival_time: user.pickup_time || '00:00',
                      stop_number: index + 1,
                    };
                  }).filter((stop): stop is RouteStop => stop !== null);

                  if (stops.length > 0) {
                    const newRoute: OptimizedRoute = {
                      vehicle_id: vehicle.id,
                      vehicle_name: vehicle.name,
                      driver_id: driver.id,
                      driver_name: driver.name,
                      facility_id: facility.id,
                      facility_name: facility.name,
                      stops,
                      total_distance: 0,
                      total_duration: 0,
                    };
                    routes.push(newRoute);
                    facilityTimeRoutes.push(newRoute);
                    assigned = true;
                    break;
                  }
                } else {
                  // 既存のルートに追加
                  const startNumber = existingRoute.stops.length + 1;
                  locationRequests.forEach((req, index) => {
                    const user = users.find((u) => u.id === req.user.id);
                    if (!user) return;

                    const lat = user.pickup_lat ?? user.lat;
                    const lng = user.pickup_lng ?? user.lng;
                    const address = user.pickup_location_address || user.address;

                    existingRoute.stops.push({
                      user_id: user.id,
                      user_name: user.name,
                      address,
                      lat,
                      lng,
                      arrival_time: user.pickup_time || '00:00',
                      stop_number: startNumber + index,
                    });
                  });
                  assigned = true;
                  break;
                }
              }
            }
          }

          if (!assigned) {
            // 他の時間帯で使用されている福祉車両があるかチェック
            const hasReusedVehicles = assignments.some((assignment) => {
              const vehicle = vehicles.find((v) => v.id === assignment.vehicle_id);
              return vehicle?.welfare_vehicle && vehicle.wheelchair_capacity >= requiredWheelchairCapacity;
            });
            
            if (hasReusedVehicles) {
              errors.push({
                type: 'welfare_vehicle',
                message: `福祉車両が必要な利用者${locationRequests.length}名（${locationRequests.map(r => r.user.name).join('、')}）に割り当て可能な福祉車両がありません。他の送迎が終わったドライバーが時間を遅らせて送迎する案を検討してください。`,
              });
            } else {
              errors.push({
                type: 'welfare_vehicle',
                message: `福祉車両が必要な利用者${locationRequests.length}名（${locationRequests.map(r => r.user.name).join('、')}）に割り当て可能な福祉車両がありません。車椅子定員${locationRequests.length}名以上の車両（ハイエースなど）を追加してください。`,
              });
            }
          }
        }
      }

      // 通常の利用者を処理（近い場所の利用者をまとめる）
      if (regularUsers.length > 0) {
        // 位置ごとにグループ化（500m以内を近い場所とみなす）
        const regularLocationGroups = groupByLocation(regularUsers, 0.5);
        
        const regularVehicles = availableResources.filter((assignment) => {
          const vehicle = vehicles.find((v) => v.id === assignment.vehicle_id);
          return vehicle && !vehicle.welfare_vehicle;
        });

        // 各位置グループを処理
        for (const [, locationRequests] of regularLocationGroups) {
          // この位置グループの利用者を可能な限りまとめる
          let remainingRequests = [...locationRequests];

          while (remainingRequests.length > 0) {
            let assigned = false;

            for (const resource of regularVehicles) {
              const vehicle = vehicles.find((v) => v.id === resource.vehicle_id);
              const driver = drivers.find((d) => d.id === resource.driver_id);

              if (!vehicle || !driver) continue;

              // この時間帯で使用されているかチェック（この時間帯で使用されていない場合は null）
              const existingRoute = facilityTimeRoutes.find(
                (r) => r.vehicle_id === vehicle.id && r.driver_id === driver.id
              );

              const currentUsers = existingRoute ? existingRoute.stops.length : 0;
              
              // 通常利用者のみを考慮（車椅子利用者は通常の車両には乗せない）
              const regularUsersToAdd = remainingRequests.filter(
                (req) => !req.user.welfare_vehicle_required
              );

              // 通常定員のみをチェック（車椅子利用者は通常の車両には乗せない）
              const availableCapacity = vehicle.capacity - currentUsers;

              if (availableCapacity > 0 && regularUsersToAdd.length > 0) {
                // 利用可能な定員分だけ通常利用者を追加
                const usersToAdd = regularUsersToAdd.slice(0, availableCapacity);

                if (!existingRoute) {
                  // 新しいルートを作成
                  const stops: RouteStop[] = usersToAdd.map((req, index) => {
                    const user = users.find((u) => u.id === req.user.id);
                    if (!user) return null;
                    
                    const lat = user.pickup_lat ?? user.lat;
                    const lng = user.pickup_lng ?? user.lng;
                    const address = user.pickup_location_address || user.address;

                    return {
                      user_id: user.id,
                      user_name: user.name,
                      address,
                      lat,
                      lng,
                      arrival_time: user.pickup_time || '00:00',
                      stop_number: index + 1,
                    };
                  }).filter((stop): stop is RouteStop => stop !== null);

                  if (stops.length > 0) {
                    const newRoute: OptimizedRoute = {
                      vehicle_id: vehicle.id,
                      vehicle_name: vehicle.name,
                      driver_id: driver.id,
                      driver_name: driver.name,
                      facility_id: facility.id,
                      facility_name: facility.name,
                      stops,
                      total_distance: 0,
                      total_duration: 0,
                    };
                    routes.push(newRoute);
                    facilityTimeRoutes.push(newRoute);
                    assigned = true;
                    remainingRequests = remainingRequests.slice(usersToAdd.length);
                    break;
                  }
                } else {
                  // 既存のルートに追加
                  const startNumber = existingRoute.stops.length + 1;
                  usersToAdd.forEach((req, index) => {
                    const user = users.find((u) => u.id === req.user.id);
                    if (!user) return;

                    const lat = user.pickup_lat ?? user.lat;
                    const lng = user.pickup_lng ?? user.lng;
                    const address = user.pickup_location_address || user.address;

                    existingRoute.stops.push({
                      user_id: user.id,
                      user_name: user.name,
                      address,
                      lat,
                      lng,
                      arrival_time: user.pickup_time || '00:00',
                      stop_number: startNumber + index,
                    });
                  });
                  assigned = true;
                  remainingRequests = remainingRequests.slice(usersToAdd.length);
                  break;
                }
              }
            }

            // 利用可能なリソースで割り当てできなかった場合、他の時間帯で使用されているリソースも試す
            if (!assigned) {
              // 他の時間帯で使用されている通常車両を取得（繰り返し使用）
              const reusedRegularVehicles = assignments.filter((assignment) => {
                const vehicle = vehicles.find((v) => v.id === assignment.vehicle_id);
                if (!vehicle || vehicle.welfare_vehicle) return false;
                
                // この時間帯では使用されていないリソース
                const usedInThisTime = allFacilityRoutes.some(
                  (r) => r.vehicle_id === vehicle.id && r.driver_id === assignment.driver_id
                );
                return !usedInThisTime;
              });

              for (const resource of reusedRegularVehicles) {
                const vehicle = vehicles.find((v) => v.id === resource.vehicle_id);
                const driver = drivers.find((d) => d.id === resource.driver_id);

              if (!vehicle || !driver) continue;

              // この時間帯で使用されているかチェック（この時間帯で使用されていない場合は null）
              const existingRoute = facilityTimeRoutes.find(
                (r) => r.vehicle_id === vehicle.id && r.driver_id === driver.id
              );

                const currentUsers = existingRoute ? existingRoute.stops.length : 0;
                
                // 通常利用者のみを考慮
                const regularUsersToAdd = remainingRequests.filter(
                  (req) => !req.user.welfare_vehicle_required
                );

                const availableCapacity = vehicle.capacity - currentUsers;

                if (availableCapacity > 0 && regularUsersToAdd.length > 0) {
                  const usersToAdd = regularUsersToAdd.slice(0, availableCapacity);

                  if (!existingRoute) {
                    const stops: RouteStop[] = usersToAdd.map((req, index) => {
                      const user = users.find((u) => u.id === req.user.id);
                      if (!user) return null;
                      
                      const lat = user.pickup_lat ?? user.lat;
                      const lng = user.pickup_lng ?? user.lng;
                      const address = user.pickup_location_address || user.address;

                      return {
                        user_id: user.id,
                        user_name: user.name,
                        address,
                        lat,
                        lng,
                        arrival_time: user.pickup_time || '00:00',
                        stop_number: index + 1,
                      };
                    }).filter((stop): stop is RouteStop => stop !== null);

                    if (stops.length > 0) {
                      const newRoute: OptimizedRoute = {
                        vehicle_id: vehicle.id,
                        vehicle_name: vehicle.name,
                        driver_id: driver.id,
                        driver_name: driver.name,
                        facility_id: facility.id,
                        facility_name: facility.name,
                        stops,
                        total_distance: 0,
                        total_duration: 0,
                      };
                      routes.push(newRoute);
                      facilityTimeRoutes.push(newRoute);
                      assigned = true;
                      remainingRequests = remainingRequests.slice(usersToAdd.length);
                      break;
                    }
                  } else {
                    const startNumber = existingRoute.stops.length + 1;
                    usersToAdd.forEach((req, index) => {
                      const user = users.find((u) => u.id === req.user.id);
                      if (!user) return;

                      const lat = user.pickup_lat ?? user.lat;
                      const lng = user.pickup_lng ?? user.lng;
                      const address = user.pickup_location_address || user.address;

                      existingRoute.stops.push({
                        user_id: user.id,
                        user_name: user.name,
                        address,
                        lat,
                        lng,
                        arrival_time: user.pickup_time || '00:00',
                        stop_number: startNumber + index,
                      });
                    });
                    assigned = true;
                    remainingRequests = remainingRequests.slice(usersToAdd.length);
                    break;
                  }
                }
              }
            }

            if (!assigned) {
              // 割り当てできなかった利用者
              errors.push({
                type: 'capacity',
                message: `利用者${remainingRequests.length}名（${remainingRequests.map(r => r.user.name).join('、')}）に割り当て可能な車両がありません。他の送迎が終わったドライバーが時間を遅らせて送迎する案を検討してください。`,
              });
              break;
            }
          }
        }
      }
    }
  }

  // ルートの最適化と距離・時間の計算
  for (const route of routes) {
    if (route.stops.length === 0) continue;

    const facility = facilities.find((f) => f.id === route.facility_id);
    if (!facility) continue;

    // ルート順序の最適化
    const optimizedOrder = await optimizeRouteWithNearestNeighbor(
      route.stops.map((stop) => ({
        user_id: stop.user_id,
        lat: stop.lat,
        lng: stop.lng,
      })),
      { lat: facility.lat, lng: facility.lng }
    );

    // 順序を再配置
    const stopMap = new Map(route.stops.map((stop) => [stop.user_id, stop]));
    route.stops = optimizedOrder
      .map((userId, index) => {
        const stop = stopMap.get(userId);
        if (!stop) return null;
        return { ...stop, stop_number: index + 1 };
      })
      .filter((stop): stop is RouteStop => stop !== null);

    // 距離と時間を計算
    try {
      if (route.stops.length === 0) {
        route.total_distance = 0;
        route.total_duration = 0;
        continue;
      }

      const allPoints = [
        { lat: facility.lat, lng: facility.lng }, // 出発点（施設）
        ...route.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
        { lat: facility.lat, lng: facility.lng }, // 到着点（施設）
      ];

      const origins = allPoints.slice(0, -1);
      const destinations = allPoints.slice(1);

      console.log(`計算中: 施設「${facility.name}」のルート`, {
        origins: origins.length,
        destinations: destinations.length,
        stops: route.stops.length,
        origins_points: origins.map(p => `${p.lat},${p.lng}`),
        destinations_points: destinations.map(p => `${p.lat},${p.lng}`),
      });

      let matrix: DistanceMatrixResult[][];
      try {
        matrix = await getDistanceMatrix(origins, destinations);
        console.log('距離行列の結果:', {
          rows: matrix.length,
          elementsPerRow: matrix.map(r => r.length),
          firstRowFirstElement: matrix[0]?.[0],
          expectedRows: origins.length,
          expectedCols: destinations.length,
        });

        // 距離行列の構造を検証
        if (matrix.length !== origins.length) {
          console.error(`距離行列の行数が一致しません: 期待値=${origins.length}, 実際=${matrix.length}`);
        }
        if (matrix.length > 0 && matrix[0].length !== destinations.length) {
          console.error(`距離行列の列数が一致しません: 期待値=${destinations.length}, 実際=${matrix[0].length}`);
        }
      } catch (error) {
        console.error('Distance Matrix API呼び出しエラー:', error);
        throw error;
      }

      // 距離行列の計算: matrix[i][j] は origin[i] から destination[j] への距離
      // ルート: 施設 -> stop1 -> stop2 -> ... -> stopN -> 施設
      // origins = [施設, stop1, stop2, ..., stopN] (length = N+1)
      // destinations = [stop1, stop2, ..., stopN, 施設] (length = N+1)
      // 連続する地点間の距離を累積: matrix[i][i]がorigin[i]からdestination[i]への距離
      route.total_distance = 0;
      route.total_duration = 0;

      // 各セグメントの距離を累積
      // セグメント数は origins.length = destinations.length = route.stops.length + 1
      const numSegments = origins.length;
      console.log(`距離計算: ${numSegments}セグメント`, {
        matrixRows: matrix.length,
        matrixCols: matrix[0]?.length,
        originsCount: origins.length,
        destinationsCount: destinations.length,
      });

      for (let i = 0; i < numSegments; i++) {
        if (i >= matrix.length) {
          console.warn(`Row ${i} is out of bounds (matrix has ${matrix.length} rows)`);
          continue;
        }

        const row = matrix[i];
        if (!row || !Array.isArray(row)) {
          console.warn(`Row ${i} is missing or invalid`);
          continue;
        }

        if (i >= row.length) {
          console.warn(`Column ${i} is out of bounds (row ${i} has ${row.length} columns)`);
          continue;
        }

        const element = row[i];
        if (!element) {
          console.warn(`Element [${i}][${i}] is missing`);
          continue;
        }

        // 距離と時間を累積（メートルと秒の単位で）
        // 異常値チェック: 1セグメントが1000km以上は異常（通常は数km〜数十km）
        if (typeof element.distance === 'number' && element.distance >= 0) {
          if (element.distance > 1000000) {
            console.error(`異常な距離値が検出されました: Segment ${i} = ${element.distance}m (${(element.distance / 1000).toFixed(2)}km)`);
            console.error('距離行列の要素:', {
              origin: origins[i],
              destination: destinations[i],
              element: element,
              rowIndex: i,
              colIndex: i,
            });
          }
          route.total_distance += element.distance;
          console.log(`Segment ${i}: ${element.distance}m (${(element.distance / 1000).toFixed(2)}km) from origin[${i}] to destination[${i}]`);
        } else {
          console.warn(`Invalid distance at [${i}][${i}]:`, element.distance);
        }

        if (typeof element.duration === 'number' && element.duration >= 0) {
          // 異常値チェック: 1セグメントが10時間以上は異常（通常は数分〜数十分）
          if (element.duration > 36000) {
            console.error(`異常な時間値が検出されました: Segment ${i} = ${element.duration}s (${(element.duration / 60).toFixed(1)}分)`);
          }
          route.total_duration += element.duration;
        } else {
          console.warn(`Invalid duration at [${i}][${i}]:`, element.duration);
        }
      }

      console.log(`計算完了: 総距離=${route.total_distance}m (${(route.total_distance / 1000).toFixed(2)}km), 総時間=${route.total_duration}s (${(route.total_duration / 60).toFixed(1)}分)`);
    } catch (error) {
      console.error('Distance matrix calculation failed:', error);
      // エラーが発生してもルートは表示できるようにする
      route.total_distance = 0;
      route.total_duration = 0;
    }
  }

  return { routes, errors };
}
