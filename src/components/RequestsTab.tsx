import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { saveRequests, loadRequests } from '../lib/storage';
import type { UserRequest, User, Facility } from '../types';

export default function RequestsTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const saved = loadRequests();
    if (saved.length > 0) {
      setRequests(saved);
    }
  }, []);

  const loadData = async () => {
    try {
      const [usersResult, facilitiesResult] = await Promise.all([
        supabase.from('users').select('*').order('name'),
        supabase.from('facilities').select('*').order('name'),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (facilitiesResult.error) throw facilitiesResult.error;

      setUsers(usersResult.data || []);
      setFacilities(facilitiesResult.data || []);

      // 保存されたリクエストがない場合は初期化
      const saved = loadRequests();
      if (saved.length === 0) {
        const initialRequests: UserRequest[] = (usersResult.data || []).map((user) => ({
          user,
          selected: false,
          target_facility_id: user.default_facility_id || facilitiesResult.data?.[0]?.id || '',
        }));
        setRequests(initialRequests);
      } else {
        // 保存されたリクエストと現在のユーザーをマージ
        const userMap = new Map(usersResult.data?.map((u) => [u.id, u]) || []);
        const updatedRequests = saved
          .map((req) => {
            const user = userMap.get(req.user.id);
            if (!user) return null;
            return {
              ...req,
              user, // 最新のユーザー情報で更新
              target_facility_id: req.target_facility_id || user.default_facility_id || '',
            };
          })
          .filter((req): req is UserRequest => req !== null);

        // 新しいユーザーを追加
        const existingUserIds = new Set(saved.map((r) => r.user.id));
        const newUsers = (usersResult.data || []).filter((u) => !existingUserIds.has(u.id));
        const newRequests: UserRequest[] = newUsers.map((user) => ({
          user,
          selected: false,
          target_facility_id: user.default_facility_id || facilitiesResult.data?.[0]?.id || '',
        }));

        setRequests([...updatedRequests, ...newRequests]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRequest = (userId: string) => {
    const updated = requests.map((req) =>
      req.user.id === userId ? { ...req, selected: !req.selected } : req
    );
    setRequests(updated);
    saveRequests(updated);
  };

  const handleFacilityChange = (userId: string, facilityId: string) => {
    const updated = requests.map((req) =>
      req.user.id === userId ? { ...req, target_facility_id: facilityId } : req
    );
    setRequests(updated);
    saveRequests(updated);
  };

  const handleSelectAll = () => {
    const updated = requests.map((req) => ({ ...req, selected: true }));
    setRequests(updated);
    saveRequests(updated);
  };

  if (loading) {
    return <div className="text-center py-12">読み込み中...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">本日のリクエスト</h2>
          <p className="text-gray-600">
            送迎が必要な利用者を選択し、送迎先施設を指定してください
          </p>
        </div>
        <button
          onClick={handleSelectAll}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          全員を選択
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                選択
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                利用者名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                住所
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                福祉車両
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                ピックアップ時間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                送迎先施設
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((request) => (
              <tr key={request.user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={request.selected}
                    onChange={() => handleToggleRequest(request.user.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {request.user.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {request.user.pickup_location_address || request.user.address}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {request.user.welfare_vehicle_required ? (
                    <span className="text-orange-600 font-medium">必要</span>
                  ) : (
                    <span className="text-gray-400">不要</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {request.user.pickup_time || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={request.target_facility_id}
                    onChange={(e) => handleFacilityChange(request.user.id, e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && (
          <div className="text-center py-12 text-gray-500">利用者が登録されていません</div>
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-700">
          選択されたリクエスト: {requests.filter((r) => r.selected).length}件 / {requests.length}件
        </p>
      </div>
    </div>
  );
}
