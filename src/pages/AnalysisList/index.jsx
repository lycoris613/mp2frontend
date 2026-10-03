import { useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useUIStore } from '../../stores/uiStore';
import { Trash2, Search, AlertCircle, RefreshCw } from 'lucide-react';

export default function AnalysisListPage({ currentUser, onLogin, onLogout }) {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();

  const selectedProject = searchParams.get('project') || params.projectId;

  const { analyses, isLoading, error, filters, fetchAnalyses, setFilter, removeAnalysis } = useDashboardStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    if (selectedProject !== filters.project) {
      setFilter('project', selectedProject || null);
    } else {
      fetchAnalyses();
    }
  }, [selectedProject]);

  // ConfirmModal UI가 아직 없어 window.confirm으로 확인한다
  const handleDelete = (id, projectName) => {
    if (!window.confirm(`'${projectName}'의 분석 결과를 삭제하시겠습니까?`)) return;
    removeAnalysis(id).then((success) => {
      if (success) addToast?.('분석 결과가 삭제되었습니다.', 'success');
    });
  };

  return (
    <main className="content">
      <PageHeader
        title="분석 결과 목록"
        subtitle="지금까지 요청한 모든 분석 이력"
        currentUser={currentUser}
        onLogin={onLogin}
        onLogout={onLogout}
      />

      <div className="page-pad">
        <div className="section-header">
          <div>
            <h2>
              분석 결과 목록
              {selectedProject && <span className="section-header-tag">[{selectedProject}]</span>}
            </h2>
            <p className="sub-text">프로젝트별 취약점 검출 및 보안 분석 내역을 조회합니다.</p>
          </div>

          <div className="list-toolbar">
            <div className="list-search-box">
              <Search size={14} />
              <input
                type="text"
                placeholder="검색어 입력..."
                value={filters.search || ''}
                onChange={(e) => setFilter('search', e.target.value)}
              />
            </div>
            <select
              className="list-filter-select"
              value={filters.severity || 'ALL'}
              onChange={(e) => setFilter('severity', e.target.value)}
            >
              <option value="ALL">전체 심각도</option>
              <option value="CRITICAL">치명적</option>
              <option value="HIGH">높음</option>
              <option value="MEDIUM">중간</option>
              <option value="LOW">낮음</option>
            </select>
            <select
              className="list-filter-select"
              value={filters.sortBy || 'latest'}
              onChange={(e) => setFilter('sortBy', e.target.value)}
            >
              <option value="latest">최신순</option>
              <option value="severity">심각도순</option>
            </select>
          </div>
        </div>

        <div className="analysis-list-container">
          {isLoading && <LoadingSpinner message="분석 결과 목록을 불러오는 중입니다..." />}

          {!isLoading && error && (
            <div className="list-error-banner">
              <div className="list-error-banner-title">
                <AlertCircle size={18} />
                <strong>목록 조회 실패</strong>
              </div>
              <p>{error}</p>
              <button type="button" className="list-retry-btn" onClick={fetchAnalyses}>
                <RefreshCw size={13} /> 다시 시도
              </button>
            </div>
          )}

          {!isLoading && !error && (!analyses || analyses.length === 0) && (
            <EmptyState
              title="해당 조건의 분석 결과가 존재하지 않습니다."
              description="새로운 분석을 시작해 보세요."
              actionLabel="새 분석 시작하기"
              onAction={() => navigate('/analysis/new')}
            />
          )}

          {!isLoading && !error && analyses && analyses.length > 0 && (
            <div className="list-rows">
              {analyses.map((item) => (
                <div
                  key={item.id}
                  className="list-row"
                  onClick={() => navigate(`/analyses?analysisId=${item.analysisId || item.id}`)}
                >
                  <div>
                    <strong className="list-row-title">{item.project}</strong>
                    <span className="list-row-meta">{item.vulnerability || '취약점 분석 완료'}</span>
                  </div>
                  <div className="list-row-actions">
                    <span className={`risk-badge ${severityTone(item.severity)}`}>
                      {item.severity || 'LOW'}
                    </span>
                    <button
                      type="button"
                      className="list-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id, item.project);
                      }}
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

function severityTone(severity) {
  switch (severity) {
    case 'CRITICAL': return 'danger';
    case 'HIGH': return 'warn';
    case 'MEDIUM': return 'moderate';
    default: return 'safe';
  }
}
