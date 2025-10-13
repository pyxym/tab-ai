import React, { useCallback, memo } from 'react';
import type { AIInsight } from '../../store/aiStore';

/**
 * AI 인사이트 카드 컴포넌트의 Props 타입 정의
 */
interface AIInsightCardProps {
  insight: AIInsight; // AI 인사이트 데이터
  onDismiss?: (id: string) => void; // 인사이트 닫기 핸들러
  onAction?: () => void; // 액션 실행 후 콜백
}

/**
 * 인사이트 타입별 아이콘 매핑 상수
 */
const INSIGHT_TYPE_ICONS = {
  suggestion: '💡', // 제안 아이콘
  pattern: '📊', // 패턴 아이콘
  alert: '⚠️', // 알림 아이콘
  tip: '✨', // 팁 아이콘
} as const;

/**
 * 우선순위별 색상 클래스 매핑 상수
 */
const PRIORITY_COLOR_CLASSES = {
  high: 'border-red-500/50 bg-red-500/5', // 높은 우선순위: 빨강
  medium: 'border-yellow-500/50 bg-yellow-500/5', // 중간 우선순위: 노랑
  low: 'border-blue-500/50 bg-blue-500/5', // 낮은 우선순위: 파랑
} as const;

/**
 * 인사이트 타입별 한글 레이블 상수 (현재 미사용, 추후 i18n 적용시 활용)
 */
const INSIGHT_TYPE_LABELS = {
  suggestion: '제안',
  pattern: '패턴',
  alert: '알림',
  tip: '팁',
} as const;

/**
 * AI 인사이트 카드 컴포넌트
 * AI가 생성한 인사이트를 시각적으로 표시하는 카드 UI
 * 🚀 성능 최적화: memo로 래핑하여 불필요한 리렌더링 방지
 *
 * @component
 * @param {AIInsightCardProps} props - 컴포넌트 속성
 */
export const AIInsightCard: React.FC<AIInsightCardProps> = memo(({ insight, onDismiss, onAction }) => {
  /**
   * 인사이트 닫기 핸들러
   * 상위 컴포넌트로 인사이트 ID를 전달
   */
  const handleDismiss = useCallback(() => {
    onDismiss?.(insight.id);
  }, [insight.id, onDismiss]);

  /**
   * 액션 버튼 클릭 핸들러
   * 인사이트의 액션을 실행하고 콜백 함수 호출
   */
  const handleAction = useCallback(() => {
    insight.actionable?.action();
    onAction?.();
  }, [insight.actionable, onAction]);

  return (
    // 메인 카드 컨테이너 - glass-card 스타일과 우선순위별 색상 적용 (사이드패널 최적화)
    // ✅ FIX: hover:scale 제거하고 brightness + shadow 효과로 대체 (보더 잘림 방지)
    <div className={`glass-card !p-2.5 border-l-2 ${PRIORITY_COLOR_CLASSES[insight.priority]} relative transition-all hover:brightness-110 hover:shadow-lg`}>
      <div className="flex items-start gap-2">
        {/* 인사이트 타입 아이콘 표시 */}
        <InsightIcon type={insight.type} />

        {/* 인사이트 콘텐츠 영역 */}
        <div className="flex-1 min-w-0">
          {/* 제목과 닫기 버튼 행 */}
          <InsightHeader title={insight.title} onDismiss={onDismiss ? handleDismiss : undefined} />

          {/* 인사이트 설명 텍스트 */}
          <InsightDescription description={insight.description} />

          {/* 액션 버튼 (actionable이 있을 때만 표시) */}
          {insight.actionable && <InsightActionButton label={insight.actionable.label} onClick={handleAction} />}
        </div>
      </div>
    </div>
  );
});

/**
 * 인사이트 아이콘 컴포넌트 (사이드패널용 크기 축소)
 * 🚀 성능 최적화: memo로 래핑
 */
const InsightIcon: React.FC<{ type: AIInsight['type'] }> = memo(({ type }) => (
  <span className="text-base flex-shrink-0 mt-0.5">{INSIGHT_TYPE_ICONS[type]}</span>
));

/**
 * 인사이트 헤더 컴포넌트 (제목 + 닫기 버튼)
 * 🚀 성능 최적화: memo로 래핑
 */
const InsightHeader: React.FC<{
  title: string;
  onDismiss?: () => void;
}> = memo(({ title, onDismiss }) => (
  <div className="flex items-start justify-between gap-2">
    {/* 인사이트 제목 */}
    <h4 className="font-medium glass-text text-[13px] leading-tight">{title}</h4>

    {/* 닫기 버튼 (onDismiss 핸들러가 있을 때만 표시) */}
    {onDismiss && <DismissButton onClick={onDismiss} />}
  </div>
));

/**
 * 닫기 버튼 컴포넌트 (사이드패널용 크기 축소)
 * 🚀 성능 최적화: memo로 래핑
 */
const DismissButton: React.FC<{ onClick: () => void }> = memo(({ onClick }) => (
  <button
    onClick={onClick}
    className="text-white/30 hover:text-white/50 flex-shrink-0 transition-colors -mt-0.5 -mr-0.5"
    title="Dismiss"
    aria-label="인사이트 닫기"
  >
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
));

/**
 * 인사이트 설명 컴포넌트
 * 개행 문자(\n)를 <br> 태그로 변환하여 여러 줄 표시 지원 (사이드패널용 최적화)
 * 🚀 성능 최적화: memo로 래핑
 */
const InsightDescription: React.FC<{ description: string }> = memo(({ description }) => (
  <p className="text-[11px] glass-text opacity-70 mt-0.5 leading-relaxed whitespace-pre-line">{description}</p>
));

/**
 * 인사이트 액션 버튼 컴포넌트 (사이드패널용 크기 축소)
 * 🚀 성능 최적화: memo로 래핑
 */
const InsightActionButton: React.FC<{
  label: string;
  onClick: () => void;
}> = memo(({ label, onClick }) => (
  <button onClick={onClick} className="glass-button-primary !py-1 !px-2.5 text-[11px] mt-2 hover:scale-105 transition-transform">
    {label}
  </button>
));
