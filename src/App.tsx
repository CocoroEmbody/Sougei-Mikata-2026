import { useState } from 'react';
import { Building2, Users, Truck, UserCheck, Calendar, Settings, Route } from 'lucide-react';
import FacilitiesTab from './components/FacilitiesTab';
import UsersTab from './components/UsersTab';
import VehiclesTab from './components/VehiclesTab';
import DriversTab from './components/DriversTab';
import RequestsTab from './components/RequestsTab';
import ResourcesTab from './components/ResourcesTab';
import ResultsTab from './components/ResultsTab';

type Tab = 'data' | 'requests' | 'resources' | 'results';
type DataSubTab = 'facilities' | 'users' | 'vehicles' | 'drivers';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('data');
  const [activeDataTab, setActiveDataTab] = useState<DataSubTab>('facilities');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">送迎ルート最適化システム</h1>
          <p className="text-blue-100 mt-1">障がい福祉事業所向け送迎管理システム</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-md border-b border-blue-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'data'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Settings className="w-5 h-5" />
              データ管理
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Calendar className="w-5 h-5" />
              本日のリクエスト
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'resources'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Truck className="w-5 h-5" />
              リソース設定
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'results'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Route className="w-5 h-5" />
              最適化結果
            </button>
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <main className="container mx-auto px-4 py-6">
        {activeTab === 'data' && (
          <div>
            {/* Data Sub-tabs */}
            <div className="mb-6 flex flex-wrap gap-2 border-b border-blue-200">
              <button
                onClick={() => setActiveDataTab('facilities')}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                  activeDataTab === 'facilities'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Building2 className="w-4 h-4" />
                施設
              </button>
              <button
                onClick={() => setActiveDataTab('users')}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                  activeDataTab === 'users'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Users className="w-4 h-4" />
                利用者
              </button>
              <button
                onClick={() => setActiveDataTab('vehicles')}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                  activeDataTab === 'vehicles'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Truck className="w-4 h-4" />
                車両
              </button>
              <button
                onClick={() => setActiveDataTab('drivers')}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                  activeDataTab === 'drivers'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                ドライバー
              </button>
            </div>

            {/* Data Tab Content */}
            {activeDataTab === 'facilities' && <FacilitiesTab />}
            {activeDataTab === 'users' && <UsersTab />}
            {activeDataTab === 'vehicles' && <VehiclesTab />}
            {activeDataTab === 'drivers' && <DriversTab />}
          </div>
        )}

        {activeTab === 'requests' && <RequestsTab />}
        {activeTab === 'resources' && <ResourcesTab />}
        {activeTab === 'results' && <ResultsTab />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-blue-200 mt-auto py-4">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2026 送迎ルート最適化システム</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
