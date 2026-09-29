import { useState, useEffect } from 'react';
import ProtectedLayout from './layouts/ProtectedLayout';
import HomePage from './pages/Home';
import CodeAnalysisPage from './pages/CodeAnalysis';
import FindingResultPage from './pages/FindingResult';
import AuthPage from './pages/Auth';
import { PAGES } from './constants/navigation';
import { clearSessionUser } from './services/authService';

/**
 * 앱 최상위 루트 컴포넌트
 * - 초기 접속 시 로그아웃 상태(null)로 시작
 * - 로그인/회원가입(회원 추가) 및 로그아웃 기능 지원
 */
export default function App() {
  const [page, setPage] = useState(PAGES.HOME);
  // 처음 들어가게 되면 로그아웃 상태 (null)
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin = () => {
    setPage(PAGES.LOGIN);
  };

  const handleLogout = () => {
    clearSessionUser();
    setCurrentUser(null);
    setPage(PAGES.HOME);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setPage(PAGES.HOME);
  };

  // 로그인/회원가입 화면은 사이드바 없는 중앙 카드 레이아웃
  if (page === PAGES.LOGIN) {
    return (
      <AuthPage
        onLoginSuccess={handleLoginSuccess}
        setPage={setPage}
      />
    );
  }

  return (
    <ProtectedLayout
      page={page}
      setPage={setPage}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {page === PAGES.HOME ? (
        <HomePage
          setPage={setPage}
          currentUser={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      ) : page === PAGES.ANALYZE ? (
        <CodeAnalysisPage
          setPage={setPage}
          currentUser={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      ) : (
        <FindingResultPage
          currentUser={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      )}
    </ProtectedLayout>
  );
}
