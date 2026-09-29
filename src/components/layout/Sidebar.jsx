import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  ScanSearch,
  FileSearch2,
  Search,
  Folder,
  ChevronRight,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';
import { PAGES } from '../../constants/navigation';

/**
 * 좌측 고정 사이드바 컴포넌트
 * 로그인/로그아웃 상태 및 사용자 정보 연동
 */
export default function Sidebar({
  page,
  setPage,
  currentUser = null,
  onLogout,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // 기존 setPage와 react-router-dom의 navigate를 모두 지원하는 공통 클릭 핸들러
  const handleNavigate = (pageId, path) => {
    if (setPage) setPage(pageId);
    if (path) navigate(path);
  };

  const navItem = (id, path, Icon, label) => (
    <button
      className={`nav-item ${page === id || location.pathname === path ? 'active' : ''}`}
      onClick={() => handleNavigate(id, path)}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="sidebar">
      <div
        className="brand"
        onClick={() => handleNavigate(PAGES.HOME, '/')}
        style={{ cursor: 'pointer' }}
      >
        <span className="brand-mark"></span>
        <b>CodeGuard AI</b>
      </div>

      <nav>
        {navItem(PAGES.HOME, '/', Home, '홈')}
        {navItem(PAGES.ANALYZE, '/analysis/new', ScanSearch, '코드 분석')}
        {navItem(PAGES.RESULT, '/analyses', FileSearch2, '분석 결과')}
      </nav>

      <div className="side-search">
        <Search size={13} />
        <span>프로젝트 검색</span>
      </div>

      <div className="chips">
        <span>전체</span>
        <span>최근</span>
        <span>즐겨찾기</span>
      </div>

      <div className="section-title">
        <span>즐겨찾기</span>
        <ChevronRight size={12} />
      </div>

      <button
        className="project active"
        onClick={() => handleNavigate(PAGES.ANALYZE, '/analysis/new')}
      >
        <Folder size={13} />
        <span>payments-api</span>
      </button>
      <button className="project">
        <span className="dot green"></span>
        <span>auth-service</span>
      </button>
      <button className="project">
        <span className="dot green"></span>
        <span>admin-console</span>
      </button>

      <div className="section-title lower">
        <span>보관함</span>
        <span>3</span>
      </div>

      <button
        className="add-project-btn"
        onClick={() => handleNavigate(PAGES.ANALYZE, '/analysis/new')}
      >
        <span>+ 프로젝트 추가</span>
      </button>

      {/* 사이드바 하단 로그인/사용자 상태 바 */}
      <div className="sidebar-auth-bottom">
        {currentUser ? (
          <div className="sidebar-user-card">
            <div className="user-info">
              <span className="avatar-dot"></span>
              <div>
                <b>{currentUser.name}</b>
                <small>{currentUser.role}</small>
              </div>
            </div>
            <button
              className="sidebar-logout-btn"
              onClick={onLogout}
              title="로그아웃"
            >
              <LogOut size={12} />
            </button>
          </div>
        ) : (
          <button
            className="sidebar-login-btn"
            onClick={() => handleNavigate(PAGES.LOGIN, '/login')}
          >
            <LogIn size={13} />
            <span>로그인하기</span>
          </button>
        )}
      </div>
    </aside>
  );
}