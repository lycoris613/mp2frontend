import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  LogIn,
  LogOut,
  X,
  Folder,
  FileCode2,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { searchGlobalIndex } from '../../utils/globalSearchIndex';
import { clearSessionUser } from '../../services/authService';

/**
 * 상단 헤더 컴포넌트
 * - 로그인/로그아웃 상태에 따른 액션 버튼 및 사용자 프로필 동적 표시
 * - 상단 글로벌 통합 검색 기능 (프로젝트, 파일, 취약점 실시간 검색 및 이동)
 */
export default function PageHeader({
  compact = false,
  title,
  subtitle,
  currentUser = null,
  onLogin,
  onLogout,
  extraAction,
  showSearch = true,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const displayTitle =
    title || (compact ? 'payments-api' : '보안 워크스페이스');
  const displaySubtitle =
    subtitle ||
    (compact
      ? 'src/routes/users.ts'
      : 'AI가 코드의 위험 신호를 추적하고 우선 순위를 제안합니다.');

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'project' | 'file' | 'finding'
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // 검색 결과 계산
  const searchResults = searchGlobalIndex(searchQuery, activeCategory);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 글로벌 단축키 (Ctrl+K 또는 Cmd+K)로 검색창 포커스
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsDropdownOpen(true);
      } else if (e.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen]);

  // 검색어 변경 시 하이라이트 인덱스 초기화
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, activeCategory]);

  // 키보드 방향키 및 엔터 탐색
  const handleInputKeyDown = (e) => {
    if (!isDropdownOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsDropdownOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[highlightedIndex]) {
        handleSelectItem(searchResults[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      inputRef.current?.blur();
    }
  };

  // 검색 항목 선택 핸들러
  const handleSelectItem = (item) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    if (item.url) {
      navigate(item.url);
    }
  };

  // 로그인 핸들러: onLogin 콜백이 없어도 /login 경로로 안전하게 이동
  const handleLoginClick = () => {
    if (typeof onLogin === 'function') {
      onLogin();
    } else {
      navigate('/login', {
        state: { from: location.pathname + location.search },
      });
    }
  };

  // 로그아웃 핸들러: onLogout 콜백이 없어도 세션 초기화 및 홈 리다이렉트
  const handleLogoutClick = () => {
    if (typeof onLogout === 'function') {
      onLogout();
    } else {
      clearSessionUser();
      window.location.reload();
    }
  };

  // 카테고리별 아이콘 및 뱃지 렌더링
  const renderItemIcon = (category) => {
    if (category === 'project') {
      return <Folder size={14} color="#60a5fa" />;
    }
    if (category === 'file') {
      return <FileCode2 size={14} color="#c084fc" />;
    }
    return <ShieldAlert size={14} color="#f87171" />;
  };

  const renderBadge = (item) => {
    if (item.category === 'project') {
      return <span className="global-search-badge badge-project">프로젝트</span>;
    }
    if (item.category === 'file') {
      return <span className="global-search-badge badge-file">파일</span>;
    }
    const isCritical = item.severity === 'CRITICAL';
    return (
      <span
        className={`global-search-badge ${
          isCritical ? 'badge-finding' : 'badge-finding-high'
        }`}
      >
        {item.severity || '취약점'}
      </span>
    );
  };

  return (
    <header className={`topbar ${compact ? 'compact' : ''}`}>
      <div>
        <h1>{displayTitle}</h1>
        <p>{displaySubtitle}</p>
      </div>

      {/* 🔹 글로벌 통합 검색 기능 (프로젝트, 파일, 취약점 검색) */}
      {showSearch && (
        <div className="global-search-container" ref={containerRef}>
          <div className="global-search">
            <Search size={14} style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="프로젝트, 파일, 취약점 검색"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isDropdownOpen) setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={handleInputKeyDown}
            />
            {searchQuery ? (
              <button
                type="button"
                className="global-search-clear"
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                title="검색어 지우기"
              >
                <X size={12} />
              </button>
            ) : (
              <span className="global-search-kbd">Ctrl K</span>
            )}
          </div>

          {/* 검색 결과 드롭다운 레이어 */}
          {isDropdownOpen && (
            <div className="global-search-dropdown">
              <div className="global-search-tabs">
                <button
                  type="button"
                  className={`global-search-tab ${
                    activeCategory === 'all' ? 'active' : ''
                  }`}
                  onClick={() => setActiveCategory('all')}
                >
                  전체
                </button>
                <button
                  type="button"
                  className={`global-search-tab ${
                    activeCategory === 'project' ? 'active' : ''
                  }`}
                  onClick={() => setActiveCategory('project')}
                >
                  프로젝트
                </button>
                <button
                  type="button"
                  className={`global-search-tab ${
                    activeCategory === 'file' ? 'active' : ''
                  }`}
                  onClick={() => setActiveCategory('file')}
                >
                  파일
                </button>
                <button
                  type="button"
                  className={`global-search-tab ${
                    activeCategory === 'finding' ? 'active' : ''
                  }`}
                  onClick={() => setActiveCategory('finding')}
                >
                  취약점
                </button>
              </div>

              <div className="global-search-results">
                {searchResults.length > 0 ? (
                  searchResults.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`global-search-item ${
                        highlightedIndex === idx ? 'highlighted' : ''
                      }`}
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <div className="global-search-item-icon">
                        {renderItemIcon(item.category)}
                      </div>
                      <div className="global-search-item-info">
                        <div className="global-search-item-title-row">
                          <span className="global-search-item-title">
                            {item.title}
                          </span>
                          {renderBadge(item)}
                        </div>
                        <span className="global-search-item-sub">
                          {item.subtitle}
                        </span>
                      </div>
                      <ArrowRight
                        size={12}
                        color="var(--text-3)"
                        style={{ marginLeft: 'auto', flexShrink: 0 }}
                      />
                    </button>
                  ))
                ) : (
                  <div className="global-search-empty">
                    <span>'{searchQuery}'에 대한 검색 결과가 없습니다.</span>
                  </div>
                )}
              </div>

              <div className="global-search-footer">
                <span>↑↓ 이동 · Enter 선택 · ESC 닫기</span>
                <span>총 {searchResults.length}개 결과</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🔹 상단 우측 액션 및 로그인 버튼 */}
      <div className="top-actions">
        {extraAction}

        {/* 로그인 여부에 따른 상태 분기 */}
        {currentUser ? (
          <>
            <div className="user">
              <b>{currentUser.name}</b>
              <small>{currentUser.role}</small>
            </div>
            <button
              type="button"
              className="logout-text-btn"
              onClick={handleLogoutClick}
              title="로그아웃"
            >
              <LogOut size={13} />
              <span>로그아웃</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            className="dark-btn header-login-btn"
            onClick={handleLoginClick}
            title="로그인 화면으로 이동"
          >
            <LogIn size={13} />
            <span>로그인</span>
          </button>
        )}
      </div>
    </header>
  );
}
