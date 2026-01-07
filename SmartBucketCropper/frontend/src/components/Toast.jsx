/**
 * Toast 通知组件
 */
import React from 'react';
import useImageStore from '../hooks/useImageStore';

const Toast = () => {
  const { toasts, removeToast } = useImageStore();

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-gray-900';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-gray-900';
      default:
        return 'bg-cyan-500 text-gray-900';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-enter px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[280px] ${getTypeStyles(toast.type)}`}
        >
          <span className="text-lg font-bold">{getIcon(toast.type)}</span>
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
