import type { ExtendedColorEnum } from './category';

/**
 * 탭 그룹 스냅샷 타입
 * 탭 그룹의 상태를 저장하고 나중에 복원하기 위한 데이터 구조
 */
export interface TabGroupSnapshot {
  id: string; // 스냅샷 고유 ID (timestamp 기반)
  name: string; // 사용자 정의 스냅샷 이름
  groupTitle: string; // 원본 탭 그룹 제목
  color: ExtendedColorEnum; // 탭 그룹 색상
  tabs: SavedTab[]; // 저장된 탭 목록
  createdAt: number; // 생성 시간 (timestamp)
  updatedAt: number; // 마지막 수정 시간 (timestamp)
}

/**
 * 저장된 탭 정보
 */
export interface SavedTab {
  url: string; // 탭 URL
  title: string; // 탭 제목
  favIconUrl?: string; // 파비콘 URL
}

/**
 * 스냅샷 목록을 저장하는 storage 키
 */
export const SNAPSHOTS_STORAGE_KEY = 'tabGroupSnapshots';
