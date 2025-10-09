import React from 'react';

/**
 * 막대 차트 데이터 타입
 */
interface BarChartData {
  label: string; // 막대 레이블 (예: 카테고리명)
  value: number; // 막대 값 (예: 시간, 개수)
  color: string; // 막대 색상 (hex 또는 rgb)
}

/**
 * 간단한 막대 차트 컴포넌트의 Props
 */
interface SimpleBarChartProps {
  data: BarChartData[]; // 차트에 표시할 데이터 배열
  title?: string; // 차트 제목 (선택적)
  maxValue?: number; // Y축 최대값 (기본: 데이터 최대값)
  showValues?: boolean; // 값 표시 여부 (기본: true)
  height?: number; // 차트 높이 (기본: 200px)
}

/**
 * 간단한 막대 차트 컴포넌트
 * 카테고리별 사용 시간이나 방문 횟수 등을 시각화
 *
 * @component
 * @param {SimpleBarChartProps} props - 컴포넌트 속성
 */
export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, title, maxValue, showValues = true, height = 200 }) => {
  // 차트의 Y축 최대값 계산 (전달받은 값 또는 데이터 최대값, 최소 1)
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="w-full">
      {/* 차트 제목 (선택적) */}
      {title && <h4 className="text-sm font-medium text-white/80 mb-3">{title}</h4>}
      {/* 막대 차트 컨테이너 */}
      <div className="relative flex items-end justify-between gap-2" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          // 각 막대의 높이를 백분율로 계산
          const percentage = (item.value / max) * 100;

          return (
            <div key={index} className="flex-1 flex flex-col items-center justify-end">
              {/* 막대 위 값 표시 (분 단위) */}
              {showValues && <span className="text-xs text-white/70 mb-1">{item.value}m</span>}
              {/* 실제 막대 그래프 */}
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${percentage}%`, // 계산된 백분율로 높이 설정
                  backgroundColor: item.color, // 각 막대의 고유 색상
                  minHeight: '4px', // 최소 높이 보장 (값이 0일 때도 표시)
                }}
              />
              {/* 막대 아래 레이블 */}
              <span className="text-xs text-white/60 mt-2 text-center truncate w-full">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
