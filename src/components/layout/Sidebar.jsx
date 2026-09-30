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
} from 'lucide-react';
import { PAGES } from '../../constants/navigation';

export default function Sidebar({ currentUser = null, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // URL에서 선택된 project 쿼리 파라미터 추출 (?project=payments-api)
  const queryParams = new URLSearchParams(location.search);
  const currentProject = queryParams.get('project');
  const currentPath = location.pathname;

  // 상단 일반 메뉴 (홈, 코드 분석, 분석 결과)
  const navItem = (path, Icon, label) => {
    // 프로젝트가 선택되지 않았고, 경로가 일치할 때만 active
    const isActive = currentPath === path && !currentProject;

    return (
      <button
        type="button"
        className={`nav-item ${isActive ? 'active' : ''}`}
        onClick={() => navigate(path)}
      >
        <Icon size={15} />
        <span>{label}</span>
      </button>
    );
  };

  // 프로젝트 클릭 핸들러 (코드 분석 화면으로 이동)
  const handleProjectClick = (projectName) => {
    navigate(`/analysis/new?project=${projectName}`);
  };

  // 프로젝트 항목 렌더링 (선택 시 초록 점 + active, 미선택 시 폴더 아이콘)
  const renderProjectItem = (projectName) => {
    const isSelected = currentProject === projectName;

    return (
      <button
        key={projectName}
        type="button"
        className={`project ${isSelected ? 'active' : ''}`}
        onClick={() => handleProjectClick(projectName)}
      >
        {isSelected ? (
          <span className="dot green"></span>
        ) : (
          <Folder size={13} />
        )}
        <span>{projectName}</span>
      </button>
    );
  };

  return (
    <aside className="sidebar">
      <div
        className="brand"
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer' }}
      >
        <span className="brand-mark"></span>
        <b>CodeGuard AI</b>
      </div>

      <nav>
        {navItem('/', Home, '홈')}
        {navItem('/analysis/new', ScanSearch, '코드 분석')}
        {navItem('/analyses', FileSearch2, '분석 결과')}
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

      {/* 🔹 즐겨찾기 프로젝트 목록 */}
      {renderProjectItem('payments-api')}
      {renderProjectItem('auth-service')}
      {renderProjectItem('admin-console')}

      <div className="section-title lower">
        <span>보관함</span>
        <span>3</span>
      </div>

      <button
        type="button"
        className="add-project-btn"
        onClick={() => navigate('/analysis/new')}
      >
        <span>+ 프로젝트 추가</span>
      </button>

      {/* 사이드바 하단 사용자 / 로그인 바 */}
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
              type="button"
              className="sidebar-logout-btn"
              onClick={onLogout}
              title="로그아웃"
            >
              <LogOut size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="sidebar-login-btn"
            onClick={() => navigate('/login')}
          >
            <LogIn size={13} />
            <span>로그인하기</span>
          </button>
        )}
      </div>
    </aside>
  );
}