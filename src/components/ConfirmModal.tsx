import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'info' | 'warning' | 'error' | 'success';
}

/**
 * 공통 확인 모달 컴포넌트
 * 사용자 확인이 필요한 액션에 사용
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText,
  onConfirm,
  onCancel,
  variant = 'info',
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* 모달 컨텐츠 */}
      <div className="relative z-10 glass-card p-6 rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        {/* 아이콘과 제목 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">{getIcon()}</div>
          <h3 className="text-xl font-bold glass-text">{title}</h3>
        </div>

        {/* 메시지 */}
        <div className="mb-6">
          <p className="glass-text whitespace-pre-line">{message}</p>
        </div>

        {/* 버튼 영역 */}
        <div className="flex gap-3 justify-end">
          {cancelText && (
            <button
              onClick={onCancel}
              className="px-6 py-2 rounded-lg font-semibold glass-text border-2 border-white/30 bg-white/10 hover:bg-white/20 transition-all"
            >
              {cancelText}
            </button>
          )}
          <button onClick={onConfirm} className="glass-button-primary px-6 py-2 rounded-lg font-semibold">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
