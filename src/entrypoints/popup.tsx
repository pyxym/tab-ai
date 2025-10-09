import i18n from 'i18next';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import enTranslations from '../locales/en.json';
import jaTranslations from '../locales/ja.json';
import koTranslations from '../locales/ko.json';
import IndexPopup from './popup-component';

/**
 * 저장된 언어 설정을 가져오는 함수
 * Chrome 스토리지 또는 브라우저 언어로 폴백
 */
async function getSavedLanguage(): Promise<string> {
  try {
    // Chrome 동기화 스토리지에서 언어 설정 가져오기
    const result = await chrome.storage.sync.get('language');
    if (result.language) {
      return result.language;
    }
  } catch {
    // Chrome 스토리지를 사용할 수 없는 경우
  }

  // 브라우저 언어로 폴백 (사용 가능한 경우)
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language.split('-')[0];
    if (['en', 'ko', 'ja'].includes(browserLang)) {
      return browserLang;
    }
  }

  return 'en'; // 기본 폴백 언어
}

// i18n 초기화 상태 플래그
let isInitialized = false;

/**
 * i18n 라이브러리를 초기화하는 함수
 * 저장된 언어 설정으로 초기화
 */
async function ensureI18nInitialized() {
  if (!isInitialized) {
    const savedLang = await getSavedLanguage();

    await i18n.use(initReactI18next).init({
      resources: {
        en: { translation: enTranslations }, // 영어 번역
        ko: { translation: koTranslations }, // 한국어 번역
        ja: { translation: jaTranslations }, // 일본어 번역
      },
      lng: savedLang, // 현재 언어
      fallbackLng: 'en', // 폴백 언어
      debug: false, // 디버그 모드
      interpolation: {
        escapeValue: false, // React는 자체 이스케이프 처리
      },
    });

    isInitialized = true;
  }
}

/**
 * 메인 팝업 컴포넌트
 * i18n 초기화를 처리하고 언어 변경을 감지
 */
function Popup() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // i18n 초기화 후 준비 상태 설정
    ensureI18nInitialized().then(() => {
      setReady(true);
    });

    // 스토리지의 언어 변경 감지
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.language && changes.language.newValue) i18n.changeLanguage(changes.language.newValue);
    };

    chrome.storage.onChanged.addListener(storageListener);

    // 클린업: 리스너 제거
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  if (!ready) {
    return (
      <div className="w-[400px] min-h-[500px] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <IndexPopup />
    </I18nextProvider>
  );
}

// WXT expects a main function for popup entrypoints
export default {
  async main() {
    // Ensure i18n is initialized before rendering
    await ensureI18nInitialized();

    // Find or create the root element
    const rootElement = document.getElementById('root') || document.body;

    // Create React root and render the app
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <I18nextProvider i18n={i18n}>
        <Popup />
      </I18nextProvider>,
    );
  },
};
