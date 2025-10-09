import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 지원 언어 목록
 */
const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' }, // 영어
  { code: 'ko', name: '한국어', flag: '🇰🇷' }, // 한국어
  { code: 'ja', name: '日本語', flag: '🇯🇵' }, // 일본어
];

/**
 * 언어 전환 컴포넌트의 Props
 */
interface LanguageSwitcherProps {
  inDropdown?: boolean; // 드롭다운 모드 여부 (설정 메뉴용)
  onLanguageChange?: () => void; // 언어 변경 시 콜백
}

/**
 * 언어 전환 컴포넌트
 * 앱의 표시 언어를 변경할 수 있는 UI 제공
 * 두 가지 모드 지원: 독립 버튼 모드, 드롭다운 메뉴 모드
 *
 * @component
 * @param {LanguageSwitcherProps} props - 컴포넌트 속성
 */
export function LanguageSwitcher({ inDropdown = false, onLanguageChange }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language);

  // i18n 언어 변경 이벤트 리스너
  useEffect(() => {
    // 언어가 변경되면 현재 언어 상태 업데이트
    const handleLanguageChanged = (lng: string) => {
      setCurrentLang(lng);
    };

    i18n.on('languageChanged', handleLanguageChanged);

    // 클린업: 이벤트 리스너 제거
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  /**
   * 언어 변경 핸들러
   * Chrome 스토리지에 저장하고 i18n 언어 변경
   */
  const handleLanguageChange = async (langCode: string) => {
    // Chrome 동기화 스토리지에 저장
    await chrome.storage.sync.set({ language: langCode });
    // i18n 언어 변경
    await i18n.changeLanguage(langCode);
    setCurrentLang(langCode);
    setIsOpen(false);
    // 콜백 함수 실행 (있는 경우)
    if (onLanguageChange) {
      onLanguageChange();
    }
  };

  const currentLanguage = languages.find((l) => l.code === currentLang) || languages[0];

  // Dropdown mode for settings menu
  if (inDropdown) {
    return (
      <div className="py-1">
        <div className="px-4 py-2 text-xs text-gray-400 font-semibold">Language</div>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`w-full text-left px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors flex items-center gap-2 ${
              currentLang === lang.code ? 'bg-white/10' : ''
            }`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
            {currentLang === lang.code && (
              <svg className="w-3 h-3 ml-auto text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Standalone button mode
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-button flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
        title="Language"
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="hidden sm:inline">{currentLanguage.name}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-40 glass-card rounded-lg shadow-lg z-50">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 ${
                  currentLang === lang.code ? 'bg-white/10' : ''
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm">{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
