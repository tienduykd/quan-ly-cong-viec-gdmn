import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lỗi giao diện (ErrorBoundary caught):', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-3xl p-6 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Đã xảy ra sự cố hiển thị</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hệ thống đã tự động ngăn chặn màn hình trắng. Cô có thể bấm nút dưới đây để tải lại trang.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 bg-slate-900 text-red-300 text-[11px] font-mono rounded-xl text-left overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tải lại trang</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = window.location.pathname;
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Về trang chính</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
