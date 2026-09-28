import { Search, Bell } from 'lucide-react';

export default function Header({ compact = false }) {
  return (
    <header className={'topbar ' + (compact ? 'compact' : '')}>
      <div>
        <h1>{compact ? 'payments-api' : '보안 워크스페이스'}</h1>
        <p>
          {compact
            ? 'src/routes/users.ts'
            : 'AI가 코드의 위험 신호를 추적하고 우선 순위를 제안합니다.'}
        </p>
      </div>

      {!compact && (
        <div className="global-search">
          <Search size={14} />
          <span>프로젝트, 파일, 취약점 검색</span>
        </div>
      )}

      <div className="top-actions">
        <button className="icon-btn">
          <Bell size={15} />
        </button>
        <span className="avatar"></span>
        <div className="user">
          <b>재훈</b>
          <small>Frontend / LLM</small>
        </div>
      </div>
    </header>
  );
}
