import { storage } from 'wxt/utils/storage';
import type { Category } from '../types/category';
import type { CategoryHistory, TabData } from '../types/storage';

/**
 * 스토리지 스키마 정의
 * Chrome 확장 프로그램의 동기화 및 로컬 스토리지 구조
 */
export interface StorageSchema {
  // 동기화 스토리지 항목 (모든 기기에 동기화)
  'sync:categories': Category[]; // 카테고리 목록
  'sync:categoryMapping': Record<string, string>; // 도메인-카테고리 매핑

  // 로컬 스토리지 항목 (현재 기기에만 저장)
  'local:hasSeenWelcome': boolean; // 환영 메시지 표시 여부
  'local:categoryHistory': Record<string, CategoryHistory>; // 카테고리 히스토리
  'local:tabsData': TabData[]; // 탭 데이터 배열
}

/**
 * 🚀 Storage 작업 배칭 큐
 * 여러 storage 작업을 배칭하여 성능 향상
 */
interface StorageBatch {
  key: keyof StorageSchema;
  value: any;
}

let storageBatchQueue: StorageBatch[] = [];
let storageBatchTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * 🚀 배칭된 storage 쓰기 실행
 */
async function flushStorageBatch() {
  if (storageBatchQueue.length === 0) return;

  const batch = [...storageBatchQueue];
  storageBatchQueue = [];

  // 병렬로 모든 쓰기 작업 실행
  await Promise.all(
    batch.map(({ key, value }) =>
      storage.setItem(key, value).catch(err => {
        console.error(`[storage] Failed to set ${key}:`, err);
      })
    )
  );
}

/**
 * 🚀 배칭된 storage 쓰기
 * 짧은 시간 내에 여러 번 호출되면 배칭하여 성능 향상
 */
function batchedSetItem<T>(key: keyof StorageSchema, value: T, delay: number = 100) {
  // 기존 큐에서 같은 키 제거 (최신 값만 유지)
  storageBatchQueue = storageBatchQueue.filter(item => item.key !== key);

  // 새 항목 추가
  storageBatchQueue.push({ key, value });

  // 타이머 리셋
  if (storageBatchTimeout) {
    clearTimeout(storageBatchTimeout);
  }

  storageBatchTimeout = setTimeout(() => {
    flushStorageBatch();
  }, delay);
}

/**
 * 스토리지 유틸리티 객체
 * WXT 스토리지 API를 래핑하여 타입 안전성과 편의성 제공
 * 🚀 성능 최적화: 배칭 및 캐싱 적용
 */
export const storageUtils = {
  // === 동기화 스토리지 메서드 ===

  /**
   * 카테고리 목록 가져오기
   */
  async getCategories() {
    return (await storage.getItem<Category[]>('sync:categories')) || [];
  },

  /**
   * 카테고리 목록 저장
   * 🚀 성능 최적화: 배칭 적용 (빠른 연속 호출 시 병합)
   */
  async setCategories(categories: Category[], batched: boolean = true) {
    if (batched) {
      batchedSetItem('sync:categories', categories);
    } else {
      await storage.setItem('sync:categories', categories);
    }
  },

  /**
   * 도메인-카테고리 매핑 가져오기
   */
  async getCategoryMapping() {
    return (await storage.getItem<Record<string, string>>('sync:categoryMapping')) || {};
  },

  /**
   * 도메인-카테고리 매핑 저장
   * 🚀 성능 최적화: 배칭 적용
   */
  async setCategoryMapping(mapping: Record<string, string>, batched: boolean = true) {
    if (batched) {
      batchedSetItem('sync:categoryMapping', mapping);
    } else {
      await storage.setItem('sync:categoryMapping', mapping);
    }
  },

  // === 로컬 스토리지 메서드 ===

  /**
   * 환영 메시지 표시 여부 가져오기
   */
  async getHasSeenWelcome() {
    return (await storage.getItem<boolean>('local:hasSeenWelcome')) || false;
  },

  /**
   * 환영 메시지 표시 여부 저장
   */
  async setHasSeenWelcome(value: boolean) {
    await storage.setItem('local:hasSeenWelcome', value);
  },

  /**
   * 카테고리 히스토리 가져오기
   */
  async getCategoryHistory() {
    return (await storage.getItem<Record<string, CategoryHistory>>('local:categoryHistory')) || {};
  },

  /**
   * 카테고리 히스토리 저장
   */
  async setCategoryHistory(history: Record<string, CategoryHistory>) {
    await storage.setItem('local:categoryHistory', history);
  },

  // Generic storage access methods
  async getItem<T>(key: keyof StorageSchema): Promise<T | null> {
    return await storage.getItem<T>(key);
  },

  async setItem<T>(key: keyof StorageSchema, value: T): Promise<void> {
    await storage.setItem(key, value);
  },

  // Get tabs data
  async getTabsData() {
    return (await storage.getItem<TabData[]>('local:tabsData')) || [];
  },

  async setTabsData(data: TabData[]) {
    await storage.setItem('local:tabsData', data);
  },

  // Clear all local storage
  async clearLocalStorage() {
    const localKeys = ['local:hasSeenWelcome', 'local:categoryHistory', 'local:tabsData'];

    // 🚀 최적화: 병렬로 삭제
    await Promise.all(
      localKeys.map(key =>
        storage.removeItem(key as keyof StorageSchema).catch(err => {
          console.error(`[storage] Failed to remove ${key}:`, err);
        })
      )
    );
  },

  /**
   * 🚀 배칭 큐 즉시 실행 (중요한 작업 전에 호출)
   */
  async flush() {
    await flushStorageBatch();
  },
};

// Watch storage changes
export function watchCategories(callback: (newValue: Category[] | null, oldValue: Category[] | null) => void) {
  return storage.watch<Category[]>('sync:categories', callback);
}

export function watchCategoryMapping(callback: (newValue: Record<string, string> | null, oldValue: Record<string, string> | null) => void) {
  return storage.watch<Record<string, string>>('sync:categoryMapping', callback);
}
