import React from 'react';

/**
 * 생산성 점수 컴포넌트의 Props 타입 정의
 */
interface ProductivityScoreProps {
  score: number; // 생산성 점수 (0-100)
  trend?: 'up' | 'down' | 'stable'; // 점수 추세
  compact?: boolean; // 컴팩트 모드 여부
}

/**
 * 생산성 점수 컴포넌트
 * 사용자의 브라우징 생산성을 시각화하여 표시
 *
 * @component
 * @param {ProductivityScoreProps} props - 컴포넌트 속성
 */
export const ProductivityScore: React.FC<ProductivityScoreProps> = ({ score, trend = 'stable', compact = false }) => {
  /**
   * 점수에 따른 색상 결정
   * @param {number} score - 생산성 점수
   * @returns {string} 텍스트 색상 클래스
   */
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'; // 우수 (80 이상)
    if (score >= 60) return 'text-yellow-500'; // 양호 (60-79)
    return 'text-red-500'; // 개선 필요 (60 미만)
  };

  // 추세 아이콘 매핑
  const trendIcons = {
    up: '↗️', // 상승 추세
    down: '↘️', // 하락 추세
    stable: '→', // 유지
  };

  // 컴팩트 모드 렌더링 - 작은 공간에 최적화된 UI
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-2 py-1 glass-card">
        {/* 원형 프로그레스 바 컨테이너 */}
        <div className="relative w-6 h-6">
          <svg className="w-6 h-6 -rotate-90">
            {/* 배경 원 - 진행도를 표시하기 위한 베이스 */}
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" className="text-white/20" />
            {/* 진행도 원 - 점수에 따라 채워지는 원 */}
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="url(#score-gradient)"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${score * 0.628} 62.8`} // 점수를 원주 길이로 변환 (100% = 62.8)
              className="transition-all duration-1000"
            />
            {/* 그라데이션 정의 - 녹색에서 주황색으로 */}
            <defs>
              <linearGradient id="score-gradient">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
          </svg>
          {/* 중앙에 표시되는 점수 숫자 */}
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold glass-text">{score}</span>
        </div>
        {/* 텍스트 정보 영역 */}
        <div className="flex flex-col">
          <span className="text-xs font-medium glass-text">Productivity</span>
          <span className="text-[10px] glass-text opacity-60">Score {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
        </div>
      </div>
    );
  }

  // 풀 모드 렌더링 - AI 생산성 점수 카드
  return (
    <div className="ai-card">
      {/* 헤더 영역 - 제목과 추세 아이콘 */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold ai-gradient-text">AI Productivity Score</h3>
        <span className="text-xl">{trendIcons[trend]}</span>
      </div>
      {/* 원형 프로그레스 인디케이터 영역 */}
      <div className="relative h-32 flex items-center justify-center">
        {/* 배경 원 - 회색 테두리 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-8 border-gray-200 dark:border-gray-700" />
        </div>
        {/* 원뿔형 그라데이션 프로그레스 */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            // 점수에 따라 원뿔형 그라데이션 생성 (보라색 → 분홍색)
            background: `conic-gradient(from -90deg, #8B5CF6 0%, #EC4899 ${score * 3.6}deg, transparent ${score * 3.6}deg)`,
            // 중앙을 비우기 위한 마스크 적용 (도넛 모양)
            WebkitMask: 'radial-gradient(farthest-side, transparent 55%, white 56%)',
            mask: 'radial-gradient(farthest-side, transparent 55%, white 56%)',
          }}
        >
          <div className="w-24 h-24 rounded-full" />
        </div>
        {/* 중앙 점수 표시 - 색상은 점수에 따라 동적 변경 */}
        <span className={`font-bold text-3xl ${getScoreColor(score)}`}>{score}</span>
      </div>
      {/* 점수별 안내 메시지 */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
        {score >= 80 && 'Excellent! Your browsing is highly optimized.'} {/* 80점 이상: 우수 */}
        {score >= 60 && score < 80 && 'Good! Room for improvement.'} {/* 60-79점: 양호 */}
        {score < 60 && 'Let AI help optimize your workflow.'} {/* 60점 미만: 개선 필요 */}
      </p>
    </div>
  );
};
