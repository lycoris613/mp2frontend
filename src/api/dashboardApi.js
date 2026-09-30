/**
 * 홈 대시보드 통계 REST API 모듈 (03 REST API 설계서 4.4.2 준수)
 */
import apiClient from './client.js';

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
};

export default dashboardApi;
