import React, { useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { i18n, ensureI18nInitialized, createStorageChangeHandler } from '../lib/i18nSetup';
import IndexPopup from './popup-component';

/**
 * 메인 팝업 컴포넌트
 * 언어 변경 감지만 처리 (초기화는 main()에서 완료됨)
 * 🚀 성능 최적화: 공통 i18n 모듈 사용하여 코드 중복 제거
 */
function Popup() {
  // 스토리지 변경 리스너를 useCallback으로 메모이제이션
  const handleStorageChange = useCallback(createStorageChangeHandler(), []);

  useEffect(() => {
    chrome.storage.onChanged.addListener(handleStorageChange);

    // 클린업: 리스너 제거
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [handleStorageChange]);

  return <IndexPopup />;
}

// WXT expects a main function for popup entrypoints
export default {
  async main() {
    // Ensure i18n is initialized before rendering
    await ensureI18nInitialized();

    // Find or create the root element
    const rootElement = document.getElementById('root') || document.body;

    // Create React root and render the app
    // I18nextProvider를 한 번만 사용 (중복 제거)
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <I18nextProvider i18n={i18n}>
          <Popup />
        </I18nextProvider>
      </React.StrictMode>,
    );
  },
};
