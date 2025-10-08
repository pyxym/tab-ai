import type { ExtendedColorEnum } from '../types/category';

/**
 * 확장된 색상을 HEX 색상 코드로 변환
 * @param {string} color - 확장된 색상 이름
 * @returns {string} HEX 색상 코드
 */
export function getColorHex(color: string | ExtendedColorEnum): string {
  const colorMap: Record<string, string> = {
    blue: '#3B82F6',
    red: '#EF4444',
    yellow: '#F59E0B',
    green: '#10B981',
    pink: '#EC4899',
    purple: '#8B5CF6',
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
  return colorMap[color] || colorMap.grey;
}
