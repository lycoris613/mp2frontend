import { Search, Bell, LogIn, LogOut } from 'lucide-react';

/**
 * 상단 헤더 컴포넌트
 * 로그인/로그아웃 상태에 따른 액션 버튼 및 사용자 프로필 동적 표시
 *
 * @param {boolean} compact - 컴팩트 모드 여부
 * @param {string} title - 헤더 타이틀
 * @param {string} subtitle - 헤더 서브타이틀
 * @param {object|null} currentUser - 로그인된 사용자 객체 (null이면 비로그인 상태)
 * @param {function} onLogin - 로그인 페이지 이동 핸들러
 * @param {function} onLogout - 로그아웃 핸들러
 * @param {React.ReactNode} extraAction - 우측 추가 버튼(보고서 내보내기 등)
 */
export default function PageHeader({
  compact = false,
  title,
  subtitle,
  currentUser = null,
  onLogin,
  onLogout,
  extraAction,
}) {
  const displayTitle =
    title || (compact ? 'payments-api' : '보안 워크스페이스');
  const displaySubtitle =
    subtitle ||
    (compact
      ? 'src/routes/users.ts'
      : 'AI가 코드의 위험 신호를 추적하고 우선 순위를 제안합니다.');

  return (
    <header className={`topbar ${compact ? 'compact' : ''}`}>
      <div>
        <h1>{displayTitle}</h1>
        <p>{displaySubtitle}</p>
      </div>

      {!compact && (
        <div className="global-search">
          <Search size={14} />
          <span>프로젝트, 파일, 취약점 검색</span>
        </div>
      )}

      <div className="top-actions">
        {extraAction}

        {/* 로그인 여부에 따른 상태 분기 */}
        {currentUser ? (
          <>
            <button className="icon-btn" aria-label="알림">
              <Bell size={15} />
            </button>
            <span className="avatar"></span>
            <div className="user">
              <b>{currentUser.name}</b>
              <small>{currentUser.role}</small>
            </div>
            <button
              className="logout-text-btn"
              onClick={onLogout}
              title="로그아웃"
            >
              <LogOut size={13} />
              <span>로그아웃</span>
            </button>
          </>
        ) : (
          <button className="dark-btn header-login-btn" onClick={onLogin}>
            <LogIn size={13} />
            <span>로그인</span>
          </button>
        )}
      </div>
    </header>
  );
}
