import React, { useEffect, useRef, useState } from 'react';

/**
 * 정보 툴팁 컴포넌트의 Props 타입 정의
 */
interface InfoTooltipProps {
  title: string; // 툴팁 제목
  description: string; // 툴팁 설명
  features?: string[]; // 추가 기능 목록 (선택)
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'bottom-left' | 'bottom-right'; // 툴팁 위치
  className?: string; // 추가 CSS 클래스
}

/**
 * 정보 툴팁 컴포넌트
 * 정보 아이콘 호버 또는 클릭 시 상세 정보를 표시하는 툴팁
 *
 * @component
 * @param {InfoTooltipProps} props - 컴포넌트 속성
 */
export const InfoTooltip: React.FC<InfoTooltipProps> = ({ title, description, features, position = 'auto', className = '' }) => {
  // 툴팁 표시 상태
  const [isVisible, setIsVisible] = useState(false);
  // 실제 툴팁 위치 (자동 계산 포함)
  const [actualPosition, setActualPosition] = useState(position === 'auto' ? 'bottom' : position);
  // 툴팁 DOM 참조
  const tooltipRef = useRef<HTMLDivElement>(null);
  // 버튼 DOM 참조
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 툴팁 위치 자동 계산
  useEffect(() => {
    if (isVisible && position === 'auto' && buttonRef.current && tooltipRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const tooltipHeight = 250; // 툴팁 예상 높이 (패딩 포함)
      const tooltipWidth = 380; // 툴팁 예상 너비 (w-80 + 패딩 + 마진)

      // 각 방향의 사용 가능한 공간 계산
      const spaceTop = rect.top;
      const spaceBottom = viewportHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = viewportWidth - rect.right;

      // 사용 가능한 공간을 기반으로 최적 위치 결정
      if (spaceBottom >= tooltipHeight && spaceLeft >= tooltipWidth / 2 && spaceRight >= tooltipWidth / 2) {
        setActualPosition('bottom');
      } else if (spaceTop >= tooltipHeight && spaceLeft >= tooltipWidth / 2 && spaceRight >= tooltipWidth / 2) {
        setActualPosition('top');
      } else if (spaceLeft >= tooltipWidth) {
        setActualPosition('left');
      } else if (spaceRight >= tooltipWidth) {
        setActualPosition('right');
      } else {
        // 이상적인 위치가 없으면 기본값으로 아래쪽 설정
        setActualPosition('bottom');
      }
    } else if (position !== 'auto') {
      setActualPosition(position);
    }
  }, [isVisible, position]);

  // 툴팁 위치별 CSS 클래스 매핑
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
    bottom: 'top-full left-0 mt-1', // Changed to left-0 to prevent cutoff
    left: 'right-full top-1/2 -translate-y-1/2 mr-1',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1',
    'bottom-left': 'top-full right-0 mt-1',
    'bottom-right': 'top-full left-0 mt-1',
  };

  // 툴팁 화살표 위치별 CSS 클래스 매핑
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-white/90',
    bottom: 'bottom-full left-4 border-b-white/90', // Adjusted arrow position for left-aligned tooltip
    left: 'left-full top-1/2 -translate-y-1/2 border-l-white/90',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-white/90',
    'bottom-left': 'bottom-full right-4 border-b-white/90',
    'bottom-right': 'bottom-full left-4 border-b-white/90',
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      {/* 정보 아이콘 버튼 */}
      <button
        ref={buttonRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="p-1 rounded-full hover:bg-white/10 transition-colors"
        aria-label="정보 보기"
      >
        <svg className="w-4 h-4 glass-text opacity-60 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {/* 툴팁 */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`
            absolute z-50 w-80 p-5
            bg-white/95 dark:bg-gray-800/95
            backdrop-blur-md rounded-lg shadow-xl
            transition-all duration-200 pointer-events-none
            ${positionClasses[actualPosition]}
            opacity-100 scale-100
          `}
        >
          {/* 툴팁 화살표 */}
          <div
            className={`
              absolute w-0 h-0
              border-4 border-transparent
              ${arrowClasses[actualPosition]}
            `}
          />

          {/* 툴팁 내용 */}
          {/* 제목 */}
          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">{title}</h4>
          {/* 설명 */}
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mb-2">{description}</p>

          {/* 기능 목록 (있는 경우) */}
          {features && features.length > 0 && (
            <ul className="mt-2 space-y-1">
              {features.map((feature, index) => (
                <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
                  <span className="mr-1 flex-shrink-0">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
