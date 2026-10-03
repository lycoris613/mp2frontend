/**
 * 사용자 및 인증 관련 REST API 모듈
 * 백엔드 UserController 연동: http://localhost:8080/api/user
 */

import axios from 'axios';

const BACKEND_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL
    : 'http://localhost:8080';

const userClient = axios.create({
  baseURL: `${BACKEND_BASE}/api/user`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  /**
   * 신규 사용자 등록 (회원가입)
   * @param {Object} data - { email, password, name, role }
   */
  signup: async ({ email, password, name, role }) => {
    try {
      const response = await userClient.post('', {
        email: email.trim(),
        password,
        name: name ? name.trim() : undefined,
        role: role || 'DEVELOPER',
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '회원가입에 실패했습니다.';
      throw new Error(msg);
    }
  },

  /**
   * 이메일로 사용자 정보 조회 (로그인 검증용)
   * @param {string} email
   */
  getUserByEmail: async (email) => {
    try {
      const response = await userClient.get(`/email/${encodeURIComponent(email.trim())}`);
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error('등록되지 않은 사용자입니다.');
      }
      const msg = err.response?.data?.message || err.message || '사용자 조회 실패';
      throw new Error(msg);
    }
  },

  /**
   * 전체 사용자 목록 조회 (빠른 데모 선택용)
   */
  getAllUsers: async () => {
    try {
      const response = await userClient.get('');
      return response.data;
    } catch (err) {
      console.warn('전체 사용자 목록 조회 실패:', err.message);
      return [];
    }
  },

  /**
   * 사용자 ID로 상세 조회
   * @param {number|string} id
   */
  getUserById: async (id) => {
    try {
      const response = await userClient.get(`/${id}`);
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || '사용자 정보 조회 실패');
    }
  },
};

export default authApi;
