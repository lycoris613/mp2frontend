/**
 * Axios 클라이언트 모듈 (실제 Spring Boot REST API 연동)
 * 기본 API Base URL: http://localhost:8080/api/v1
 */

import axios from 'axios';

// Mock 모드 완전 비활성화 (실제 백엔드 전용)
export const USE_MOCK = false;

const API_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:8080/api/v1';

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
    const token =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('codeguard_token')
        : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. 응답 인터셉터: 공통 응답 처리 및 에러 파싱
apiClient.interceptors.response.use(
  (response) => {
    const resData = response.data;
    // 백엔드의 ApiResponse<T> 형식 ({ success: true, data: ... }) 자동 언래핑
    if (resData && typeof resData === 'object' && 'success' in resData && 'data' in resData) {
      return resData.data;
    }
    return resData;
  },
  (error) => {
    const errorData = error.response?.data || {};
    const message = errorData.message || error.message || '네트워크 오류가 발생했습니다.';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
