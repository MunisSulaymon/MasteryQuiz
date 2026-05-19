import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-rose-100 text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-600 mx-auto mb-6">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-4 italic tracking-tight">Nimadir xato ketdi</h1>
            <p className="text-gray-400 font-medium mb-8 leading-relaxed">
              Ilova ishlashida kutilmagan xatolik yuz berdi. Iltimos, sahifani yangilab ko'ring.
            </p>
            <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-left">
              <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Xatolik tafsiloti:</p>
              <p className="text-[11px] font-mono text-rose-600 break-all">{this.state.error?.message}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
              <RotateCcw className="w-4 h-4" />
              Sahifani yangilash
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
