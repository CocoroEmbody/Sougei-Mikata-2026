import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { geocodeAddress } from '../lib/googleMaps';
import type { Facility } from '../types';

export default function FacilitiesTab() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    lat: 0,
    lng: 0,
  });
  const [searchAddress, setSearchAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      if (!supabaseUrl || supabaseUrl.includes('your-') || supabaseUrl === '') {
        console.warn('Supabase環境変数が設定されていません');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFacilities(data || []);
    } catch (error) {
      console.error('Error loading facilities:', error);
      // エラー時もアプリを継続する
    } finally {
      setLoading(false);
    }
  };

  const handleSearchAddress = async () => {
    if (!searchAddress.trim()) return;

    setGeocoding(true);
    try {
      const result = await geocodeAddress(searchAddress);
      setFormData({
        ...formData,
        address: result.formatted_address,
        lat: result.lat,
        lng: result.lng,
      });
      setSearchAddress('');
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('住所の検索に失敗しました');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.address.trim()) {
      alert('施設名と住所を入力してください');
      return;
    }

    try {
      // Supabase接続確認
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      if (!supabaseUrl || supabaseUrl.includes('your-') || supabaseUrl === '') {
        alert('Supabase環境変数が設定されていません。.env.localファイルを確認してください。');
        return;
      }

      if (editingFacility) {
        const { data, error } = await supabase
          .from('facilities')
          .update({
            name: formData.name,
            address: formData.address,
            lat: formData.lat,
            lng: formData.lng,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingFacility.id)
          .select();

        if (error) {
          console.error('Facility update error:', error);
          alert(`施設の更新に失敗しました: ${error.message}\n詳細: ${JSON.stringify(error)}`);
          return;
        }

        if (!data || data.length === 0) {
          alert('施設の更新に失敗しました: データが返されませんでした');
          return;
        }
      } else {
        const { data, error } = await supabase
          .from('facilities')
          .insert([formData])
          .select();

        if (error) {
          console.error('Facility insert error:', error);
          alert(`施設の追加に失敗しました: ${error.message}\n詳細: ${JSON.stringify(error)}`);
          return;
        }

        if (!data || data.length === 0) {
          alert('施設の追加に失敗しました: データが返されませんでした');
          return;
        }
      }

      setShowModal(false);
      setEditingFacility(null);
      setFormData({ name: '', address: '', lat: 0, lng: 0 });
      loadFacilities();
    } catch (error) {
      console.error('Error saving facility:', error);
      alert(`施設の保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleEdit = (facility: Facility) => {
    setEditingFacility(facility);
    setFormData({
      name: facility.name,
      address: facility.address,
      lat: facility.lat,
      lng: facility.lng,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この施設を削除しますか？')) return;

    try {
      const { error } = await supabase.from('facilities').delete().eq('id', id);

      if (error) throw error;
      loadFacilities();
    } catch (error) {
      console.error('Error deleting facility:', error);
      alert('施設の削除に失敗しました');
    }
  };

  if (loading) {
    return <div className="text-center py-12">読み込み中...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">施設管理</h2>
        <button
          onClick={() => {
            setEditingFacility(null);
            setFormData({ name: '', address: '', lat: 0, lng: 0 });
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
                施設名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                住所
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                座標
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {facilities.map((facility) => (
              <tr key={facility.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {facility.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{facility.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {facility.lat.toFixed(6)}, {facility.lng.toFixed(6)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(facility)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <Edit2 className="w-4 h-4 inline" />
                  </button>
                  <button
                    onClick={() => handleDelete(facility.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {facilities.length === 0 && (
          <div className="text-center py-12 text-gray-500">施設が登録されていません</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              {editingFacility ? '施設を編集' : '施設を追加'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  施設名 <span className="text-red-500">*</span>
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
                  住所検索
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    placeholder="住所を入力して検索"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchAddress();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSearchAddress}
                    disabled={geocoding}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  住所 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">緯度</label>
                <input
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">経度</label>
                <input
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingFacility(null);
                    setFormData({ name: '', address: '', lat: 0, lng: 0 });
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
