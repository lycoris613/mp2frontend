/**
 * 인증 및 회원 관리 서비스 (LocalStorage 기반 지속성 지원)
 * 05 React 컴포넌트 설계서 표 7-1(authStore) 준수
 */

const STORAGE_USERS_KEY = 'codeguard_registered_users';
const STORAGE_CURRENT_USER_KEY = 'codeguard_current_user';

// 기본 등록된 초기 데모 계정 목록
const INITIAL_DEMO_USERS = [
  {
    id: 1,
    name: '지웅',
    email: 'jiwoong@codeguard.ai',
    password: 'password123',
    role: 'Frontend / LLM',
  },
  {
    id: 2,
    name: '서연',
    email: 'seoyeon@codeguard.ai',
    password: 'password123',
    role: 'Backend Engineer',
  },
];

// 저장소에서 회원 목록 가져오기
export function getRegisteredUsers() {
  try {
    const data = localStorage.getItem(STORAGE_USERS_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_DEMO_USERS));
      return INITIAL_DEMO_USERS;
    }
    const users = JSON.parse(data);
    // 기존 캐시된 데이터가 있을 경우 서연 (Backend)으로 마이그레이션
    const migrated = users.map((u) =>
      u.name === '재훈' || u.email === 'jaehoon@codeguard.ai'
        ? { ...u, name: '서연', email: 'seoyeon@codeguard.ai', role: 'Backend Engineer' }
        : u
    );
    return migrated;
  } catch {
    return INITIAL_DEMO_USERS;
  }
}

// 신규 회원 등록 (회원 추가 기능)
export function registerUser({ name, email, password, role = 'Developer' }) {
  const users = getRegisteredUsers();
  
  // 이메일 중복 검사
  const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    throw new Error('이미 등록된 이메일 주소입니다.');
  }

  const newUser = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim(),
    password,
    role: role.trim() || 'Developer',
  };

  const updatedUsers = [...users, newUser];
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));
  return newUser;
}

// 로그인 인증 검사
export function authenticateUser(email, password) {
  const users = getRegisteredUsers();
  const user = users.find(
    (u) =>
      u.email.toLowerCase() === email.trim().toLowerCase() &&
      u.password === password
  );

  if (!user) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}

// 현재 로그인된 세션 사용자 가져오기
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
}
