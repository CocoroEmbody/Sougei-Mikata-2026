import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">エラーが発生しました</h1>
            <p className="text-gray-700 mb-4">
              アプリケーションの実行中にエラーが発生しました。以下の情報を確認してください。
            </p>
            {this.state.error && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">エラーメッセージ:</h2>
                <pre className="bg-gray-100 p-3 rounded text-sm text-red-600 overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}
            {this.state.errorInfo && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">エラー詳細:</h2>
                <pre className="bg-gray-100 p-3 rounded text-xs text-gray-600 overflow-auto max-h-60">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
            <div className="mt-6">
              <h3 className="text-md font-semibold text-gray-800 mb-2">確認事項:</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>ブラウザのコンソール（F12）でエラーの詳細を確認してください</li>
                <li>Netlifyの環境変数（VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY、VITE_GOOGLE_MAPS_API_KEY）が正しく設定されているか確認してください</li>
                <li>ページをリロードしてみてください</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              ページをリロード
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
