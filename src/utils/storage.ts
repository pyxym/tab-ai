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
 * 스토리지 유틸리티 객체
 * WXT 스토리지 API를 래핑하여 타입 안전성과 편의성 제공
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
   */
  async setCategories(categories: Category[]) {
    await storage.setItem('sync:categories', categories);
  },

  /**
   * 도메인-카테고리 매핑 가져오기
   */
  async getCategoryMapping() {
    return (await storage.getItem<Record<string, string>>('sync:categoryMapping')) || {};
  },

  /**
   * 도메인-카테고리 매핑 저장
   */
  async setCategoryMapping(mapping: Record<string, string>) {
    await storage.setItem('sync:categoryMapping', mapping);
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

    for (const key of localKeys) {
      await storage.removeItem(key as keyof StorageSchema);
    }
  },
};

// Watch storage changes
export function watchCategories(callback: (newValue: Category[] | null, oldValue: Category[] | null) => void) {
  return storage.watch<Category[]>('sync:categories', callback);
}

export function watchCategoryMapping(callback: (newValue: Record<string, string> | null, oldValue: Record<string, string> | null) => void) {
  return storage.watch<Record<string, string>>('sync:categoryMapping', callback);
}
