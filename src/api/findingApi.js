/**
 * 취약점 관련 REST API 호출 모듈 (03 REST API 설계서 4.3 준수)
 */
import apiClient from './client.js';

export const findingApi = {
  /**
   * 4.3.1 취약점 목록 조회
   * @param {number|string} analysisId
   * @param {Object} params - { type, ruleId, severity, status, fileId, page, size }
   */
  getFindings: async (analysisId, params = {}) => {
    const response = await apiClient.get(`/analyses/${analysisId}/findings`, { params });
    return response.data;
  },

  /**
   * 4.3.2 취약점 상세 조회 (LLM 분석 및 Diff 포함)
   * @param {number|string} findingId
   */
  getFindingDetail: async (findingId) => {
    const response = await apiClient.get(`/findings/${findingId}`);
    return response.data;
  },

  /**
   * 4.3.3 취약점 처리 상태 변경 (OPEN, RESOLVED, IGNORED)
   * @param {number|string} findingId
   * @param {string} status - 'OPEN' | 'RESOLVED' | 'IGNORED'
   */
  updateFindingStatus: async (findingId, status) => {
    const response = await apiClient.patch(`/findings/${findingId}/status`, { status });
    return response.data;
  },
};

export default findingApi;
