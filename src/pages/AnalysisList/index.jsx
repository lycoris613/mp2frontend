import { useSearchParams, useParams } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';

export default function AnalysisListPage({ currentUser, onLogin, onLogout }) {
  const [searchParams] = useSearchParams();
  const params = useParams();

  // ?project=... 쿼리 파라미터 또는 /results/:projectId 경로 파라미터 모두 수신 지원
  const selectedProject = searchParams.get('project') || params.projectId;

  return (
    <main className="content">
      <PageHeader
        currentUser={currentUser}
        onLogin={onLogin}
        onLogout={onLogout}
      />

      <div className="page-pad">
        <div className="section-header">
          <h2>
            분석 결과 목록
            {selectedProject && (
              <span style={{ fontSize: '18px', color: '#10B981', marginLeft: '10px' }}>
                [{selectedProject}]
              </span>
            )}
          </h2>
          <p className="sub-text">
            {selectedProject
              ? `'${selectedProject}' 프로젝트의 보안 분석 리스트 및 상세 결과를 확인합니다.`
              : '진행된 보안 분석 리스트 및 상세 결과를 확인합니다.'}
          </p>
        </div>

        <div className="analysis-list-container" style={{ marginTop: '20px' }}>
          <div
            className="card-box"
            style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}
          >
            {selectedProject ? (
              <p>
                선택된 프로젝트: <strong style={{ color: '#111827' }}>{selectedProject}</strong>
                <br />
                해당 프로젝트의 분석 결과 데이터 목록 영역입니다. (수/목 구체화 예정)
              </p>
            ) : (
              <p>전체 프로젝트의 분석 결과 목록이 표시될 메인 영역입니다. (수/목 구체화 예정)</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}