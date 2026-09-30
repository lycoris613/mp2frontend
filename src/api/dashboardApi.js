/**
 * 홈 대시보드 통계 및 분석 목록 REST API 모듈
 */
import apiClient, { IS_MOCK } from './client.js';
import { dashboardMetrics, recentAnalyses } from '../data/dashboardData.js';

// Mock 네트워크 지연 흉내내기 함수
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const dashboardApi = {
  /**
   * 홈 대시보드 통계 조회
   * @param {number} days - 집계 기간 (기본값: 30)
   */
  getDashboardSummary: async (days = 30) => {
    if (IS_MOCK) {
      await delay();
      return { success: true, data: dashboardMetrics };
    }
    const response = await apiClient.get('/dashboard/summary', {
      params: { days },
    });
    return response.data;
  },

  /**
   * 분석 결과 목록 조회 (필터링, 검색, 정렬 지원)
   * @param {Object} params - { project, severity, search, sortBy }
   */
  getAnalyses: async (params = {}) => {
    if (IS_MOCK) {
      await delay();
      let list = [...recentAnalyses];

      // 1. 프로젝트 필터링 (?project=...)
      if (params.project) {
        list = list.filter((item) => item.project === params.project);
      }

      // 2. 심각도 필터링
      if (params.severity && params.severity !== 'ALL') {
        list = list.filter((item) => item.severity === params.severity);
      }

      // 3. 검색어 필터링 (프로젝트명 또는 취약점 이름)
      if (params.search) {
        const query = params.search.toLowerCase();
        list = list.filter(
          (item) =>
            item.project?.toLowerCase().includes(query) ||
            item.vulnerability?.toLowerCase().includes(query)
        );
      }

      // 4. 정렬 처리 (최신순 / 심각도순)
      if (params.sortBy === 'severity') {
        const severityOrder = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
        list.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));
      }

      return { success: true, data: list, total: list.length };
    }

    const response = await apiClient.get('/analyses', { params });
    return response.data;
  },

  /**
   * 분석 결과 단건 삭제
   * @param {string|number} id - 삭제할 분석 항목 ID
   */
  deleteAnalysis: async (id) => {
    if (IS_MOCK) {
      await delay(200);
      return { success: true, id };
    }
    const response = await apiClient.delete(`/analyses/${id}`);
    return response.data;
  },
};

export default dashboardApi;