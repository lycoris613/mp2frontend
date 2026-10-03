/**
 * 분석 관련 REST API 호출 모듈 (03 REST API 설계서 4.1, 4.2 준수)
 */
import apiClient from './client.js';

const unwrap = (res) => (res && res.data !== undefined ? res.data : res);

export const analysisApi = {
  /**
   * 4.1.1 분석 요청 생성 및 시작
   * @param {Object} data - { title, files: [{ relativePath, content }], scanOptions }
   */
  createAnalysis: async (data) => {
    const response = await apiClient.post('/analyses', data);
    return unwrap(response);
  },

  /**
   * 4.1.2 분석 진행 상태 조회 (폴링)
   * @param {number|string} analysisId
   */
  getAnalysisStatus: async (analysisId) => {
    const response = await apiClient.get(`/analyses/${analysisId}/status`);
    return unwrap(response);
  },

  /**
   * 4.1.3 분석 목록 조회
   * @param {Object} params - { page, size, status, sort }
   */
  getAnalyses: async (params = {}) => {
    const response = await apiClient.get('/analyses', { params });
    return unwrap(response);
  },

  /**
   * 4.1.4 분석 상세(요약) 조회
   * @param {number|string} analysisId
   */
  getAnalysisDetail: async (analysisId) => {
    const response = await apiClient.get(`/analyses/${analysisId}`);
    return unwrap(response);
  },

  /**
   * 4.1.5 분석 삭제
   * @param {number|string} analysisId
   */
  deleteAnalysis: async (analysisId) => {
    const response = await apiClient.delete(`/analyses/${analysisId}`);
    return response;
  },

  /**
   * 4.2.1 파일 트리 조회
   * @param {number|string} analysisId
   */
  getAnalysisFiles: async (analysisId) => {
    const response = await apiClient.get(`/analyses/${analysisId}/files`);
    return unwrap(response);
  },

  /**
   * 4.2.2 파일 코드 본문 조회 (마커 포함)
   * @param {number|string} analysisId
   * @param {number|string} fileId
   */
  getAnalysisFileContent: async (analysisId, fileId) => {
    const response = await apiClient.get(`/analyses/${analysisId}/files/${fileId}`);
    return unwrap(response);
  },

  /**
   * 4.4.1 보고서 내보내기
   * @param {number|string} analysisId
   */
  getAnalysisReport: async (analysisId) => {
    const response = await apiClient.get(`/analyses/${analysisId}/report`);
    return unwrap(response);
  },
};

export default analysisApi;
