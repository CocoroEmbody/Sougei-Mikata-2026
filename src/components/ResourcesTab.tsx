import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { saveResources, loadResources } from '../lib/storage';
import type { ResourceAssignment, Vehicle, Driver } from '../types';

export default function ResourcesTab() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const saved = loadResources();
    if (saved.length > 0) {
      setAssignments(saved);
    }
  }, []);

  const loadData = async () => {
    try {
      const [vehiclesResult, driversResult] = await Promise.all([
        supabase.from('vehicles').select('*').order('name'),
        supabase.from('drivers').select('*').order('name'),
      ]);

      if (vehiclesResult.error) throw vehiclesResult.error;
      if (driversResult.error) throw driversResult.error;

      setVehicles(vehiclesResult.data || []);
      setDrivers(driversResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = () => {
    if (vehicles.length === 0 || drivers.length === 0) {
      alert('車両またはドライバーが登録されていません');
      return;
    }

    const newAssignment: ResourceAssignment = {
      id: crypto.randomUUID(),
      vehicle_id: vehicles[0].id,
      driver_id: drivers[0].id,
    };

    const updated = [...assignments, newAssignment];
    setAssignments(updated);
    saveResources(updated);
  };

  const handleUpdateAssignment = (id: string, field: 'vehicle_id' | 'driver_id', value: string) => {
    const updated = assignments.map((assignment) =>
      assignment.id === id ? { ...assignment, [field]: value } : assignment
    );
    setAssignments(updated);
    saveResources(updated);
  };

  const handleDeleteAssignment = (id: string) => {
    if (!confirm('このリソース割り当てを削除しますか？')) return;

    const updated = assignments.filter((assignment) => assignment.id !== id);
    setAssignments(updated);
    saveResources(updated);
  };

  if (loading) {
    return <div className="text-center py-12">読み込み中...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">リソース設定</h2>
        <p className="text-gray-600">車両とドライバーの組み合わせを設定してください</p>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={handleAddAssignment}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          disabled={vehicles.length === 0 || drivers.length === 0}
        >
          <Plus className="w-5 h-5" />
          リソースを追加
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                車両
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                ドライバー
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assignments.map((assignment) => {
              const vehicle = vehicles.find((v) => v.id === assignment.vehicle_id);
              const driver = drivers.find((d) => d.id === assignment.driver_id);

              return (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={assignment.vehicle_id}
                      onChange={(e) =>
                        handleUpdateAssignment(assignment.id, 'vehicle_id', e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.capacity}名{v.welfare_vehicle ? '・福祉車両' : ''})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={assignment.driver_id}
                      onChange={(e) =>
                        handleUpdateAssignment(assignment.id, 'driver_id', e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {assignments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            リソース割り当てが設定されていません
          </div>
        )}
      </div>

      {vehicles.length === 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            車両が登録されていません。データ管理タブで車両を登録してください。
          </p>
        </div>
      )}

      {drivers.length === 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ドライバーが登録されていません。データ管理タブでドライバーを登録してください。
          </p>
        </div>
      )}
    </div>
  );
}
