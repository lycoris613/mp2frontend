import { useState } from 'react';
import { ArrowLeft, UserPlus, LogIn } from 'lucide-react';
import { PAGES } from '../../constants/navigation';

/**
 * [SCR-004] 로그인 및 회원가입 디자인 페이지
 * 04 UI화면 설계서 2.1절 준수 (사이드바 없는 중앙 단일 카드 레이아웃)
 *
 * @param {function} onLoginSuccess - 로그인 콜백
 * @param {function} setPage - 페이지 전환 콜백
 */
export default function AuthPage({ onLoginSuccess, setPage }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'

  // 로그인 폼 상태 (디자인용)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 회원가입 폼 상태 (디자인용 - 직책 필드 제거됨)
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // 로그인 버튼 클릭 시
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const user = {
      name: loginEmail ? loginEmail.split('@')[0] : '지웅',
      role: 'Frontend / LLM',
    };
    onLoginSuccess?.(user);
    setPage(PAGES.HOME);
  };

  // 회원가입 버튼 클릭 시
  const handleSignupSubmit = (e) => {
    e.preventDefault();
    const user = {
      name: signupName || '신규회원',
      role: 'Frontend / LLM',
    };
    onLoginSuccess?.(user);
    setPage(PAGES.HOME);
  };

  // 데모 계정 간편 입력
  const fillDemoAccount = (email, pw) => {
    setLoginEmail(email);
    setLoginPassword(pw);
  };

  return (
    <div className="auth-container">
      {/* 홈으로 돌아가기 버튼 */}
      <button className="auth-back-btn" onClick={() => setPage(PAGES.HOME)}>
        <ArrowLeft size={14} />
        <span>홈 화면으로 돌아가기</span>
      </button>

      <div className="auth-card">
        {/* 상단 브랜딩 */}
        <div className="auth-brand">
          <span className="brand-mark large"></span>
          <h2>CodeGuard AI</h2>
          <p>규칙 기반 보안 분석 & LLM 코드 리뷰 플랫폼</p>
        </div>

        {/* 탭 전환 (로그인 / 회원가입) */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            <LogIn size={14} />
            <span>로그인</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            <UserPlus size={14} />
            <span>회원가입</span>
          </button>
        </div>

        {/* 1. 로그인 폼 디자인 */}
        {mode === 'login' && (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label>이메일 주소</label>
              <input
                type="email"
                className="text-input"
                placeholder="example@codeguard.ai"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>비밀번호</label>
              <input
                type="password"
                className="text-input"
                placeholder="비밀번호 입력"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="dark-btn auth-submit-btn">
              로그인
            </button>

            {/* 빠른 테스트용 계정 안내 */}
            <div className="demo-accounts-box">
              <span className="demo-label">빠른 테스트용 계정 선택:</span>
              <div className="demo-chips">
                <button
                  type="button"
                  className="demo-chip"
                  onClick={() => fillDemoAccount('jiwoong@codeguard.ai', 'password123')}
                >
                  지웅 (Frontend)
                </button>
                <button
                  type="button"
                  className="demo-chip"
                  onClick={() => fillDemoAccount('jaehoon@codeguard.ai', 'password123')}
                >
                  재훈 (Security)
                </button>
              </div>
            </div>

            <div className="auth-footer-link">
              <span>아직 계정이 없으신가요?</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => setMode('signup')}
              >
                회원가입하기
              </button>
            </div>
          </form>
        )}

        {/* 2. 회원가입 폼 디자인 (직책 선택 제거됨) */}
        {mode === 'signup' && (
          <form className="auth-form" onSubmit={handleSignupSubmit}>
            <div className="form-group">
              <label>
                이름 <span className="req">*</span>
              </label>
              <input
                type="text"
                className="text-input"
                placeholder="이름 입력 (예: 홍길동)"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>
                이메일 주소 <span className="req">*</span>
              </label>
              <input
                type="email"
                className="text-input"
                placeholder="user@codeguard.ai"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>
                비밀번호 <span className="req">*</span>
              </label>
              <input
                type="password"
                className="text-input"
                placeholder="비밀번호 입력"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>
                비밀번호 확인 <span className="req">*</span>
              </label>
              <input
                type="password"
                className="text-input"
                placeholder="비밀번호 재입력"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="dark-btn auth-submit-btn">
              회원가입 완료
            </button>

            <div className="auth-footer-link">
              <span>이미 등록된 계정이 있으신가요?</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => setMode('login')}
              >
                로그인 화면으로
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
