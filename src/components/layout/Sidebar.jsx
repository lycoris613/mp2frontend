import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  ScanSearch,
  FileSearch2,
  Search,
  Folder,
  ChevronRight,
  ChevronDown,
  LogIn,
  LogOut,
  Star,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { normalizeProjectId } from '../../data/findingData';
import {
  getAllProjects,
  initCustomProjectsInMemory,
  renameProject,
  deleteProject,
} from '../../services/projectService';
import AddProjectModal from '../common/AddProjectModal';

initCustomProjectsInMemory();

const FAVORITES_STORAGE_KEY = 'codeguard_favorite_projects';
const DEFAULT_FAVORITES = ['payments-api'];

export default function Sidebar({ currentUser = null, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const currentPath = location.pathname;

  // 1) 페이지 유형 판별
  const isHomePage = currentPath === '/';
  const isAnalysisPage = currentPath.startsWith('/analysis');
  const isResultListPage = currentPath === '/analyses/list';
  const isFindingResultPage =
    (currentPath.startsWith('/analyses') && currentPath !== '/analyses/list') ||
    currentPath.startsWith('/results');
  const isResultPage = isResultListPage || isFindingResultPage;

  // 2) 프로젝트 식별: URL 쿼리 (?project= / ?projectId=) 또는 경로 (/results/:projectId)
  const rawProject =
    queryParams.get('project') ||
    queryParams.get('projectId') ||
    (currentPath.startsWith('/results/')
      ? currentPath.split('/results/')[1]?.split('/')[0]
      : null);

  let activeProject = null;
  if (isAnalysisPage || isFindingResultPage) {
    activeProject = normalizeProjectId(rawProject || 'payments-api');
  } else if (rawProject) {
    activeProject = normalizeProjectId(rawProject);
  }

  // 3) 프로젝트 목록 상태 (커스텀 프로젝트 동적 반영)
  const [projectsList, setProjectsList] = useState(() => getAllProjects());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // 4) 검색 및 필터 상태
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeChip, setActiveChip] = useState('all'); // 'all' | 'recent' | 'favorites'
  const [isFavOpen, setIsFavOpen] = useState(true);
  const [isArchiveOpen, setIsArchiveOpen] = useState(true);

  // 5) 즐겨찾기 프로젝트 목록 상태 (localStorage 연동)
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse favorites from localStorage', e);
    }
    return DEFAULT_FAVORITES;
  });

  // 호버 중인 별 아이콘 프로젝트 ID
  const [hoveredStarId, setHoveredStarId] = useState(null);

  // 6) 컨텍스트 메뉴 및 모달 상태 (이름 수정, 삭제)
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    project: null,
  });

  const [renameModal, setRenameModal] = useState({
    open: false,
    project: null,
  });
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const renameInputRef = useRef(null);

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    project: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // 컨텍스트 메뉴 바깥 클릭 / 스크롤 시 닫기
  useEffect(() => {
    const handleCloseMenu = () => {
      if (contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('scroll', handleCloseMenu, true);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('scroll', handleCloseMenu, true);
    };
  }, [contextMenu.visible]);

  // 이름 수정 모달 포커스
  useEffect(() => {
    if (renameModal.open) {
      setTimeout(() => renameInputRef.current?.focus(), 80);
    }
  }, [renameModal.open]);

  // 다른 탭이나 창에서 변경 시 동기화
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (saved) {
          setFavorites(JSON.parse(saved));
        }
      } catch (e) {
        console.warn(e);
      }
    };
    const handleProjectsChanged = () => {
      setProjectsList(getAllProjects());
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('codeguard_favorites_changed', handleStorageChange);
    window.addEventListener('codeguard_projects_changed', handleProjectsChanged);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('codeguard_favorites_changed', handleStorageChange);
      window.removeEventListener('codeguard_projects_changed', handleProjectsChanged);
    };
  }, []);

  // 즐겨찾기 토글 핸들러
  const handleToggleFavorite = (projectId) => {
    const normId = normalizeProjectId(projectId);
    setFavorites((prev) => {
      const next = prev.includes(normId)
        ? prev.filter((id) => id !== normId)
        : [...prev, normId];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event('codeguard_favorites_changed'));
      } catch (e) {
        console.warn('Failed to save favorites to localStorage', e);
      }
      return next;
    });
  };

  // 프로젝트 우클릭 컨텍스트 메뉴 열기 핸들러
  const handleProjectContextMenu = (e, project) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 160;
    const menuHeight = 90;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setContextMenu({
      visible: true,
      x,
      y,
      project,
    });
  };

  // 이름 수정 모달 열기
  const handleOpenRename = (project) => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
    setRenameModal({ open: true, project });
    setRenameValue(project.name);
    setRenameError('');
  };

  // 삭제 확인 모달 열기
  const handleOpenDelete = (project) => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
    setDeleteModal({ open: true, project });
  };

  // 이름 수정 제출
  const submitRename = async (e) => {
    if (e) e.preventDefault();
    setRenameError('');
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError('프로젝트 이름을 입력해주세요.');
      return;
    }
    if (!renameModal.project) return;

    setIsRenaming(true);
    try {
      const result = await renameProject(renameModal.project.id, trimmed);
      setRenameModal({ open: false, project: null });

      // 현재 선택된 프로젝트 이름이 변경되었다면 새 프로젝트 ID로 라우트 이동
      if (activeProject === renameModal.project.id) {
        if (isFindingResultPage || isResultListPage) {
          navigate(`/analyses?project=${result.newId}`);
        } else {
          navigate(`/analysis?project=${result.newId}`);
        }
      }
    } catch (err) {
      setRenameError(err.message || '이름 수정에 실패했습니다.');
    } finally {
      setIsRenaming(false);
    }
  };

  // 프로젝트 삭제 제출
  const submitDelete = async () => {
    if (!deleteModal.project) return;
    const targetId = deleteModal.project.id;
    setIsDeleting(true);
    try {
      await deleteProject(targetId);
      setDeleteModal({ open: false, project: null });

      // 현재 선택된 프로젝트를 삭제했다면 남아있는 프로젝트 또는 홈으로 이동
      if (activeProject === targetId) {
        const remaining = getAllProjects();
        if (remaining.length > 0) {
          const nextId = remaining[0].id;
          if (isFindingResultPage || isResultListPage) {
            navigate(`/analyses?project=${nextId}`);
          } else {
            navigate(`/analysis?project=${nextId}`);
          }
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      console.error('프로젝트 삭제 실패:', err);
      alert(err.message || '프로젝트 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 상단 일반 메뉴 (홈, 코드 분석, 분석 결과)
  const navItem = (type, defaultPath, Icon, label) => {
    let isActive = false;
    let targetPath = defaultPath;

    if (type === 'home') {
      isActive = isHomePage;
      targetPath = '/';
    } else if (type === 'analysis') {
      isActive = isAnalysisPage;
      targetPath = activeProject
        ? `/analysis?project=${activeProject}`
        : '/analysis';
    } else if (type === 'result') {
      isActive = isResultPage;
      targetPath = '/analyses/list';
    }

    return (
      <button
        type="button"
        className={`nav-item ${isActive ? 'active' : ''}`}
        onClick={() => navigate(targetPath)}
      >
        <Icon size={15} />
        <span>{label}</span>
      </button>
    );
  };

  // 프로젝트 클릭 핸들러
  const handleProjectClick = (projectName) => {
    const normId = normalizeProjectId(projectName);
    if (isFindingResultPage || isResultListPage) {
      navigate(`/analyses?project=${normId}`);
    } else {
      navigate(`/analysis?project=${normId}`);
    }
  };

  // 프로젝트 목록 필터링
  const filteredProjects = projectsList.filter((p) => {
    if (!searchKeyword.trim()) return true;
    return p.name.toLowerCase().includes(searchKeyword.trim().toLowerCase());
  });

  // 즐겨찾기된 프로젝트 목록 & 보통 프로젝트(보관함) 목록 분리
  const favoriteProjects = filteredProjects.filter((p) => favorites.includes(p.id));
  const archiveProjects = filteredProjects.filter((p) => !favorites.includes(p.id));

  // 프로젝트 항목 렌더링 (HTML 표준 구조 준수: project-row 컨테이너 + 독립적인 2개의 button)
  const renderProjectItem = (project, isFav) => {
    const projectName = typeof project === 'string' ? project : project.name;
    const normId = normalizeProjectId(typeof project === 'string' ? project : project.id);
    const projObj =
      typeof project === 'object' && project !== null
        ? project
        : { id: normId, name: projectName };

    const isSelected = activeProject === normId;
    const isHovered = hoveredStarId === normId;

    // 사용자 요구사항 규칙:
    // 즐겨찾기(isFav): 기본은 노란색 찬 별, 마우스 호버 시 반대(빈 별)
    // 일반(!isFav, 보관함): 기본은 테두리만 있는 빈 별, 마우스 호버 시 반대(노란색 찬 별)
    const showFilled = isFav ? !isHovered : isHovered;

    return (
      <div
        key={normId}
        className={`project-row ${isSelected ? 'active' : ''}`}
        onContextMenu={(e) => handleProjectContextMenu(e, projObj)}
      >
        <button
          type="button"
          className="project-main-btn"
          onClick={() => handleProjectClick(normId)}
          title={`${projectName} (우클릭: 이름 수정 / 삭제)`}
        >
          {isSelected ? (
            <span className="dot green"></span>
          ) : (
            <Folder size={13} style={{ flexShrink: 0 }} />
          )}
          <span className="project-name-text">{projectName}</span>
        </button>

        <button
          type="button"
          className="project-star-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleToggleFavorite(normId);
          }}
          onMouseEnter={() => setHoveredStarId(normId)}
          onMouseLeave={() => setHoveredStarId(null)}
          title={isFav ? `${projectName} 즐겨찾기 해제` : `${projectName} 즐겨찾기 추가`}
          aria-label={isFav ? `${projectName} 즐겨찾기 해제` : `${projectName} 즐겨찾기 추가`}
        >
          <Star
            size={14}
            fill={showFilled ? '#FFB800' : 'none'}
            color={showFilled ? '#FFB800' : 'var(--text-3)'}
            strokeWidth={showFilled ? 1.5 : 1.8}
            style={{
              pointerEvents: 'none',
              transition: 'all 0.15s ease',
            }}
          />
        </button>
      </div>
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
        {navItem('home', '/', Home, '홈')}
        {navItem('analysis', '/analysis/new', ScanSearch, '코드 분석')}
        {navItem('result', '/analyses', FileSearch2, '분석 결과')}
      </nav>

      {/* 🔹 프로젝트 검색 기능 */}
      <div className="side-search">
        <Search size={13} style={{ flexShrink: 0 }} />
        <input
          type="text"
          placeholder="프로젝트 검색"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
        {searchKeyword && (
          <button
            type="button"
            className="side-search-clear"
            onClick={() => setSearchKeyword('')}
            title="검색어 지우기"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* 🔹 필터 칩 */}
      <div className="chips">
        <button
          type="button"
          className={activeChip === 'all' ? 'active' : ''}
          onClick={() => setActiveChip('all')}
        >
          전체
        </button>
        <button
          type="button"
          className={activeChip === 'recent' ? 'active' : ''}
          onClick={() => setActiveChip('recent')}
        >
          최근
        </button>
        <button
          type="button"
          className={activeChip === 'favorites' ? 'active' : ''}
          onClick={() => setActiveChip('favorites')}
        >
          즐겨찾기
        </button>
      </div>

      {/* 🔹 즐겨찾기 섹션 (즐겨찾기된 프로젝트는 즐겨찾기로 이동) */}
      {(activeChip === 'all' || activeChip === 'favorites' || activeChip === 'recent') && (
        <>
          <div className="section-title">
            <button
              type="button"
              className="section-title-left"
              onClick={() => setIsFavOpen((v) => !v)}
              title={isFavOpen ? '접기' : '펼치기'}
            >
              <span>즐겨찾기</span>
              {isFavOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>
            <span className="section-count-badge">{favoriteProjects.length}</span>
          </div>

          {isFavOpen && (
            <div className="project-group">
              {favoriteProjects.length > 0 ? (
                favoriteProjects.map((p) => renderProjectItem(p, true))
              ) : (
                <div className="sidebar-empty-hint">
                  {searchKeyword ? '검색된 즐겨찾기가 없습니다' : '즐겨찾기한 프로젝트가 없습니다'}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 🔹 보관함 섹션 (보통 프로젝트는 보관함에 위치) */}
      {activeChip !== 'favorites' && (
        <>
          <div className="section-title lower">
            <button
              type="button"
              className="section-title-left"
              onClick={() => setIsArchiveOpen((v) => !v)}
              title={isArchiveOpen ? '접기' : '펼치기'}
            >
              <span>보관함</span>
              {isArchiveOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>
            <span className="section-count-badge">{archiveProjects.length}</span>
          </div>

          {isArchiveOpen && (
            <div className="project-group">
              {archiveProjects.length > 0 ? (
                archiveProjects.map((p) => renderProjectItem(p, false))
              ) : (
                <div className="sidebar-empty-hint">
                  {searchKeyword ? '검색된 보관함 프로젝트가 없습니다' : '보관함이 비어있습니다'}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <button
        type="button"
        className="add-project-btn"
        onClick={() => setIsAddModalOpen(true)}
        title="새로운 빈 프로젝트 추가"
      >
        <span>+ 프로젝트 추가</span>
      </button>

      {/* 새 빈 프로젝트 추가 모달 */}
      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProjectCreated={(newProj) => {
          setProjectsList(getAllProjects());
          navigate(`/analysis?project=${newProj.id}`);
        }}
      />

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

      {/* 🔹 프로젝트 우클릭 컨텍스트 메뉴 */}
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: '#131722',
            border: '1px solid #2c364c',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.1)',
            padding: '4px',
            zIndex: 10001,
            minWidth: '150px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 상단 프로젝트 이름 헤더 */}
          <div
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#94a3b8',
              borderBottom: '1px solid #1e2636',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {contextMenu.project?.name}
          </div>

          {/* 이름 수정 버튼 */}
          <button
            type="button"
            onClick={() => handleOpenRename(contextMenu.project)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 10px',
              background: 'transparent',
              border: 'none',
              color: '#f1f5f9',
              cursor: 'pointer',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 500,
              textAlign: 'left',
              transition: 'background 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#222b3d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Edit2 size={13} color="#38bdf8" />
            <span>이름 수정</span>
          </button>

          {/* 프로젝트 삭제 버튼 */}
          <button
            type="button"
            onClick={() => handleOpenDelete(contextMenu.project)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 10px',
              background: 'transparent',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 500,
              textAlign: 'left',
              transition: 'background 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Trash2 size={13} color="#f87171" />
            <span>프로젝트 삭제</span>
          </button>
        </div>
      )}

      {/* 🔹 프로젝트 이름 수정 모달 */}
      {renameModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10002,
            padding: '20px',
          }}
          onClick={() => setRenameModal({ open: false, project: null })}
        >
          <div
            style={{
              background: 'var(--bg-1, #12161f)',
              border: '1px solid var(--border-strong, #2a3447)',
              borderRadius: '12px',
              width: '420px',
              maxWidth: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              color: 'var(--text-1, #f8fafc)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border, #1e2636)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-2, #181f2c)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                  }}
                >
                  <Edit2 size={16} color="#38bdf8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
                    프로젝트 이름 수정
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRenameModal({ open: false, project: null })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-3, #94a3b8)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* 모달 본문 */}
            <form onSubmit={submitRename} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'var(--text-2, #cbd5e1)',
                  }}
                >
                  새 프로젝트 이름
                </label>
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => {
                    setRenameValue(e.target.value);
                    if (renameError) setRenameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setRenameModal({ open: false, project: null });
                  }}
                  placeholder="예: new-service-api"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--bg-3, #1e2638)',
                    border: renameError
                      ? '1px solid #ef4444'
                      : '1px solid var(--border-strong, #333d4e)',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {renameError && (
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: '12px',
                      color: '#f87171',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {renameError}
                  </p>
                )}
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: '11px',
                    color: 'var(--text-3, #94a3b8)',
                  }}
                >
                  영문 소문자, 숫자, 하이픈(-) 및 밑줄(_)을 권장합니다.
                </p>
              </div>

              {/* 하단 버튼 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '20px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setRenameModal({ open: false, project: null })}
                  disabled={isRenaming}
                  style={{
                    padding: '7px 14px',
                    background: 'transparent',
                    border: '1px solid var(--border-strong, #333d4e)',
                    borderRadius: '6px',
                    color: 'var(--text-2, #cbd5e1)',
                    fontSize: '13px',
                    cursor: isRenaming ? 'not-allowed' : 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isRenaming || !renameValue.trim()}
                  style={{
                    padding: '7px 16px',
                    background: renameValue.trim() ? '#0284c7' : '#1e293b',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: renameValue.trim() && !isRenaming ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isRenaming ? '변경 중...' : '이름 변경'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔹 프로젝트 삭제 확인 모달 */}
      {deleteModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10002,
            padding: '20px',
          }}
          onClick={() => !isDeleting && setDeleteModal({ open: false, project: null })}
        >
          <div
            style={{
              background: 'var(--bg-1, #12161f)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              width: '420px',
              maxWidth: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              color: 'var(--text-1, #f8fafc)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border, #1e2636)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(239, 68, 68, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <AlertTriangle size={17} color="#ef4444" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f87171' }}>
                    프로젝트 삭제
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setDeleteModal({ open: false, project: null })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-3, #94a3b8)',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* 모달 본문 */}
            <div style={{ padding: '20px' }}>
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'var(--text-1, #f8fafc)',
                }}
              >
                <strong style={{ color: '#ef4444' }}>&quot;{deleteModal.project?.name}&quot;</strong> 프로젝트를
                정말 삭제하시겠습니까?
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: 'var(--text-3, #94a3b8)',
                  background: 'var(--bg-2, #181f2c)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border, #1e2636)',
                }}
              >
                삭제 시 프로젝트 설정, 트리 구조 및 관련 분석 결과가 모두 목록에서 제거됩니다.
              </p>

              {/* 하단 버튼 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '20px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setDeleteModal({ open: false, project: null })}
                  disabled={isDeleting}
                  style={{
                    padding: '7px 14px',
                    background: 'transparent',
                    border: '1px solid var(--border-strong, #333d4e)',
                    borderRadius: '6px',
                    color: 'var(--text-2, #cbd5e1)',
                    fontSize: '13px',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={submitDelete}
                  disabled={isDeleting}
                  style={{
                    padding: '7px 16px',
                    background: isDeleting ? '#7f1d1d' : '#dc2626',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Trash2 size={13} />
                  <span>{isDeleting ? '삭제 중...' : '프로젝트 삭제'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}