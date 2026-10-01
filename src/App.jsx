import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ProtectedLayout from './layouts/ProtectedLayout';
import HomePage from './pages/Home';
import CodeAnalysisPage from './pages/CodeAnalysis';
import FindingResultPage from './pages/FindingResult';
import AuthPage from './pages/Auth';
import { getCurrentSessionUser, clearSessionUser } from './services/authService';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인 상태 — localStorage 세션과 동기화 (authService 준수)
  const [currentUser, setCurrentUser] = useState(() => getCurrentSessionUser());

  const handleLogout = () => {
    clearSessionUser();
    setCurrentUser(null);
    navigate('/login');
  };

  // 로그인 화면은 사이드바 없는 레이아웃
  if (location.pathname === '/login') {
    return (
      <AuthPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          navigate('/');
        }}
        setPage={() => navigate('/')}
      />
    );
  }

  return (
    <Routes>
      <Route
        element={
          <ProtectedLayout
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        }
      >
        {/* 메인 홈 */}
        <Route path="/" element={<HomePage currentUser={currentUser} />} />

        {/* 코드 분석 */}
        <Route path="/analysis/new" element={<CodeAnalysisPage currentUser={currentUser} />} />

        {/* 분석 결과 목록 및 프로젝트별 결과 (?project=...) */}
        <Route path="/analyses" element={<FindingResultPage currentUser={currentUser} />} />

        {/* 경로 파라미터 방식 지원 (/results/:projectId) */}
        <Route path="/results/:projectId" element={<FindingResultPage currentUser={currentUser} />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}