/**
 * 대시보드 및 분석 목록 통합 상태 스토어 (Zustand)
 */
import { create } from 'zustand';
import { dashboardApi } from '../api/dashboardApi.js';

export const useDashboardStore = create((set, get) => ({
  // 기존 상태
  summary: null,
  
  // 신규 상태 (목록, 필터, 로딩 상태)
  metrics: [],
  analyses: [],
  isLoading: false,
  error: null,

  // 필터 및 정렬 상태
  filters: {
    project: null,
    severity: 'ALL',
    search: '',
    sortBy: 'latest', // 'latest' | 'severity'
  },

  /**
   * [기존] 대시보드 요약 정보 조회
   */
  fetchSummary: async (days = 30) => {
    set({ isLoading: true, error: null });
    try {
      const summary = await dashboardApi.getDashboardSummary(days);
      set({ summary, isLoading: false });
      return summary;
    } catch (err) {
      set({ error: err.message || '대시보드 통계를 불러오지 못했습니다.', isLoading: false });
      throw err;
    }
  },

  /**
   * 대시보드 지표 조회 (캐싱 적용)
   */
  fetchMetrics: async (force = false) => {
    if (get().metrics.length > 0 && !force) return;
    set({ isLoading: true, error: null });
    try {
      const res = await dashboardApi.getDashboardSummary();
      set({ metrics: res.data || res, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  /**
   * 분석 목록 조회 (필터링 및 정렬 적용)
   */
  fetchAnalyses: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();
      const res = await dashboardApi.getAnalyses(filters);
      let list = Array.isArray(res) ? res : res?.data || [];

      // 정렬 처리
      if (filters.sortBy === 'severity') {
        const severityOrder = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
        list.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));
      } else {
        list.sort((a, b) => new Date(b.date || Date.now()) - new Date(a.date || Date.now()));
      }

      set({ analyses: list, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  /**
   * 필터 조건 변경 및 목록 재조회
   */
  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value } }));
    get().fetchAnalyses();
  },

  /**
   * 분석 결과 항목 단건 삭제
   */
  removeAnalysis: async (id) => {
    try {
      await dashboardApi.deleteAnalysis(id);
      set((state) => ({
        analyses: state.analyses.filter((item) => item.id !== id),
      }));
      return true;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  /**
   * 에러 초기화
   */
  clearError: () => set({ error: null }),
}));

export default useDashboardStore;