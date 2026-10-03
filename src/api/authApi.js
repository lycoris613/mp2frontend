/**
 * 사용자 및 인증 관련 REST API 모듈
 * 백엔드 UserController 연동: http://localhost:8080/api/v1/auth (signup / login)
 */

import axios from 'axios';

const BACKEND_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL
    : 'http://localhost:8080';

const authClient = axios.create({
  baseURL: `${BACKEND_BASE}/api/v1/auth`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const errorMessage = (err, fallback) => {
  const data = err.response?.data;
  // 검증 실패 시 백엔드가 필드별 메시지를 내려주는 경우를 우선 노출
  return data?.message || data?.error || err.message || fallback;
};

export const authApi = {
  /**
   * 신규 사용자 등록 (회원가입)
   * @param {Object} data - { email, password }
   * @returns {Promise<{id:number,email:string}>}
   */
  signup: async ({ email, password }) => {
    try {
      const response = await authClient.post('/signup', {
        email: email.trim(),
        password,
      });
      return response.data;
    } catch (err) {
      throw new Error(errorMessage(err, '회원가입에 실패했습니다.'));
    }
  },

  /**
   * 로그인 (JWT 발급)
   * @returns {Promise<{id:number,email:string,accessToken:string,tokenType:string,expiresIn:number}>}
   */
  login: async ({ email, password }) => {
    try {
      const response = await authClient.post('/login', {
        email: email.trim(),
        password,
      });
      return response.data;
    } catch (err) {
      const status = err.response?.status;
      // 백엔드가 잘못된 자격 증명을 500("Bad credentials")으로 내려주는 경우도 포함
      if (status === 401 || status === 403 || err.response?.data?.message === 'Bad credentials') {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      throw new Error(errorMessage(err, '로그인에 실패했습니다.'));
    }
  },
};

export default authApi;
