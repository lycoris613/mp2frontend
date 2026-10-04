import { useNavigate } from 'react-router-dom';

/**
 * 최근 분석 프로젝트 목록 패널
 * @param {Array} projects - 프로젝트 목록 데이터
 * @param {function} onSelectProject - 프로젝트 선택 시 콜백
 */
export default function RecentAnalysisList({
  projects = [],
  onSelectProject,
}) {
  const navigate = useNavigate();

  return (
    <section className="panel recent">
      <div className="panel-head">
        <b>최근 분석</b>
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/analyses/list')}
        >
          전체 보기 →
        </span>
      </div>

      {projects.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#6b7280', fontSize: '15px' }}>
          최근 분석 이력이 없습니다.
        </div>
      ) : (
        projects.map((project) => (
          <div
            className="recent-row"
            key={project.id || project.name}
            onClick={() => onSelectProject?.(project)}
            style={{ cursor: onSelectProject ? 'pointer' : 'default' }}
          >
            <span className="file-icon"></span>
            <div>
              <b>{project.name}</b>
              <small>{project.meta}</small>
            </div>
            <span className={`risk ${project.tone || 'moderate'}`}>
              위험 {project.risk || '보통'}
            </span>
            <small>{project.updatedAt || '최근'}</small>
          </div>
        ))
      )}
    </section>
  );
}
