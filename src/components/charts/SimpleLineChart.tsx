import React from 'react';

/**
 * 라인 차트 데이터 타입
 */
interface LineChartData {
  label: string; // X축 레이블 (예: 날짜, 시간)
  value: number; // Y축 값 (예: 생산성 점수, 사용 시간)
}

/**
 * 간단한 라인 차트 컴포넌트의 Props
 */
interface SimpleLineChartProps {
  data: LineChartData[]; // 차트에 표시할 데이터 배열
  title?: string; // 차트 제목 (선택적)
  height?: number; // 차트 높이 (기본: 150px)
  color?: string; // 라인 색상 (기본: 보라색)
}

/**
 * 간단한 라인 차트 컴포넌트
 * 시간에 따른 추이나 패턴을 시각화
 *
 * @component
 * @param {SimpleLineChartProps} props - 컴포넌트 속성
 */
export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ data, title, height = 150, color = '#8B5CF6' }) => {
  // 데이터가 없으면 렌더링하지 않음
  if (data.length === 0) return null;

  // Y축 범위 계산 (최소값과 최대값)
  const maxValue = Math.max(...data.map((d) => d.value), 100);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1; // 범위가 0인 경우 1로 설정

  // SVG 좌표 포인트 계산
  const points = data.map((item, index) => {
    // X좌표: 데이터 인덱스를 0-100 범위로 변환
    const x = (index / (data.length - 1)) * 100;
    // Y좌표: 값을 0-100 범위로 변환 (SVG는 Y축이 반대)
    const y = 100 - ((item.value - minValue) / range) * 100;
    return { x, y, value: item.value, label: item.label };
  });

  // SVG path 문자열 생성 (M: 시작점, L: 라인)
  const pathData = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`; // 첫 번째 점: 이동(M)
    return `${path} L ${point.x} ${point.y}`; // 나머지 점: 라인(L)
  }, '');
  return (
    <div className="w-full">
      {/* 차트 제목 (선택적) */}
      {title && <h4 className="text-sm font-medium text-white/80 mb-3">{title}</h4>}
      <div className="flex">
        {/* Y축 레이블 영역 */}
        <div className="w-12 flex flex-col justify-between pr-2" style={{ height: `${height}px` }}>
          <span className="text-xs text-white/60 text-right">{maxValue}%</span>
          <span className="text-xs text-white/60 text-right">{Math.round((maxValue + minValue) / 2)}%</span>
          <span className="text-xs text-white/60 text-right">{minValue}%</span>
        </div>

        {/* 차트 본체 영역 */}
        <div className="flex-1 flex flex-col">
          <div className="relative" style={{ height: `${height}px` }}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none" // 비율 무시하고 컨테이너에 맞춤
              className="w-full h-full"
            >
              {/* 그리드 라인 - 가독성을 위한 보조선 */}
              <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" /> {/* 상단 */}
              <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" /> {/* 중간 */}
              <line x1="0" y1="100" x2="100" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" /> {/* 하단 */}
              {/* 데이터 라인 */}
              <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke" // 스케일 변경 시에도 선 두께 유지
              />
              {/* 데이터 포인트 - 각 값의 위치를 명확히 표시 */}
              {points.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x} // X 좌표
                  cy={point.y} // Y 좌표
                  r="1.5" // 반지름
                  fill={color} // 라인과 동일한 색상
                  vectorEffect="non-scaling-stroke" // 스케일 변경 시에도 크기 유지
                />
              ))}
            </svg>
          </div>

          {/* X축 레이블 영역 */}
          <div className="flex justify-between mt-2 text-xs text-white/60">
            {data.map((item, index) => (
              <span key={index} style={{ width: `${100 / data.length}%` }} className="text-center">
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
