/**
 * 홈 대시보드 통계 및 분석 결과 목록 REST API 모듈 (03 REST API 설계서 4.4.2 준수)
 */
import apiClient, { USE_MOCK } from './client.js';
import { recentAnalyses } from '../data/dashboardData.js';

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export const dashboardApi = {
  /**
   * 4.4.2 홈 대시보드 통계 조회
   * @param {number} days - 집계 기간 (기본값: 30)
   */
  getDashboardSummary: async (days = 30) => {
    const response = await apiClient.get('/dashboard/summary', {
      params: { days },
    });
    return response.data;
  },

  /**
   * 분석 결과 목록 조회 (AnalysisListPage 전용 — 필터링/검색/정렬 지원)
   * @param {Object} params - { project, severity, search, sortBy }
   */
  getAnalyses: async (params = {}) => {
    if (USE_MOCK) {
      await delay();
      let list = [...recentAnalyses];

      if (params.project) {
        list = list.filter((item) => item.project === params.project);
      }
      if (params.severity && params.severity !== 'ALL') {
        list = list.filter((item) => item.severity === params.severity);
      }
      if (params.search) {
        const query = params.search.toLowerCase();
        list = list.filter(
          (item) =>
            item.project?.toLowerCase().includes(query) ||
            item.vulnerability?.toLowerCase().includes(query)
        );
      }
      if (params.sortBy === 'severity') {
        const order = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
        list.sort((a, b) => (order[a.severity] || 99) - (order[b.severity] || 99));
      } else {
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
      }

      return { success: true, data: list };
    }
    const response = await apiClient.get('/analyses', { params });
    return response.data;
  },

  /**
   * 분석 결과 단건 삭제 (AnalysisListPage 전용)
   * @param {string|number} id
   */
  deleteAnalysis: async (id) => {
    if (USE_MOCK) {
      await delay(200);
      return { success: true, id };
    }
    const response = await apiClient.delete(`/analyses/${id}`);
    return response.data;
  },
};

export default dashboardApi;
