/**
 * 인증 및 회원 관리 서비스 (백엔드 REST API 연동)
 */

import { authApi } from '../api/authApi';

const STORAGE_CURRENT_USER_KEY = 'codeguard_current_user';
const STORAGE_TOKEN_KEY = 'codeguard_token';

// 신규 회원 등록 (회원가입 백엔드 연동)
export async function registerUser({ name, email, password, role = 'Developer' }) {
  const result = await authApi.signup({ email, password });

  return {
    id: result.id,
    email: result.email || email,
    name: name || result.email || email,
    role,
  };
}

// 로그인 인증 (백엔드 JWT 발급)
export async function authenticateUser(email, password) {
  const result = await authApi.login({ email, password });
  if (!result?.accessToken) {
    throw new Error('로그인 응답에 토큰이 없습니다.');
  }

  // 백엔드는 이름/직책을 내려주지 않으므로 이메일 기반으로 세션 유저 구성
  const sessionUser = {
    id: result.id,
    name: result.email.split('@')[0],
    email: result.email,
    role: 'Developer',
  };

  localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(sessionUser));
  localStorage.setItem(STORAGE_TOKEN_KEY, result.accessToken);
  return sessionUser;
}

// 현재 로그인된 세션 사용자 가져오기 (새로고침 유지용)
export function getCurrentSessionUser() {
  try {
    const data = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// 로그아웃 처리
export function clearSessionUser() {
  localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
  localStorage.removeItem(STORAGE_TOKEN_KEY);
}
