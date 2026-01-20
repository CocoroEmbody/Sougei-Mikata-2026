import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Driver } from '../types';

export default function DriversTab() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      if (!supabaseUrl || supabaseUrl.includes('your-') || supabaseUrl === '') {
        console.warn('Supabase環境変数が設定されていません');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading drivers:', error);
        alert(`ドライバーの読み込みに失敗しました: ${error.message}\n詳細: ${JSON.stringify(error)}`);
        return;
      }
      
      setDrivers(data || []);
      console.log('Loaded drivers:', data);
    } catch (error) {
      console.error('Error loading drivers:', error);
      alert(`ドライバーの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('ドライバー名を入力してください');
      return;
    }

    try {
      // Supabase接続確認
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      if (!supabaseUrl || supabaseUrl.includes('your-') || supabaseUrl === '') {
        alert('Supabase環境変数が設定されていません。.env.localファイルを確認してください。');
        return;
      }

      if (editingDriver) {
        const { data, error } = await supabase
          .from('drivers')
          .update({
            name: formData.name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDriver.id)
          .select();

        if (error) {
          console.error('Driver update error:', error);
          alert(`ドライバーの更新に失敗しました: ${error.message}\n詳細: ${JSON.stringify(error)}`);
          return;
        }

        if (!data || data.length === 0) {
          alert('ドライバーの更新に失敗しました: データが返されませんでした');
          return;
        }
      } else {
        const { data, error } = await supabase
          .from('drivers')
          .insert([formData])
          .select();

        if (error) {
          console.error('Driver insert error:', error);
          alert(`ドライバーの追加に失敗しました: ${error.message}\n詳細: ${JSON.stringify(error)}`);
          return;
        }

        if (!data || data.length === 0) {
          alert('ドライバーの追加に失敗しました: データが返されませんでした');
          return;
        }
      }

      setShowModal(false);
      setEditingDriver(null);
      setFormData({ name: '' });
      loadDrivers();
    } catch (error) {
      console.error('Error saving driver:', error);
      alert(`ドライバーの保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({ name: driver.name });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このドライバーを削除しますか？')) return;

    try {
      const { error } = await supabase.from('drivers').delete().eq('id', id);

      if (error) throw error;
      loadDrivers();
    } catch (error) {
      console.error('Error deleting driver:', error);
      alert('ドライバーの削除に失敗しました');
    }
  };

  if (loading) {
    return <div className="text-center py-12">読み込み中...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">ドライバー管理</h2>
        <button
          onClick={() => {
            setEditingDriver(null);
            setFormData({ name: '' });
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
                ドライバー名
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {drivers.map((driver) => (
              <tr key={driver.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {driver.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(driver)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <Edit2 className="w-4 h-4 inline" />
                  </button>
                  <button
                    onClick={() => handleDelete(driver.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {drivers.length === 0 && (
          <div className="text-center py-12 text-gray-500">ドライバーが登録されていません</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              {editingDriver ? 'ドライバーを編集' : 'ドライバーを追加'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ドライバー名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDriver(null);
                    setFormData({ name: '' });
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
