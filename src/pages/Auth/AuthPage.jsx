import { useState } from 'react';
import { ArrowLeft, UserPlus, LogIn, AlertCircle, CheckCircle } from 'lucide-react';
import { PAGES } from '../../constants/navigation';
import { authenticateUser, registerUser } from '../../services/authService';

/**
 * [SCR-004] 로그인 및 회원가입 화면
 * 04 UI화면 설계서 2.1절 준수 (사이드바 없는 중앙 단일 카드 레이아웃)
 *
 * @param {function} onLoginSuccess - 로그인 성공 콜백(sessionUser 전달)
 * @param {function} setPage - 페이지 전환 콜백 (router 미사용 환경 대비, 선택)
 */
export default function AuthPage({ onLoginSuccess, setPage }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [alert, setAlert] = useState(null); // { type: 'error'|'success', message }

  // 로그인 폼 상태
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 회원가입 폼 상태 (직책 필드는 UI에서 제거, 기본값으로 저장)
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setAlert(null);
  };

  // 로그인 버튼 클릭 시 — authService로 실제 자격 증명 검증
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    try {
      const sessionUser = authenticateUser(loginEmail, loginPassword);
      setAlert(null);
      onLoginSuccess?.(sessionUser);
      setPage?.(PAGES.HOME);
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  // 회원가입 버튼 클릭 시 — 신규 등록 후 로그인 탭으로 전환 (04 §3.5.4 준수)
  const handleSignupSubmit = (e) => {
    e.preventDefault();
    if (signupPassword !== signupConfirmPassword) {
      setAlert({ type: 'error', message: '비밀번호가 일치하지 않습니다.' });
      return;
    }
    try {
      registerUser({ name: signupName, email: signupEmail, password: signupPassword });
      setLoginEmail(signupEmail);
      setLoginPassword('');
      setMode('login');
      setAlert({ type: 'success', message: '회원가입이 완료되었습니다. 로그인해 주세요.' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  // 데모 계정 간편 입력
  const fillDemoAccount = (email, pw) => {
    setLoginEmail(email);
    setLoginPassword(pw);
  };

  return (
    <div className="auth-container">
      {/* 홈으로 돌아가기 버튼 */}
      <button className="auth-back-btn" onClick={() => setPage?.(PAGES.HOME)}>
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
            onClick={() => switchMode('login')}
          >
            <LogIn size={14} />
            <span>로그인</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            <UserPlus size={14} />
            <span>회원가입</span>
          </button>
        </div>

        {alert && (
          <div className={`auth-alert ${alert.type}`}>
            {alert.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
            <span>{alert.message}</span>
          </div>
        )}

        {/* 1. 로그인 폼 */}
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
                  onClick={() => fillDemoAccount('seoyeon@codeguard.ai', 'password123')}
                >
                  서연 (Backend)
                </button>
              </div>
            </div>

            <div className="auth-footer-link">
              <span>아직 계정이 없으신가요?</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => switchMode('signup')}
              >
                회원가입하기
              </button>
            </div>
          </form>
        )}

        {/* 2. 회원가입 폼 (직책 선택 없음 — 기본값으로 저장) */}
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
                onClick={() => switchMode('login')}
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
