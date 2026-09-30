/**
 * Axios 클라이언트 및 Mock 시뮬레이션 인터셉터
 * 03 REST API 설계서 공통 규격 준수
 *
 * - 백엔드 연동 전: USE_MOCK = true (mockDb 기반 응답 및 네트워크 딜레이 모사)
 * - 백엔드 연동 후: USE_MOCK = false (실제 Spring Boot http://localhost:8080/api/v1 호출)
 */

import axios from 'axios';
import { mockDb } from '../mock/mockData.js';

// 환경변수 또는 플래그로 Mock 모드 제어 (기본값: true)
export const USE_MOCK =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK !== undefined
    ? import.meta.env.VITE_USE_MOCK !== 'false'
    : true;

const API_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. 요청 인터셉터: 인증 토큰 주입
apiClient.interceptors.request.use(
  (config) => {
    // 세션 토큰 확인 (localStorage)
    const token =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('codeguard_token') || 'demo_mock_jwt_token'
        : 'demo_mock_jwt_token';

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Mock 모드 어댑터: 백엔드 서버 없이도 실제 Axios 요청/응답 파이프라인 검증
if (USE_MOCK) {
  apiClient.defaults.adapter = async (config) => {
    // 100ms ~ 250ms 네트워크 딜레이 시뮬레이션
    const latency = Math.floor(Math.random() * 150) + 100;
    await new Promise((resolve) => setTimeout(resolve, latency));

    const method = (config.method || 'get').toUpperCase();
    const url = config.url || '';
    const params = config.params || {};
    let body = {};
    if (config.data) {
      try {
        body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      } catch {
        body = config.data;
      }
    }

    try {
      // 1) GET /dashboard/summary
      if (method === 'GET' && url.includes('/dashboard/summary')) {
        const data = mockDb.getDashboardSummary();
        return createMockResponse(config, 200, { success: true, data });
      }

      // 2) POST /analyses (분석 생성)
      if (method === 'POST' && url.endsWith('/analyses')) {
        const data = mockDb.createAnalysis(body);
        return createMockResponse(config, 202, {
          success: true,
          data,
          message: '분석 요청이 접수되었습니다',
        });
      }

      // 3) GET /analyses/{id}/status (폴링)
      const statusMatch = url.match(/\/analyses\/(\d+)\/status$/);
      if (method === 'GET' && statusMatch) {
        const analysisId = statusMatch[1];
        const data = mockDb.getAnalysisStatus(analysisId);
        return createMockResponse(config, 200, { success: true, data });
      }

      // 4) GET /analyses/{id}/files/{fileId} (파일 본문 & 마커)
      const fileContentMatch = url.match(/\/analyses\/(\d+)\/files\/(\d+)$/);
      if (method === 'GET' && fileContentMatch) {
        const [, analysisId, fileId] = fileContentMatch;
        const data = mockDb.getFileContent(analysisId, fileId);
        if (!data) {
          return createMockErrorResponse(config, 404, 'NOT_FOUND', '파일을 찾을 수 없습니다.');
        }
        return createMockResponse(config, 200, { success: true, data });
      }

      // 5) GET /analyses/{id}/files (파일 트리)
      const filesMatch = url.match(/\/analyses\/(\d+)\/files$/);
      if (method === 'GET' && filesMatch) {
        const analysisId = filesMatch[1];
        const data = mockDb.getAnalysisFiles(analysisId);
        return createMockResponse(config, 200, { success: true, data });
      }

      // 6) GET /analyses/{id}/findings (취약점 목록)
      const findingsMatch = url.match(/\/analyses\/(\d+)\/findings$/);
      if (method === 'GET' && findingsMatch) {
        const analysisId = findingsMatch[1];
        const data = mockDb.getFindings(analysisId, params);
        return createMockResponse(config, 200, { success: true, data });
      }

      // 7) GET /findings/{findingId} (취약점 상세)
      const findingDetailMatch = url.match(/\/findings\/(\d+)$/);
      if (method === 'GET' && findingDetailMatch) {
        const findingId = findingDetailMatch[1];
        const data = mockDb.getFindingDetail(findingId);
        if (!data) {
          return createMockErrorResponse(config, 404, 'NOT_FOUND', '취약점 정보를 찾을 수 없습니다.');
        }
        return createMockResponse(config, 200, { success: true, data });
      }

      // 8) PATCH /findings/{findingId}/status (취약점 상태 변경)
      const findingStatusMatch = url.match(/\/findings\/(\d+)\/status$/);
      if (method === 'PATCH' && findingStatusMatch) {
        const findingId = findingStatusMatch[1];
        try {
          const data = mockDb.updateFindingStatus(findingId, body.status);
          return createMockResponse(config, 200, {
            success: true,
            data,
            message: '취약점 상태가 변경되었습니다',
          });
        } catch (e) {
          return createMockErrorResponse(config, 409, 'ALREADY_RESOLVED', e.message);
        }
      }

      // 9) GET /analyses/{id} (분석 요약)
      const analysisDetailMatch = url.match(/\/analyses\/(\d+)$/);
      if (method === 'GET' && analysisDetailMatch) {
        const analysisId = analysisDetailMatch[1];
        const data = mockDb.getAnalysisDetail(analysisId);
        if (!data) {
          return createMockErrorResponse(config, 404, 'NOT_FOUND', '분석을 찾을 수 없습니다.');
        }
        return createMockResponse(config, 200, { success: true, data });
      }

      // 10) DELETE /analyses/{id} (분석 삭제)
      if (method === 'DELETE' && analysisDetailMatch) {
        const analysisId = analysisDetailMatch[1];
        const data = mockDb.deleteAnalysis(analysisId);
        return createMockResponse(config, 200, data);
      }

      // 11) GET /analyses (분석 목록)
      if (method === 'GET' && (url.endsWith('/analyses') || url === '/analyses')) {
        const data = mockDb.getAnalyses(params);
        return createMockResponse(config, 200, { success: true, data });
      }

      // 12) Fallback
      return createMockResponse(config, 200, { success: true, data: null });
    } catch (err) {
      return createMockErrorResponse(config, 500, 'INTERNAL_SERVER_ERROR', err.message || '서버 오류');
    }
  };
}

function createMockResponse(config, status, data) {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : status === 202 ? 'Accepted' : 'Created',
    headers: { 'content-type': 'application/json' },
    config,
  };
}

function createMockErrorResponse(config, status, errorCode, message) {
  const error = new Error(message);
  error.response = {
    status,
    statusText: 'Error',
    headers: { 'content-type': 'application/json' },
    config,
    data: {
      success: false,
      statusCode: status,
      errorCode,
      message,
    },
  };
  return Promise.reject(error);
}

// 3. 응답 인터셉터: 공통 응답 처리 및 에러 파싱
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const errorData = error.response?.data || {};
    const message = errorData.message || error.message || '네트워크 오류가 발생했습니다.';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
