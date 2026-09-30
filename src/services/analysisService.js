/**
 * 분석 실행 및 결과 관리 비즈니스 로직 서비스
 * - 백엔드 연동 전: Mock Adapter & LocalStorage 기반 실시간 시뮬레이션
 * - 백엔드 연동 후: analysisApi / findingApi를 통해 실제 Spring Boot 서버와 통신 (VITE_USE_MOCK=false)
 */

import { analysisApi } from '../api/analysisApi.js';
import { findingApi } from '../api/findingApi.js';
import {
  normalizeProjectId,
  PROJECTS_DATA,
  getProjectTreeData,
  getProjectFileFindingData,
  getProjectDefaultFile,
  getProjectFilePath,
  calculateDynamicFindingTotals,
  calculateDynamicTypeTabs,
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

/**
 * 1. 취약점 분석 실행
 * 코드 분석 페이지에서 사용자가 설정한 범위와 탐지 룰을 기반으로 분석을 실행하고 결과를 생성/저장합니다.
 *
 * @param {Object} params
 * @param {string} params.projectId - 프로젝트 ID (payments-api, auth-service, admin-console)
 * @param {string} params.title - 분석 제목
 * @param {string} params.scope - '현재 파일' | '전체 프로젝트'
 * @param {string} params.selectedFile - 현재 선택된 파일명 (예: users.ts)
 * @param {Array} params.rules - 탐지 룰 목록 [{ id: 'SQL_INJECTION', checked: true }, ...]
 * @param {Object} params.fileContents - 파일별 코드 라인 배열 맵
 * @param {Array} params.treeData - 현재 파일 트리 구조
 */
export async function executeAnalysis({
  projectId,
  title = '취약점 정기 분석',
  scope = '전체 프로젝트',
  selectedFile,
  rules = [],
  fileContents = {},
  treeData = null,
}) {
  const normProjectId = normalizeProjectId(projectId);
  const activeRules = rules.filter((r) => r.checked).map((r) => r.id);

  // 1) 백엔드 연동 API 호출 규격 (백엔드가 열리면 실제 요청으로 전송됨)
  const apiPayload = {
    title: title || `${normProjectId} 보안 분석`,
    files: Object.keys(fileContents).map((name) => ({
      relativePath: name,
      content: Array.isArray(fileContents[name])
        ? fileContents[name].join('\n')
        : String(fileContents[name] || ''),
    })),
    scanOptions: {
      detectSqlInjection: activeRules.includes('SQL_INJECTION'),
      detectHardcodedSecret: activeRules.includes('HARDCODED_SECRET'),
      detectXss: activeRules.includes('XSS'),
      scope,
      selectedFile,
    },
  };

  let backendAnalysisId = null;
  try {
    const apiRes = await analysisApi.createAnalysis(apiPayload);
    if (apiRes && apiRes.data && apiRes.data.analysisId) {
      backendAnalysisId = apiRes.data.analysisId;
    } else if (apiRes && apiRes.analysisId) {
      backendAnalysisId = apiRes.analysisId;
    }
  } catch (err) {
    console.warn('Backend API call fallback to mock generation:', err);
  }

  // 발급된 ID 또는 고유 ID 생성 (100번대 분석 ID)
  const analysisId = backendAnalysisId || Math.floor(100 + Math.random() * 899);

  // 2) 프로젝트 기본 데이터 스냅샷을 기반으로 이번 분석의 결과 생성
  const baseFileData = PROJECTS_DATA[normProjectId]?.fileFindingData || {};
  const generatedFileData = {};

  let totalFindingsCount = 0;

  Object.keys(baseFileData).forEach((fileName) => {
    const original = baseFileData[fileName];
    if (!original) return;

    // 딥카피 복제
    const item = JSON.parse(JSON.stringify(original));

    // 최신 파일 코드가 있으면 적용
    if (fileContents[fileName]) {
      item.codeLines = [...fileContents[fileName]];
    }

    // [규칙 1] 범위 필터: '현재 파일' 모드라면 선택된 파일이 아닌 파일의 취약점은 제외 (클린 처리)
    const isTargetFile = scope === '전체 프로젝트' || fileName === selectedFile;

    // [규칙 2] 룰 필터: 체크된 룰에 해당하는 취약점인지 검사
    const vulnType = item.finding?.vulnerabilityType;
    const isRuleActive = vulnType && activeRules.includes(vulnType);

    if (item.hasFinding && isTargetFile && isRuleActive) {
      item.hasFinding = true;
      totalFindingsCount++;
    } else {
      // 분석 대상이 아니거나 탐지 룰이 비활성화된 경우 클린 상태로 조정
      item.hasFinding = false;
      item.vulnLineIndices = [];
      item.tagLabel = '';
      item.finding = null;
      item.diff = null;
    }

    generatedFileData[fileName] = item;
  });

  // 3) 파일 트리에 분석 결과 인디케이터(●) 적용
  const baseTree = treeData || getProjectTreeData(normProjectId);
  const updateTreeWithFindings = (nodes) =>
    nodes.map((node) => {
      if (!node.isDir) {
        const fileInfo = generatedFileData[node.name];
        return {
          ...node,
          hasFinding: Boolean(fileInfo && fileInfo.hasFinding),
        };
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeWithFindings(node.children),
        };
      }
      return node;
    });

  const generatedTreeData = updateTreeWithFindings(JSON.parse(JSON.stringify(baseTree)));

  // 4) 집계 데이터 계산
  const totals = calculateDynamicFindingTotals(generatedFileData, []);
  const tabs = calculateDynamicTypeTabs(generatedFileData, []);

  // 5) 생성된 분석 런(Run) 객체 구성
  const analysisRun = {
    analysisId,
    projectId: normProjectId,
    title: title || `${normProjectId} 보안 분석`,
    scope,
    selectedFile: selectedFile || getProjectDefaultFile(normProjectId),
    activeRules,
    totalFindings: totalFindingsCount,
    totals,
    tabs,
    treeData: generatedTreeData,
    fileFindingData: generatedFileData,
    createdAt: new Date().toISOString(),
  };

  // 6) LocalStorage에 분석 런 및 최신 프로젝트 결과로 영구 보존
  setStorageItem(`${STORAGE_PREFIX_ANALYSIS_RUN}_${analysisId}`, analysisRun);
  setStorageItem(`${STORAGE_PREFIX_LATEST_ANALYSIS}_${normProjectId}`, analysisRun);

  return analysisRun;
}

/**
 * 2. 특정 분석 결과 조회
 * 분석 ID 또는 프로젝트명을 기반으로 저장된 분석 런 결과를 로드합니다.
 *
 * @param {string} projectId - 프로젝트 ID
 * @param {string|number} analysisId - 분석 ID (선택)
 */
export function getAnalysisResult(projectId, analysisId) {
  const normProjectId = normalizeProjectId(projectId);

  // 1) 명시적 analysisId가 주어진 경우 해당 분석 런 로드
  if (analysisId) {
    const runKey = `${STORAGE_PREFIX_ANALYSIS_RUN}_${analysisId}`;
    const run = getStorageItem(runKey, null);
    if (run) return run;
  }

  // 2) 해당 프로젝트의 최신 실행된 분석 런이 있는지 확인
  const latestKey = `${STORAGE_PREFIX_LATEST_ANALYSIS}_${normProjectId}`;
  const latestRun = getStorageItem(latestKey, null);
  if (latestRun) return latestRun;

  // 3) 아직 분석이 실행된 적 없다면 프로젝트 기본 Mock 데이터 반환
  const baseTree = getProjectTreeData(normProjectId);
  const baseFileData = getProjectFileFindingData(normProjectId);
  const totals = calculateDynamicFindingTotals(baseFileData, []);
  const tabs = calculateDynamicTypeTabs(baseFileData, []);

  return {
    analysisId: normProjectId === 'payments-api' ? 128 : normProjectId === 'auth-service' ? 127 : 126,
    projectId: normProjectId,
    title: `${normProjectId} 기본 분석 결과`,
    scope: '전체 프로젝트',
    selectedFile: getProjectDefaultFile(normProjectId),
    activeRules: ['SQL_INJECTION', 'HARDCODED_SECRET', 'XSS'],
    totalFindings: totals.total,
    totals,
    tabs,
    treeData: baseTree,
    fileFindingData: baseFileData,
    createdAt: new Date().toISOString(),
    isInitialDefault: true,
  };
}

/**
 * 3. 취약점 처리 상태 변경 (해결/무시)
 * 백엔드 REST API 규격에 따라 상태 변경을 요청하고 로컬 분석 결과에 동기화합니다.
 */
export async function updateFindingStatusOnAnalysis({
  projectId,
  analysisId,
  findingId,
  status = 'RESOLVED',
}) {
  // 백엔드 연동 API 호출
  try {
    await findingApi.updateFindingStatus(findingId, status);
  } catch (e) {
    console.warn('Backend updateFindingStatus call fallback to mock:', e);
  }

  // 로컬 스토리지 데이터 동기화
  if (analysisId) {
    const runKey = `${STORAGE_PREFIX_ANALYSIS_RUN}_${analysisId}`;
    const run = getStorageItem(runKey, null);
    if (run && run.fileFindingData) {
      Object.keys(run.fileFindingData).forEach((file) => {
        if (run.fileFindingData[file]?.finding?.id === findingId) {
          run.fileFindingData[file].finding.status = status;
          if (status === 'RESOLVED') {
            run.fileFindingData[file].hasFinding = false;
          }
        }
      });
      setStorageItem(runKey, run);
    }
  }

  return { success: true };
}
