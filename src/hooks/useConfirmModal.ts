import { useCallback, useState } from 'react';

/**
 * 확인 모달 상태 타입
 */
export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  variant: 'info' | 'warning' | 'error' | 'success';
  onConfirm: () => void;
}

/**
 * 확인 모달 관리 커스텀 훅
 * 모달 상태와 헬퍼 함수들을 제공
 */
export const useConfirmModal = () => {
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    onConfirm: () => {},
  });

  /**
   * 모달 표시 헬퍼
   */
  const showModal = useCallback(
    (config: { title: string; message: string; variant: 'info' | 'warning' | 'error' | 'success'; onConfirm?: () => void }) => {
      setConfirmModal({
        isOpen: true,
        ...config,
        onConfirm: config.onConfirm || (() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))),
      });
    },
    [],
  );

  /**
   * 모달 닫기 헬퍼
   */
  const closeModal = useCallback(() => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    confirmModal,
    showModal,
    closeModal,
  };
};
