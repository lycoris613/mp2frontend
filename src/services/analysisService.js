/**
 * 분석 실행 및 결과 관리 비즈니스 로직 서비스
 * 실제 Spring Boot 백엔드(/api/v1)와 직접 통신
 */

import { analysisApi } from '../api/analysisApi.js';
import { findingApi } from '../api/findingApi.js';
import { detectLanguage } from '../utils/language.js';
import {
  PROJECTS_DATA,
  normalizeProjectId,
  getProjectTreeData,
  getProjectFileFindingData,
  getProjectDefaultFile,
} from '../data/findingData.js';

const STORAGE_PREFIX_ANALYSIS_RUN = 'codeguard_analysis_run';
const STORAGE_PREFIX_LATEST_ANALYSIS = 'codeguard_latest_analysis';

const getStorageItem = (key, fallback = null) => {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('LocalStorage read error:', e);
    return fallback;
  }
};

const setStorageItem = (key, value) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 분석 제목이나 파일 목록으로부터 프로젝트 식별 ('payments-api' | 'auth-service' | 'admin-console')
 */
export function detectProjectId(text, files = []) {
  const str = String(text || '').toLowerCase();
  const fileNames = files
    .map((f) => (typeof f === 'string' ? f : f.fileName || f.relativePath || ''))
    .join(' ')
    .toLowerCase();

  if (
    str.includes('auth') ||
    str.includes('인증') ||
    fileNames.includes('.go') ||
    fileNames.includes('token_service')
  ) {
    return 'auth-service';
  }
  if (
    str.includes('admin') ||
    str.includes('관리') ||
    fileNames.includes('usermanagement') ||
    fileNames.includes('adminapi') ||
    fileNames.includes('rolepermissions')
  ) {
    return 'admin-console';
  }
  if (
    str.includes('payment') ||
    str.includes('결제') ||
    fileNames.includes('users.ts') ||
    fileNames.includes('payments.ts')
  ) {
    return 'payments-api';
  }
  if (str.includes('bank') || str.includes('뱅킹') || fileNames.includes('bankingservice')) {
    return 'payments-api';
  }
  return null;
}

/**
 * 백엔드 분석 상태가 COMPLETED가 될 때까지 폴링 대기
 */
async function waitForAnalysisComplete(analysisId, maxAttempts = 15, intervalMs = 600) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const statusRes = await analysisApi.getAnalysisStatus(analysisId);
      const statusData = statusRes?.data !== undefined ? statusRes.data : statusRes;
      if (statusData?.status === 'COMPLETED' || statusData?.status === 'FAILED') {
        return statusData;
      }
    } catch (e) {
      console.warn(`상태 폴링 ${i + 1}회 실패:`, e.message);
    }
    await delay(intervalMs);
  }
  return null;
}

/**
 * 특정 프로젝트의 원래 전체 파일과 기본 취약점 데이터를 갖는 기본 분석 런 객체 빌드
 */
export function buildProjectDefaultRun(projectId) {
  const normId = normalizeProjectId(projectId || 'payments-api');
  const treeData = getProjectTreeData(normId);
  const fileFindingData = JSON.parse(JSON.stringify(getProjectFileFindingData(normId)));
  const defaultFile = getProjectDefaultFile(normId);

  let totalFindingsCount = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  const typeTabsCount = { SQL_INJECTION: 0, HARDCODED_SECRET: 0, XSS: 0 };

  Object.values(fileFindingData).forEach((file) => {
    if (file.hasFinding) {
      const list = Array.isArray(file.findings) && file.findings.length > 0
        ? file.findings
        : file.finding ? [file.finding] : [];
      list.forEach((f) => {
        totalFindingsCount += 1;
        const sev = f.severity || 'HIGH';
        if (sev === 'CRITICAL') criticalCount += 1;
        else if (sev === 'HIGH') highCount += 1;
        else if (sev === 'MEDIUM') mediumCount += 1;
        else lowCount += 1;

        const vType = f.vulnerabilityType || 'SQL_INJECTION';
        if (typeTabsCount[vType] !== undefined) typeTabsCount[vType] += 1;
      });
    }
  });

  return {
    analysisId: null,
    projectId: normId,
    title: `${normId} 분석 결과`,
    scope: '전체 프로젝트',
    selectedFile: defaultFile,
    activeRules: ['SQL_INJECTION', 'HARDCODED_SECRET', 'XSS'],
    totalFindings: totalFindingsCount,
    totals: {
      total: totalFindingsCount,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
    },
    tabs: [
      { id: 'ALL', label: '전체 취약점', count: totalFindingsCount, active: true },
      { id: 'SQL_INJECTION', label: 'SQL 삽입', count: typeTabsCount.SQL_INJECTION, active: false },
      { id: 'HARDCODED_SECRET', label: '하드코딩된 비밀정보', count: typeTabsCount.HARDCODED_SECRET, active: false },
      { id: 'XSS', label: 'XSS', count: typeTabsCount.XSS, active: false },
    ],
    treeData,
    fileFindingData,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 백엔드 파일 목록과 취약점 상세 정보로부터 프론트엔드 트리 및 파일 데이터 구조 완성
 * - 프로젝트의 원래 전체 파일과 폴더 계층 구조(getProjectTreeData)를 베이스로 유지
 * - 이번 백엔드 분석에서 취약점이 탐지된 파일에만 정확히 빨간 점(hasFinding: true)을 표시
 * - 취약점이 없는 파일은 깨끗하게 표시(hasFinding: false)
 */
export async function buildAnalysisRunFromBackend(analysisId, backendSummary = null, preferredProjectId = null) {
  // 1) 분석 요약 정보 조회
  const summary = backendSummary || (await analysisApi.getAnalysisDetail(analysisId).catch(() => null));

  // 2) 분석 파일 목록 및 취약점 목록 조회
  const [filesRes, findingsRes] = await Promise.all([
    analysisApi.getAnalysisFiles(analysisId).catch(() => []),
    findingApi.getFindings(analysisId).catch(() => []),
  ]);

  const fileList = Array.isArray(filesRes) ? filesRes : filesRes?.data || [];
  const rawFindings = Array.isArray(findingsRes)
    ? findingsRes
    : findingsRes?.content || findingsRes?.data || [];

  // 3) 취약점 상세 정보(탐지 근거, before/after diff 등) 병렬 로드
  const detailedFindingsMap = {};
  await Promise.all(
    rawFindings.map(async (rf) => {
      const fId = rf.findingId || rf.id;
      if (!fId) return;
      try {
        const detail = await findingApi.getFindingDetail(fId);
        if (detail) {
          detailedFindingsMap[fId] = detail;
        }
      } catch (err) {
        console.warn(`취약점(${fId}) 상세 조회 실패:`, err.message);
      }
    })
  );

  // 4) 프로젝트 판별 (preferredProjectId 우선 -> title/files 자동 감지 -> 'payments-api')
  const detected = detectProjectId(summary?.title, fileList);
  const matchedProjectId =
    preferredProjectId && PROJECTS_DATA[normalizeProjectId(preferredProjectId)]
      ? normalizeProjectId(preferredProjectId)
      : detected || 'payments-api';

  // 5) 프로젝트의 원래 전체 파일 맵 및 트리 구조 딥카피 복제
  const baseTree = getProjectTreeData(matchedProjectId);
  const baseFileData = getProjectFileFindingData(matchedProjectId);
  const fileFindingData = JSON.parse(JSON.stringify(baseFileData));

  // 6) 사용자가 원상 복구한 스토리지 데이터가 있으면 우선 복원
  const restoredFindingData =
    getStorageItem(`codeguard_restored_findings_${matchedProjectId}`) ||
    getStorageItem(`codeguard_restored_findings_${matchedProjectId}_${analysisId}`);

  if (restoredFindingData) {
    Object.assign(fileFindingData, JSON.parse(JSON.stringify(restoredFindingData)));
  } else if (fileList.length > 0) {
    // 백엔드 분석 파일 목록에 있는 파일들만 취약점 초기화 후 재주입 (다른 기본 파일 데이터는 보존)
    fileList.forEach((file) => {
      const fName = file.fileName || file.relativePath;
      if (fileFindingData[fName]) {
        fileFindingData[fName].hasFinding = false;
        fileFindingData[fName].findings = [];
        fileFindingData[fName].finding = null;
        fileFindingData[fName].vulnLineIndices = [];
        fileFindingData[fName].tagLabel = '';
        fileFindingData[fName].diff = null;
      }
    });
  }

  let totalFindingsCount = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  const typeTabsCount = {
    SQL_INJECTION: 0,
    HARDCODED_SECRET: 0,
    XSS: 0,
  };

  // 7) 백엔드 파일 본문 및 탐지된 취약점 주입
  for (const file of fileList) {
    const fileName = file.fileName || file.relativePath;
    const fileId = file.fileId;
    let codeLines = null;
    let fileVulns = [];

    try {
      const fileDetail = await analysisApi.getAnalysisFileContent(analysisId, fileId);
      if (fileDetail && typeof fileDetail.content === 'string') {
        codeLines = fileDetail.content.split('\n');
      }
      if (fileDetail && Array.isArray(fileDetail.vulnerabilities)) {
        fileVulns = fileDetail.vulnerabilities;
      }
    } catch (e) {
      console.warn(`파일(${fileName}, ID:${fileId}) 본문 조회 실패:`, e.message);
    }

    // 파일별 매핑된 취약점이 없으면 전체 findings에서 파일명으로 매칭
    if (fileVulns.length === 0 && rawFindings.length > 0) {
      fileVulns = rawFindings.filter(
        (f) =>
          f.relativePath === fileName ||
          f.fileName === fileName ||
          f.fileId === fileId
      );
    }

    const mappedFindings = fileVulns.map((v) => {
      const fId = v.id || v.findingId;
      const detailed = detailedFindingsMap[fId];

      const vType = detailed?.vulnerabilityType || v.type || v.vulnerabilityType || 'SQL_INJECTION';
      const sev = detailed?.severity || v.severity || 'HIGH';
      const typeLabel = detailed?.title || v.typeDisplayName || v.displayName || vType;

      totalFindingsCount += 1;
      if (sev === 'CRITICAL') criticalCount += 1;
      else if (sev === 'HIGH') highCount += 1;
      else if (sev === 'MEDIUM') mediumCount += 1;
      else lowCount += 1;

      if (typeTabsCount[vType] !== undefined) {
        typeTabsCount[vType] += 1;
      } else {
        typeTabsCount[vType] = 1;
      }

      if (detailed) {
        return {
          ...detailed,
          id: fId,
          findingId: fId,
          file: fileName,
          fileName,
        };
      }

      return {
        id: fId,
        findingId: fId,
        file: fileName,
        fileName,
        vulnerabilityType: vType,
        title: `${typeLabel} 탐지`,
        ruleId: v.ruleId || 'SEC-SCAN',
        severity: sev,
        status: v.status || 'OPEN',
        line: v.startLine || 1,
        startLine: v.startLine || 1,
        endLine: v.endLine || v.startLine || 1,
        vulnLineIndices: [v.startLine ? v.startLine - 1 : 0],
        codeSnippet: v.codeSnippet || '',
        tagLabel: `${typeLabel} 탐지`,
        cwe: v.cweId || 'CWE-89',
        description: `${typeLabel} 취약점이 탐지되었습니다.`,
        detectionSource: {
          title: '탐지 근거 · 규칙 기반 (Rule-based)',
          ruleId: v.ruleId || 'SEC-SCAN',
          ruleTitle: typeLabel,
          matchedCode: v.codeSnippet || '',
        },
        diff: null,
      };
    });

    const existing = fileFindingData[fileName] || fileFindingData[file.relativePath];
    const fileItem = {
      ...(existing || {}),
      fileId,
      name: fileName,
      fileName,
      relativePath: file.relativePath || fileName,
      codeLines: codeLines || existing?.codeLines || ['// 소스코드를 불러오는 중입니다...'],
      hasFinding: mappedFindings.length > 0,
      findings: mappedFindings,
      finding: mappedFindings[0] || null,
      vulnLineIndices: mappedFindings.flatMap((f) => f.vulnLineIndices || []),
      tagLabel:
        mappedFindings.length > 1
          ? `${mappedFindings.length}개 보안 취약점 탐지됨`
          : mappedFindings[0]?.tagLabel || '',
      diff: mappedFindings[0]?.diff || existing?.diff || null,
    };

    fileFindingData[fileName] = fileItem;
    if (file.relativePath && file.relativePath !== fileName) {
      fileFindingData[file.relativePath] = fileItem;
    }
  }

  // 8) 프로젝트 전체 트리의 hasFinding(빨간 점)을 취약점 탐지 여부와 정확히 동기화
  const updateTreeNodeFindings = (nodes) => {
    return nodes.map((node) => {
      if (!node.isDir) {
        const item = fileFindingData[node.name];
        const hasFinding = Boolean(item && item.hasFinding && (item.findings?.length > 0 || item.finding));
        return {
          ...node,
          hasFinding,
          fileId: item?.fileId || node.fileId,
        };
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeNodeFindings(node.children),
        };
      }
      return node;
    });
  };

  const finalTreeData = updateTreeNodeFindings(baseTree);

  // 기본 선택 파일: 이번 분석에서 취약점이 탐지된 파일 우선, 없으면 프로젝트 기본 파일
  const targetWithFinding = fileList.find((f) => {
    const fName = f.fileName || f.relativePath;
    return (fileFindingData[fName]?.findings?.length || 0) > 0;
  });
  const firstFile =
    targetWithFinding?.fileName ||
    getProjectDefaultFile(matchedProjectId) ||
    Object.keys(fileFindingData)[0] ||
    'users.ts';

  const analysisRun = {
    analysisId,
    projectId: matchedProjectId,
    title: summary?.title || `${matchedProjectId} 분석 결과`,
    scope: '전체 프로젝트',
    selectedFile: firstFile,
    activeRules: ['SQL_INJECTION', 'HARDCODED_SECRET', 'XSS'],
    totalFindings: totalFindingsCount || summary?.totalCount || 0,
    totals: {
      total: totalFindingsCount || summary?.totalCount || 0,
      critical: criticalCount || summary?.criticalCount || 0,
      high: highCount || summary?.highCount || 0,
      medium: mediumCount || summary?.mediumCount || 0,
      low: lowCount || summary?.lowCount || 0,
    },
    tabs: [
      { id: 'ALL', label: '전체 취약점', count: totalFindingsCount || summary?.totalCount || 0, active: true },
      { id: 'SQL_INJECTION', label: 'SQL 삽입', count: typeTabsCount.SQL_INJECTION, active: false },
      { id: 'HARDCODED_SECRET', label: '하드코딩된 비밀정보', count: typeTabsCount.HARDCODED_SECRET, active: false },
      { id: 'XSS', label: 'XSS', count: typeTabsCount.XSS, active: false },
    ],
    treeData: finalTreeData,
    fileFindingData,
    createdAt: summary?.createdAt || new Date().toISOString(),
  };

  setStorageItem(`${STORAGE_PREFIX_ANALYSIS_RUN}_${analysisId}`, analysisRun);
  setStorageItem(`${STORAGE_PREFIX_LATEST_ANALYSIS}_${matchedProjectId}`, analysisRun);

  return analysisRun;
}

/**
 * 1. 취약점 분석 실행 (Spring Boot POST /api/v1/analyses 및 완료 대기)
 */
export async function executeAnalysis({
  projectId,
  title = '취약점 정기 분석',
  scope = '전체 프로젝트',
  selectedFile,
  language,
  rules = [],
  fileContents = {},
  treeData = null,
}) {
  const activeRules = rules.filter((r) => r.checked).map((r) => r.id);

  const validFiles = Object.keys(fileContents)
    .filter((name) => {
      const ext = name.split('.').pop()?.toLowerCase();
      return ['ts', 'tsx', 'js', 'jsx', 'java', 'py', 'html', 'htm'].includes(ext);
    })
    .map((name) => ({
      relativePath: name,
      content: Array.isArray(fileContents[name])
        ? fileContents[name].join('\n')
        : String(fileContents[name] || ''),
    }));

  let resolvedLanguage = language;
  if (!resolvedLanguage && selectedFile) {
    const detected = detectLanguage(selectedFile, fileContents[selectedFile]);
    if (detected.isSupported) {
      resolvedLanguage = detected.language;
    }
  }
  if (!resolvedLanguage || resolvedLanguage === 'UNKNOWN') {
    resolvedLanguage = 'TYPESCRIPT';
  }

  const apiPayload = {
    title: title || `${projectId} 보안 분석`,
    language: resolvedLanguage,
    files: validFiles.length > 0 ? validFiles : [
      {
        relativePath: 'users.ts',
        content: '// 분석 대상 코드\nconst query = `SELECT * FROM users WHERE id = ${userId}`;',
      },
    ],
    scanOptions: {
      detectSqlInjection: activeRules.includes('SQL_INJECTION'),
      detectHardcodedSecret: activeRules.includes('HARDCODED_SECRET'),
      detectXss: activeRules.includes('XSS'),
      scope,
      selectedFile,
    },
  };

  const apiRes = await analysisApi.createAnalysis(apiPayload);
  const backendResponse = apiRes?.data !== undefined ? apiRes.data : apiRes;

  const analysisId = backendResponse?.analysisId;
  if (!analysisId) {
    throw new Error('백엔드에서 analysisId를 반환하지 않았습니다.');
  }

  // 백엔드 분석 엔진 완료 대기
  await waitForAnalysisComplete(analysisId);

  // 완성된 결과 객체 빌드 (원래 프로젝트 전체 파일 및 트리 보존)
  const analysisRun = await buildAnalysisRunFromBackend(analysisId, backendResponse, projectId);
  return analysisRun;
}

/**
 * 2. 특정 분석 결과 조회 (백엔드 최신 분석 자동 연결 및 프로젝트별 파일 격리 지원)
 */
export async function getAnalysisResult(projectId, analysisId) {
  const normProjectId = normalizeProjectId(projectId || 'payments-api');
  let targetId = analysisId;

  // 1) analysisId가 없거나 더미 목 ID(예: 128)인 경우 해당 프로젝트에 일치하는 백엔드 분석 탐색
  if (!targetId || Number(targetId) >= 100) {
    try {
      const analysesRes = await analysisApi.getAnalyses();
      const list = Array.isArray(analysesRes)
        ? analysesRes
        : Array.isArray(analysesRes?.data)
          ? analysesRes.data
          : analysesRes?.content || [];

      // 현재 조회하려는 프로젝트와 매칭되는 백엔드 분석 우선 탐색 (최신 분석 우선)
      const matchingAnalyses = [...list].reverse().filter((a) => {
        const detected = detectProjectId(a.title, a.vulnerabilities || []);
        return detected === normProjectId;
      });

      const withFindings = matchingAnalyses.find(
        (a) => (a.status === 'COMPLETED' || a.status === 'SCANNING') && a.totalCount > 0
      );
      const chosen = withFindings || matchingAnalyses[0];
      if (chosen) {
        targetId = chosen.analysisId || chosen.id;
      }
    } catch (e) {
      console.warn('백엔드 분석 목록 조회 실패:', e.message);
    }
  }

  // 2) targetId가 있으면 백엔드 실데이터로부터 프로젝트 전체 파일 런 빌드
  if (targetId) {
    try {
      const liveRun = await buildAnalysisRunFromBackend(targetId, null, normProjectId);
      return liveRun;
    } catch (e) {
      console.warn(`백엔드 analysisId(${targetId}) 빌드 실패:`, e.message);
    }
  }

  // 3) 백엔드 데이터가 없으면 해당 프로젝트의 원래 전체 파일 런 반환
  return buildProjectDefaultRun(normProjectId);
}

/**
 * 3. 취약점 처리 상태 변경 (해결/무시)
 */
export async function updateFindingStatusOnAnalysis({
  analysisId,
  findingId,
  status = 'RESOLVED',
}) {
  let result = null;
  try {
    result = await findingApi.updateFindingStatus(findingId, status);
  } catch (err) {
    console.warn(`[Finding Status] 백엔드 취약점 상태 변경 API 호출 실패 (${findingId}):`, err.message);
  }

  // 로컬 스토리지 데이터 동기화
  if (analysisId) {
    const runKey = `${STORAGE_PREFIX_ANALYSIS_RUN}_${analysisId}`;
    const run = getStorageItem(runKey, null);
    if (run && run.fileFindingData) {
      Object.keys(run.fileFindingData).forEach((file) => {
        const item = run.fileFindingData[file];
        if (!item) return;

        const list = Array.isArray(item.findings) && item.findings.length > 0
          ? item.findings
          : (item.finding ? [item.finding] : []);

        const target = list.find((f) => f.id === findingId || f.findingId === findingId);
        if (target) {
          target.status = status;
        }

        const hasOpen = list.some((f) => f.status !== 'RESOLVED');
        item.hasFinding = hasOpen;
      });
      setStorageItem(runKey, run);
    }
  }

  return { success: true, result };
}
