import {
  Home,
  ScanSearch,
  FileSearch2,
  Search,
  Folder,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { PAGES } from '../../constants/navigation';

/**
 * 좌측 고정 사이드바 컴포넌트
 * 04 UI화면 설계서 2.1절 및 05 React 컴포넌트 설계서 표 3-1 준수
 *
 * @param {string} page - 현재 활성화된 페이지 ID
 * @param {function} setPage - 페이지 전환 함수
 * @param {Array} projects - 프로젝트 목록
 */
export default function Sidebar({ page, setPage, projects = [] }) {
  const navItem = (id, Icon, label) => (
    <button
      className={`nav-item ${page === id ? 'active' : ''}`}
      onClick={() => setPage(id)}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => setPage(PAGES.HOME)} style={{ cursor: 'pointer' }}>
        <span className="brand-mark"></span>
        <b>CodeGuard AI</b>
      </div>

      <nav>
        {navItem(PAGES.HOME, Home, '홈')}
        {navItem(PAGES.ANALYZE, ScanSearch, '코드 분석')}
        {navItem(PAGES.RESULT, FileSearch2, '분석 결과')}
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

      <button className="project active" onClick={() => setPage(PAGES.ANALYZE)}>
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

      <button className="add-project-btn" onClick={() => setPage(PAGES.ANALYZE)}>
        <span>+ 프로젝트 추가</span>
      </button>
    </aside>
  );
}
