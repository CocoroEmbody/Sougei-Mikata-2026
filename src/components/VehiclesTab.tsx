import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Vehicle } from '../types';

export default function VehiclesTab() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: 4,
    welfare_vehicle: false,
    wheelchair_capacity: 0,
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      if (!supabaseUrl || supabaseUrl.includes('your-') || supabaseUrl === '') {
        console.warn('Supabase環境変数が設定されていません');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading vehicles:', error);
        alert(`車両の読み込みに失敗しました: ${error.message}\n詳細: ${JSON.stringify(error)}`);
        return;
      }
      
      setVehicles(data || []);
      console.log('Loaded vehicles:', data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      alert(`車両の読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('車両名を入力してください');
      return;
    }

    if (formData.capacity < 1 || formData.capacity > 100) {
      alert('定員は1〜100の範囲で入力してください');
      return;
    }

    try {
      // Supabase接続確認
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      if (!supabaseUrl || supabaseUrl.includes('your-') || supabaseUrl === '') {
        alert('Supabase環境変数が設定されていません。.env.localファイルを確認してください。');
        return;
      }

      if (editingVehicle) {
        const { data, error } = await supabase
          .from('vehicles')
          .update({
            name: formData.name,
            capacity: formData.capacity,
            welfare_vehicle: formData.welfare_vehicle,
            wheelchair_capacity: formData.wheelchair_capacity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingVehicle.id)
          .select();

        if (error) {
          console.error('Vehicle update error:', error);
          alert(`車両の更新に失敗しました: ${error.message}\n詳細: ${JSON.stringify(error)}`);
          return;
        }

        if (!data || data.length === 0) {
          alert('車両の更新に失敗しました: データが返されませんでした');
          return;
        }
      } else {
        const { data, error } = await supabase
          .from('vehicles')
          .insert([formData])
          .select();

        if (error) {
          console.error('Vehicle insert error:', error);
          alert(`車両の追加に失敗しました: ${error.message}\n詳細: ${JSON.stringify(error)}`);
          return;
        }

        if (!data || data.length === 0) {
          alert('車両の追加に失敗しました: データが返されませんでした');
          return;
        }
      }

      setShowModal(false);
      setEditingVehicle(null);
      setFormData({ name: '', capacity: 4, welfare_vehicle: false, wheelchair_capacity: 0 });
      loadVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert(`車両の保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      capacity: vehicle.capacity,
      welfare_vehicle: vehicle.welfare_vehicle,
      wheelchair_capacity: vehicle.wheelchair_capacity,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この車両を削除しますか？')) return;

    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);

      if (error) throw error;
      loadVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('車両の削除に失敗しました');
    }
  };

  if (loading) {
    return <div className="text-center py-12">読み込み中...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">車両管理</h2>
        <button
          onClick={() => {
            setEditingVehicle(null);
            setFormData({ name: '', capacity: 4, welfare_vehicle: false, wheelchair_capacity: 0 });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          新規追加
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                車両名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                定員
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                福祉車両
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                車椅子定員
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {vehicle.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vehicle.capacity}名
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vehicle.welfare_vehicle ? (
                    <span className="text-orange-600 font-medium">✓</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vehicle.wheelchair_capacity}台
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(vehicle)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <Edit2 className="w-4 h-4 inline" />
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vehicles.length === 0 && (
          <div className="text-center py-12 text-gray-500">車両が登録されていません</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              {editingVehicle ? '車両を編集' : '車両を追加'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  車両名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  定員 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">1〜100の範囲で入力してください</p>
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.welfare_vehicle}
                    onChange={(e) =>
                      setFormData({ ...formData, welfare_vehicle: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">福祉車両</span>
                </label>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  車椅子定員
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.wheelchair_capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      wheelchair_capacity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingVehicle(null);
                    setFormData({
                      name: '',
                      capacity: 4,
                      welfare_vehicle: false,
                      wheelchair_capacity: 0,
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
