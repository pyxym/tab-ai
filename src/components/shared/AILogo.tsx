import React from 'react';

/**
 * AI 로고 컴포넌트의 Props
 */
interface AILogoProps {
  size?: 'small' | 'medium' | 'large'; // 로고 크기 (기본: medium)
  animated?: boolean; // 애니메이션 효과 여부 (기본: true)
}

/**
 * AI 로고 컴포넌트
 * TabQuest 확장 프로그램의 로고를 표시하며,
 * 그라데이션 효과와 애니메이션을 적용 가능
 *
 * @component
 * @param {AILogoProps} props - 컴포넌트 속성
 */
export const AILogo: React.FC<AILogoProps> = ({ size = 'medium', animated = true }) => {
  // 크기별 Tailwind 클래스 매핑
  const sizeClasses = {
    small: 'w-6 h-6', // 24x24px
    medium: 'w-8 h-8', // 32x32px
    large: 'w-12 h-12', // 48x48px
  };

  // 실제 아이콘 이미지 크기 매핑 (public/icon 폴더의 파일 사용)
  const iconSizes = {
    small: 32, // small 크기에는 32px 아이콘 사용
    medium: 48, // medium 크기에는 48px 아이콘 사용
    large: 128, // large 크기에는 128px 아이콘 사용
  };

  // 선택된 크기에 맞는 아이콘 파일 경로 생성
  const iconPath = `/icon/icon-${iconSizes[size]}.png`;

  return (
    <div className={`${sizeClasses[size]} relative`}>
      {/* 배경 그라데이션 레이어 - 애니메이션 가능 */}
      <div className={`absolute inset-0 ai-gradient rounded-lg ${animated ? 'animate-gradient' : ''}`} />

      {/* 로고 이미지 컨테이너 */}
      <div className="absolute inset-0 flex items-center justify-center p-1">
        <img src={iconPath} alt="TabQuest Logo" className="w-full h-full object-contain" />
      </div>

      {/* 펄스 애니메이션 오버레이 - 애니메이션 활성화 시에만 표시 */}
      {animated && <div className="absolute inset-0 ai-gradient rounded-lg opacity-50 animate-pulse-slow" />}
    </div>
  );
};
