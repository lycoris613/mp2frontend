import {
  Home,
  ScanSearch,
  FileSearch2,
  Search,
  Folder,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function Sidebar({ page, setPage }) {
  const item = (id, Icon, label) => (
    <button
      className={'nav-item ' + (page === id ? 'active' : '')}
      onClick={() => setPage(id)}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark"></span>
        <b>CodeGuard AI</b>
      </div>

      <nav>
        {item('home', Home, '홈')}
        {item('analyze', ScanSearch, '코드 분석')}
        {item('result', FileSearch2, '분석 결과')}
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

      <button className="project active">
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

      <div className="archive">
        <ShieldCheck size={13} />
        <span>프로젝트 보기</span>
      </div>
    </aside>
  );
}
