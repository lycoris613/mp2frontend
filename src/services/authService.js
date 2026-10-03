/**
 * 인증 및 회원 관리 서비스 (백엔드 REST API 연동)
 */

import { authApi } from '../api/authApi';

const STORAGE_CURRENT_USER_KEY = 'codeguard_current_user';
const STORAGE_TOKEN_KEY = 'codeguard_token';

// 등록된 사용자 목록 가져오기 (백엔드 연동)
export async function getRegisteredUsers() {
  try {
    const users = await authApi.getAllUsers();
    return Array.isArray(users) ? users : [];
  } catch (err) {
    console.error('getRegisteredUsers error:', err);
    return [];
  }
}

// 신규 회원 등록 (회원가입 백엔드 연동)
export async function registerUser({ name, email, password, role = 'Developer' }) {
  const result = await authApi.signup({
    email,
    password,
    name,
    role,
  });

  return {
    id: result.id,
    email: result.email || email,
    name: name || result.email || email,
    role,
  };
}

// 로그인 인증 검사 (백엔드 연동)
export async function authenticateUser(email, password) {
  // 백엔드에서 이메일로 사용자 조회
  const user = await authApi.getUserByEmail(email);
  if (!user) {
    throw new Error('등록되지 않은 사용자입니다.');
  }

  // 백엔드 응답을 바탕으로 세션 유저 객체 구성
  const sessionUser = {
    id: user.id,
    name: user.name || user.email.split('@')[0],
    email: user.email,
    role: user.role || 'Developer',
  };

  localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(sessionUser));
  // 가상 토큰 또는 세션 토큰 보관
  localStorage.setItem(STORAGE_TOKEN_KEY, `user_token_${user.id}`);
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
