import React, { useState } from 'react';

/**
 * 파비콘 컴포넌트의 Props 타입 정의
 */
interface FavIconProps {
  url?: string; // 파비콘 URL
  size?: number; // 아이콘 크기 (px)
  className?: string; // 추가 CSS 클래스
}

/**
 * 파비콘 컴포넌트
 * 웹사이트의 파비콘을 표시하고, 로드 실패 시 대체 아이콘을 보여줌
 *
 * @component
 * @param {FavIconProps} props - 컴포넌트 속성
 */
export const FavIcon: React.FC<FavIconProps> = ({ url, size = 20, className = '' }) => {
  // 이미지 로드 에러 상태
  const [hasError, setHasError] = useState(false);
  // 이미지 로딩 상태
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 도메인 첫 글자를 기반으로 대체 아이콘 생성
   * @returns {string} 대체 아이콘 텍스트
   */
  const getFallbackIcon = () => {
    if (!url) return '?';
    try {
      const hostname = new URL(url).hostname;
      // www. 접두사 제거
      const cleanHostname = hostname.replace(/^www\./, '');
      // 첫 글자를 대문자로 변환하여 반환
      return cleanHostname.charAt(0).toUpperCase();
    } catch {
      // URL 파싱 실패 시 기본 아이콘
      return '?';
    }
  };

  /**
   * chrome:// URL이나 다른 내부 URL인지 확인
   */
  const isInternalUrl = (url: string): boolean => {
    return url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:');
  };

  // URL이 없거나 로드 에러가 발생한 경우 또는 내부 URL인 경우 대체 아이콘 렌더링
  if (!url || hasError || isInternalUrl(url)) {
    return (
      <div
        className={`flex items-center justify-center rounded-md glass-card !p-0 text-gray-600 dark:text-gray-300 font-semibold text-xs ${className}`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
        }}
        aria-label="웹사이트 아이콘"
      >
        {getFallbackIcon()}
      </div>
    );
  }

  return (
    <>
      {/* 로딩 중 플레이스홀더 */}
      {isLoading && (
        <div
          className={`flex items-center justify-center rounded-md glass-card !p-0 animate-pulse ${className}`}
          style={{
            width: size,
            height: size,
            minWidth: size,
            minHeight: size,
          }}
          aria-label="아이콘 로딩 중"
        />
      )}
      {/* 실제 파비콘 이미지 */}
      <img
        src={url}
        alt=""
        className={`rounded-md ${isLoading ? 'hidden' : ''} ${className}`}
        style={{ width: size, height: size }}
        onError={() => {
          // 이미지 로드 실패 시
          setHasError(true);
          setIsLoading(false);
        }}
        onLoad={() => {
          // 이미지 로드 성공 시
          setIsLoading(false);
        }}
      />
    </>
  );
};
