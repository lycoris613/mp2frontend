import { Search, Bell } from 'lucide-react';

/**
 * 상단 헤더 컴포넌트
 * 05 React 컴포넌트 설계서 표 3-1 준수
 *
 * @param {boolean} compact - 컴팩트 모드 여부
 * @param {string} title - 헤더 타이틀
 * @param {string} subtitle - 헤더 서브타이틀
 * @param {object} user - 사용자 프로필 정보
 */
export default function PageHeader({
  compact = false,
  title,
  subtitle,
  user = { name: '재훈', role: 'Frontend / LLM' },
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
        <button className="icon-btn" aria-label="알림">
          <Bell size={15} />
        </button>
        <span className="avatar"></span>
        <div className="user">
          <b>{user.name}</b>
          <small>{user.role}</small>
        </div>
      </div>
    </header>
  );
}
