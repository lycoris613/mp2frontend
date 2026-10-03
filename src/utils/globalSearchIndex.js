import { PROJECTS_DATA, normalizeProjectId } from '../data/findingData';

/**
 * 프로젝트, 파일, 취약점을 망라하는 글로벌 검색 인덱스 생성
 */
export function buildGlobalSearchIndex() {
  const index = [];

  // 1. 프로젝트 인덱싱
  Object.keys(PROJECTS_DATA).forEach((projectId) => {
    const project = PROJECTS_DATA[projectId];
    const fileCount = Object.keys(project.filePaths || {}).length;

    let projectDesc = project.description || '보안 점검 프로젝트';
    if (projectId === 'payments-api') {
      projectDesc = `결제 API 서비스 · Node.js/TypeScript · ${fileCount}개 소스 파일`;
    } else if (projectId === 'auth-service') {
      projectDesc = `인증 및 세션 서비스 · Go 언어 · ${fileCount}개 소스 파일`;
    } else if (projectId === 'admin-console') {
      projectDesc = `관리자 콘솔 대시보드 · React/Spring · ${fileCount}개 소스 파일`;
    } else if (fileCount === 0) {
      projectDesc = `신규 빈 프로젝트 · ${projectDesc}`;
    }

    index.push({
      id: `project_${projectId}`,
      projectId,
      title: project.name,
      category: 'project',
      categoryLabel: '프로젝트',
      subtitle: projectDesc,
      path: projectId,
      url: `/analyses?project=${projectId}`,
      analysisUrl: `/analysis?project=${projectId}`,
    });

    // 2. 파일 인덱싱
    const filePaths = project.filePaths || {};
    Object.entries(filePaths).forEach(([fileName, relPath]) => {
      index.push({
        id: `file_${projectId}_${fileName}`,
        projectId,
        fileName,
        title: fileName,
        category: 'file',
        categoryLabel: '파일',
        subtitle: `${projectId} · ${relPath}`,
        path: relPath,
        url: `/analyses?project=${projectId}&file=${encodeURIComponent(fileName)}`,
        analysisUrl: `/analysis?project=${projectId}`,
      });
    });

    // 3. 취약점 인덱싱
    const fileFindingData = project.fileFindingData || {};
    Object.entries(fileFindingData).forEach(([fileName, fData]) => {
      const findingsList = Array.isArray(fData.findings)
        ? fData.findings
        : fData.finding
        ? [fData.finding]
        : [];

      findingsList.forEach((f) => {
        const ruleId = f.detectionSource?.ruleId || f.ruleId || `FIND-${f.id || '01'}`;
        const cwe = f.cwe || f.vulnerabilityType || '';
        const title = f.title || f.detectionSource?.ruleTitle || '보안 취약점';
        const line = f.line || (f.vulnLineIndices?.[0] ? f.vulnLineIndices[0] + 1 : 1);
        const severity = f.severity || 'HIGH';

        index.push({
          id: `finding_${projectId}_${fileName}_${f.id || ruleId}`,
          projectId,
          fileName,
          findingId: f.id || ruleId,
          ruleId,
          severity,
          cwe,
          title,
          category: 'finding',
          categoryLabel: '취약점',
          subtitle: `${projectId} · ${fileName} · 라인 ${line} [${ruleId} · ${cwe}]`,
          path: `${fileName}:${line}`,
          url: `/analyses?project=${projectId}&file=${encodeURIComponent(fileName)}&findingId=${f.id || ruleId}`,
          analysisUrl: `/analysis?project=${projectId}`,
        });
      });
    });
  });

  return index;
}

/**
 * 글로벌 검색 실행 함수
 * @param {string} query - 검색어
 * @param {string} filterCategory - 'all' | 'project' | 'file' | 'finding'
 */
export function searchGlobalIndex(query = '', filterCategory = 'all') {
  const allItems = buildGlobalSearchIndex();
  const trimmed = query.trim().toLowerCase();

  // 1. 카테고리 필터링
  let items = allItems;
  if (filterCategory !== 'all') {
    items = items.filter((item) => item.category === filterCategory);
  }

  // 2. 검색어가 없는 경우: 추천/주요 항목 반환 (프로젝트 3개, 주요 파일 3개, 주요 취약점 3개)
  if (!trimmed) {
    const recommendedProjects = items.filter((i) => i.category === 'project').slice(0, 3);
    const recommendedFindings = items.filter((i) => i.category === 'finding').slice(0, 3);
    const recommendedFiles = items.filter((i) => i.category === 'file').slice(0, 3);

    if (filterCategory === 'project') return recommendedProjects;
    if (filterCategory === 'finding') return recommendedFindings;
    if (filterCategory === 'file') return recommendedFiles;

    return [...recommendedProjects, ...recommendedFindings, ...recommendedFiles];
  }

  // 3. 검색어 매칭 (title, subtitle, path, ruleId, cwe 등)
  return items.filter((item) => {
    return (
      item.title.toLowerCase().includes(trimmed) ||
      item.subtitle.toLowerCase().includes(trimmed) ||
      item.path?.toLowerCase().includes(trimmed) ||
      item.ruleId?.toLowerCase().includes(trimmed) ||
      item.cwe?.toLowerCase().includes(trimmed) ||
      item.projectId?.toLowerCase().includes(trimmed)
    );
  });
}
