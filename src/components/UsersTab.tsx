import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { geocodeAddress } from '../lib/googleMaps';
import type { User, Facility, PickupLocationType } from '../types';

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    address: '',
    lat: 0,
    lng: 0,
    default_facility_id: '',
    welfare_vehicle_required: false,
    pickup_location_type: 'home',
    pickup_location_name: '',
    pickup_location_address: '',
    pickup_lat: undefined,
    pickup_lng: undefined,
    pickup_time: '',
  });
  const [searchAddress, setSearchAddress] = useState('');
  const [searchPickupAddress, setSearchPickupAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodingPickup, setGeocodingPickup] = useState(false);

  useEffect(() => {
    loadUsers();
    loadFacilities();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('利用者の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadFacilities = async () => {
    try {
      const { data, error } = await supabase.from('facilities').select('*').order('name');

      if (error) throw error;
      setFacilities(data || []);
    } catch (error) {
      console.error('Error loading facilities:', error);
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

  const handleSearchPickupAddress = async () => {
    if (!searchPickupAddress.trim()) return;

    setGeocodingPickup(true);
    try {
      const result = await geocodeAddress(searchPickupAddress);
      setFormData({
        ...formData,
        pickup_location_address: result.formatted_address,
        pickup_lat: result.lat,
        pickup_lng: result.lng,
      });
      setSearchPickupAddress('');
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('住所の検索に失敗しました');
    } finally {
      setGeocodingPickup(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim() || !formData.address?.trim()) {
      alert('利用者名と住所を入力してください');
      return;
    }

    try {
      const submitData: any = {
        name: formData.name,
        address: formData.address,
        lat: formData.lat || 0,
        lng: formData.lng || 0,
        default_facility_id: formData.default_facility_id || null,
        welfare_vehicle_required: formData.welfare_vehicle_required || false,
        pickup_location_type: formData.pickup_location_type || 'home',
        pickup_location_name: formData.pickup_location_name || '',
        pickup_location_address: formData.pickup_location_address || '',
        pickup_lat: formData.pickup_lat || null,
        pickup_lng: formData.pickup_lng || null,
        pickup_time: formData.pickup_time || null,
        updated_at: new Date().toISOString(),
      };

      // Supabase接続確認
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      if (!supabaseUrl || supabaseUrl.includes('your-') || supabaseUrl === '') {
        alert('Supabase環境変数が設定されていません。.env.localファイルを確認してください。');
        return;
      }

      if (editingUser) {
        const { data, error } = await supabase
          .from('users')
          .update(submitData)
          .eq('id', editingUser.id)
          .select();

        if (error) {
          console.error('User update error:', error);
          alert(`利用者の更新に失敗しました: ${error.message}\n詳細: ${JSON.stringify(error)}`);
          return;
        }

        if (!data || data.length === 0) {
          alert('利用者の更新に失敗しました: データが返されませんでした');
          return;
        }
      } else {
        const { data, error } = await supabase
          .from('users')
          .insert([submitData])
          .select();

        if (error) {
          console.error('User insert error:', error);
          alert(`利用者の追加に失敗しました: ${error.message}\n詳細: ${JSON.stringify(error)}`);
          return;
        }

        if (!data || data.length === 0) {
          alert('利用者の追加に失敗しました: データが返されませんでした');
          return;
        }
      }

      setShowModal(false);
      setEditingUser(null);
      setFormData({
        name: '',
        address: '',
        lat: 0,
        lng: 0,
        default_facility_id: '',
        welfare_vehicle_required: false,
        pickup_location_type: 'home',
        pickup_location_name: '',
        pickup_location_address: '',
        pickup_lat: undefined,
        pickup_lng: undefined,
        pickup_time: '',
      });
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert(`利用者の保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      address: user.address,
      lat: user.lat,
      lng: user.lng,
      default_facility_id: user.default_facility_id || '',
      welfare_vehicle_required: user.welfare_vehicle_required,
      pickup_location_type: user.pickup_location_type,
      pickup_location_name: user.pickup_location_name,
      pickup_location_address: user.pickup_location_address,
      pickup_lat: user.pickup_lat,
      pickup_lng: user.pickup_lng,
      pickup_time: user.pickup_time || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この利用者を削除しますか？')) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);

      if (error) throw error;
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('利用者の削除に失敗しました');
    }
  };

  if (loading) {
    return <div className="text-center py-12">読み込み中...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">利用者管理</h2>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({
              name: '',
              address: '',
              lat: 0,
              lng: 0,
              default_facility_id: '',
              welfare_vehicle_required: false,
              pickup_location_type: 'home',
              pickup_location_name: '',
              pickup_location_address: '',
              pickup_lat: undefined,
              pickup_lng: undefined,
              pickup_time: '',
            });
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
                利用者名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                住所
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                福祉車両
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                ピックアップ場所
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                ピックアップ時間
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{user.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.welfare_vehicle_required ? (
                    <span className="text-orange-600 font-medium">必要</span>
                  ) : (
                    <span className="text-gray-400">不要</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.pickup_location_address || user.address}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.pickup_time || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <Edit2 className="w-4 h-4 inline" />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">利用者が登録されていません</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h3 className="text-xl font-bold mb-4">
              {editingUser ? '利用者を編集' : '利用者を追加'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    利用者名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
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

                <div className="md:col-span-2">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">緯度</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">経度</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    デフォルト施設
                  </label>
                  <select
                    value={formData.default_facility_id}
                    onChange={(e) => setFormData({ ...formData, default_facility_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.welfare_vehicle_required}
                      onChange={(e) =>
                        setFormData({ ...formData, welfare_vehicle_required: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">福祉車両が必要</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ピックアップ場所タイプ
                  </label>
                  <select
                    value={formData.pickup_location_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_location_type: e.target.value as PickupLocationType,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="home">自宅</option>
                    <option value="school">学校</option>
                    <option value="station">駅</option>
                    <option value="convenience_store">コンビニ</option>
                    <option value="other">その他</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ピックアップ場所名
                  </label>
                  <input
                    type="text"
                    value={formData.pickup_location_name}
                    onChange={(e) =>
                      setFormData({ ...formData, pickup_location_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: 〇〇駅、〇〇小学校など"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ピックアップ場所住所検索
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchPickupAddress}
                      onChange={(e) => setSearchPickupAddress(e.target.value)}
                      placeholder="住所を入力して検索"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchPickupAddress();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSearchPickupAddress}
                      disabled={geocodingPickup}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ピックアップ場所住所
                  </label>
                  <input
                    type="text"
                    value={formData.pickup_location_address}
                    onChange={(e) =>
                      setFormData({ ...formData, pickup_location_address: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ピックアップ場所緯度
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.pickup_lat || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_lat: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ピックアップ場所経度
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.pickup_lng || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_lng: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ピックアップ時間
                  </label>
                  <input
                    type="time"
                    value={formData.pickup_time}
                    onChange={(e) => setFormData({ ...formData, pickup_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                    setFormData({
                      name: '',
                      address: '',
                      lat: 0,
                      lng: 0,
                      default_facility_id: '',
                      welfare_vehicle_required: false,
                      pickup_location_type: 'home',
                      pickup_location_name: '',
                      pickup_location_address: '',
                      pickup_lat: undefined,
                      pickup_lng: undefined,
                      pickup_time: '',
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
