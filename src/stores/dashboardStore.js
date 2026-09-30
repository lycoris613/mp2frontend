/**
 * 홈 대시보드 상태 스토어 (05 React 컴포넌트 설계서 표 7-3 준수)
 */
import { create } from 'zustand';
import { dashboardApi } from '../api/dashboardApi.js';

export const useDashboardStore = create((set, get) => ({
  summary: null,
  loading: false,
  error: null,

  /**
   * 대시보드 통계 조회
   * @param {number} days - 집계 기간 (기본값: 30)
   */
  fetchSummary: async (days = 30) => {
    set({ loading: true, error: null });
    try {
      const summary = await dashboardApi.getDashboardSummary(days);
      set({ summary, loading: false });
      return summary;
    } catch (err) {
      set({ error: err.message || '대시보드 통계를 불러오지 못했습니다.', loading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useDashboardStore;
