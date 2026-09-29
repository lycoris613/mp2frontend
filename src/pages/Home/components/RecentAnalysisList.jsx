import { recentProjects } from '../../../data/dashboardData';

/**
 * 최근 분석 프로젝트 목록 패널
 * 05 React 컴포넌트 설계서 표 3-1 준수
 *
 * @param {Array} projects - 프로젝트 목록 데이터
 * @param {function} onSelectProject - 프로젝트 선택 시 콜백
 */
export default function RecentAnalysisList({
  projects = recentProjects,
  onSelectProject,
}) {
  return (
    <section className="panel recent">
      <div className="panel-head">
        <b>최근 분석</b>
        <span style={{ cursor: 'pointer' }}>전체 보기 →</span>
      </div>

      {projects.map((project) => (
        <div
          className="recent-row"
          key={project.name || project.id}
          onClick={() => onSelectProject?.(project)}
          style={{ cursor: onSelectProject ? 'pointer' : 'default' }}
        >
          <span className="file-icon"></span>
          <div>
            <b>{project.name}</b>
            <small>{project.meta}</small>
          </div>
          <span className={`risk ${project.tone}`}>
            위험 {project.risk}
          </span>
          <small>{project.updatedAt || '3분 전'}</small>
        </div>
      ))}
    </section>
  );
}
