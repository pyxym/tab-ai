import React from 'react';
import type { ExtendedColorEnum } from '../types/category';

/**
 * 색상 선택기 컴포넌트의 Props 타입 정의
 */
interface ColorPickerProps {
  value: ExtendedColorEnum; // 현재 선택된 색상
  onChange: (color: ExtendedColorEnum) => void; // 색상 변경 핸들러
  className?: string; // 추가 CSS 클래스
  compact?: boolean; // 컴팩트 모드 여부
}

/**
 * 색상 선택기 컴포넌트
 * 확장된 20개 색상 팔레트를 제공
 *
 * @component
 * @param {ColorPickerProps} props - 컴포넌트 속성
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, className = '', compact = false }) => {
  // 확장된 색상 팔레트 (20개)
  const colors: ExtendedColorEnum[] = [
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
    'red',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'sky',
    'slate',
    'grey',
    'stone',
  ];

  // 색상 이름과 실제 Tailwind 색상 코드 매핑
  const colorMap: Record<ExtendedColorEnum, string> = {
    blue: '#3B82F6',
    red: '#EF4444',
    yellow: '#EAB308',
    green: '#22C55E',
    pink: '#EC4899',
    purple: '#A855F7',
    cyan: '#06B6D4',
    orange: '#F97316',
    grey: '#6B7280',
    indigo: '#6366F1',
    teal: '#14B8A6',
    lime: '#84CC16',
    amber: '#F59E0B',
    rose: '#F43F5E',
    violet: '#8B5CF6',
    sky: '#0EA5E9',
    emerald: '#10B981',
    fuchsia: '#D946EF',
    slate: '#64748B',
    stone: '#78716C',
  };

  return (
    <div className={`flex flex-wrap ${compact ? 'gap-0.5' : 'gap-1.5 p-2'} ${compact ? '' : 'glass-card'} ${className}`}>
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={`
            ${compact ? 'w-4 h-4' : 'w-6 h-6'}
            rounded-full
            transition-all
            hover:scale-110
            ${value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : ''}
          `}
          style={{ backgroundColor: colorMap[color] }}
          title={color}
          aria-label={`색상 선택: ${color}`}
        />
      ))}
    </div>
  );
};
