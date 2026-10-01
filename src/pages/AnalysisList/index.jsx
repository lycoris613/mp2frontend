import { useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useUIStore } from '../../stores/uiStore';
import { Trash2, Search, AlertCircle, RefreshCw, FolderOpen } from 'lucide-react';

export default function AnalysisListPage({ currentUser, onLogin, onLogout }) {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();

  const selectedProject = searchParams.get('project') || params.projectId;

  const { analyses, isLoading, error, filters, fetchAnalyses, setFilter, removeAnalysis } = useDashboardStore();
  const { addToast, openConfirm } = useUIStore();

  useEffect(() => {
    if (selectedProject !== filters.project) {
      setFilter('project', selectedProject || null);
    } else {
      fetchAnalyses();
    }
  }, [selectedProject]);

  const handleDelete = (id, projectName) => {
    // openConfirm 모달 함수가 구현되어 있지 않아도 대응할 수 있는 안전한 삭제
    if (openConfirm) {
      openConfirm({
        title: '분석 결과 삭제',
        message: `'${projectName}'의 분석 결과를 삭제하시겠습니까?`,
        onConfirm: async () => {
          const success = await removeAnalysis(id);
          if (success && addToast) addToast('분석 결과가 삭제되었습니다.', 'success');
        },
      });
    } else if (window.confirm(`'${projectName}'의 분석 결과를 삭제하시겠습니까?`)) {
      removeAnalysis(id).then((success) => {
        if (success && addToast) addToast('분석 결과가 삭제되었습니다.', 'success');
      });
    }
  };

  return (
    <main className="content">
      <PageHeader currentUser={currentUser} onLogin={onLogin} onLogout={onLogout} />

      <div className="page-pad">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>
              분석 결과 목록
              {selectedProject && (
                <span style={{ fontSize: '18px', color: '#10B981', marginLeft: '10px' }}>
                  [{selectedProject}]
                </span>
              )}
            </h2>
            <p className="sub-text">프로젝트별 취약점 검출 및 보안 분석 내역을 조회합니다.</p>
          </div>

          {/* 필터 및 검색 바 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 8px', backgroundColor: '#fff' }}>
              <Search size={14} color="#9ca3af" />
              <input
                type="text"
                placeholder="검색어 입력..."
                value={filters.search || ''}
                onChange={(e) => setFilter('search', e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '13px', marginLeft: '6px' }}
              />
            </div>
            <select
              value={filters.severity || 'ALL'}
              onChange={(e) => setFilter('severity', e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', borderColor: '#d1d5db', fontSize: '13px', backgroundColor: '#fff' }}
            >
              <option value="ALL">전체 심각도</option>
              <option value="CRITICAL">치명적</option>
              <option value="HIGH">높음</option>
              <option value="MEDIUM">중간</option>
              <option value="LOW">낮음</option>
            </select>
            <select
              value={filters.sortBy || 'latest'}
              onChange={(e) => setFilter('sortBy', e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', borderColor: '#d1d5db', fontSize: '13px', backgroundColor: '#fff' }}
            >
              <option value="latest">최신순</option>
              <option value="severity">심각도순</option>
            </select>
          </div>
        </div>

        {/* 4대 상태별 UI 처리 (외부 컴포넌트 의존성 제거 안전 버전) */}
        <div className="analysis-list-container" style={{ marginTop: '20px' }}>
          {/* 1. 로딩 상태 */}
          {isLoading && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <p style={{ fontSize: '14px' }}>분석 결과 목록을 불러오는 중입니다...</p>
            </div>
          )}

          {/* 2. 에러 상태 */}
          {!isLoading && error && (
            <div style={{ padding: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertCircle size={18} />
                <strong style={{ fontSize: '15px' }}>목록 조회 실패</strong>
              </div>
              <p style={{ fontSize: '14px', marginBottom: '12px' }}>{error}</p>
              <button
                type="button"
                onClick={fetchAnalyses}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#dc2626', color: '#fff', borderRadius: '6px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
              >
                <RefreshCw size={13} /> 다시 시도
              </button>
            </div>
          )}

          {/* 3. 데이터 없음(Empty) 상태 */}
          {!isLoading && !error && (!analyses || analyses.length === 0) && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <FolderOpen size={40} style={{ margin: '0 auto 12px', color: '#9ca3af' }} />
              <p style={{ fontSize: '15px', marginBottom: '16px' }}>해당 조건의 분석 결과가 존재하지 않습니다.</p>
              <button
                type="button"
                className="dark-btn"
                onClick={() => navigate('/analysis/new')}
                style={{ padding: '8px 16px', backgroundColor: '#111827', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              >
                새 분석 시작하기
              </button>
            </div>
          )}

          {/* 4. 데이터 정상 목록 표시 */}
          {!isLoading && !error && analyses && analyses.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {analyses.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px', backgroundColor: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: '8px', cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/results/${item.project}`)}
                >
                  <div>
                    <strong style={{ fontSize: '15px', color: '#111827' }}>{item.project}</strong>
                    <span style={{ marginLeft: '10px', fontSize: '13px', color: '#6b7280' }}>
                      {item.vulnerability || '취약점 분석 완료'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`tag severity-${item.severity?.toLowerCase() || 'low'}`}>
                      {item.severity || 'LOW'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id, item.project);
                      }}
                      style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}