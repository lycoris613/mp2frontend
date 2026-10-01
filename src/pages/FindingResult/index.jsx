import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import FileTree from '../../components/common/FileTree';
import CodeViewer from '../../components/common/CodeViewer';
import VulnerabilityTypeTabs from './components/VulnerabilityTypeTabs';
import SeveritySummary from './components/SeveritySummary';
import FindingDetailPanel from './components/FindingDetailPanel';
import CodeDiffPanel from './components/CodeDiffPanel';
import {
  normalizeProjectId,
  getProjectTreeData,
  getProjectFileFindingData,
  getProjectDefaultFile,
  getProjectFilePath,
  resetProjectFindingData,
  calculateDynamicFindingTotals,
  calculateDynamicTypeTabs,
} from '../../data/findingData';
import {
  getAnalysisResult,
  updateFindingStatusOnAnalysis,
} from '../../services/analysisService';
import { PAGES } from '../../constants/navigation';
import { AlertCircle, ArrowRight, RotateCcw, CheckCircle, ShieldAlert, Layers } from 'lucide-react';

const STORAGE_PREFIX_RESOLVED = 'codeguard_resolved_finding_ids';
const STORAGE_PREFIX_SAVED_CODES = 'codeguard_saved_file_codes';
const STORAGE_PREFIX_TREE = 'codeguard_finding_tree_data';

const getStorageKey = (prefix, id) => `${prefix}_${id || 'default'}`;

const loadStorage = (key, fallback) => {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error('Failed to load from localStorage', e);
    return fallback;
  }
};

const loadStorageWithFallback = (prefix, storageId, fallback) => {
  const specificKey = getStorageKey(prefix, storageId);
  const data = loadStorage(specificKey, null);
  if (data !== null) return data;

  // 기본 프로젝트(payments-api)인 경우 이전 전역 키도 확인 (하위 호환성 유지)
  if (storageId === 'payments-api' || storageId === '128' || !storageId) {
    const legacyData = loadStorage(prefix, null);
    if (legacyData !== null) return legacyData;
  }
  return fallback;
};

const saveStorage = (key, value) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
};

const removeStorage = (key) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to remove from localStorage', e);
  }
};

/**
 * [SCR-003] 취약점 분석 결과 화면
 * image/결과화면.png 와이어프레임 최신본 준수
 * - 코드 분석(SCR-002) 실행 시 설정한 범위(현재 파일 / 전체 프로젝트) 및 선택 룰셋 반영
 * - 프로젝트 및 분석 실행(Analysis Run)별 독립된 코드 파일 저장 및 취약점 해결 상태 격리
 * - 백엔드 연동을 고려한 analysisService 및 REST API 명세 파이프라인
 */
export default function FindingResultPage({
  currentUser,
  onLogin,
  onLogout,
  setPage,
  projectId = 'payments-api',
  analysisId = 128,
  projectTitle = 'payments-api',
}) {
  const location = useLocation();
  const routeParams = useParams();

  // 1) URL 쿼리 파라미터 및 라우트 파라미터 추출
  const searchParams = new URLSearchParams(location.search);
  const queryProject =
    searchParams.get('project') ||
    searchParams.get('projectId') ||
    routeParams.projectId;
  const activeAnalysisId =
    searchParams.get('analysisId') ||
    routeParams.analysisId ||
    analysisId;

  const currentProjectId = normalizeProjectId(queryProject || projectId || 'payments-api');
  const displayProjectName = currentProjectId;

  // 2) 현재 분석 런(Run) 결과 로드 (사용자가 코드 분석에서 실행한 조건이 반영된 결과 객체)
  const [currentAnalysisRun, setCurrentAnalysisRun] = useState(() =>
    getAnalysisResult(currentProjectId, activeAnalysisId)
  );

  const currentFileFindingData = currentAnalysisRun?.fileFindingData || getProjectFileFindingData(currentProjectId);

  // 기본 선택 파일 결정 (현재 파일 분석 모드였다면 해당 파일 우선)
  const defaultFileForProject =
    (currentAnalysisRun?.scope === '현재 파일' && currentAnalysisRun?.selectedFile) ||
    getProjectDefaultFile(currentProjectId);

  const [selectedFile, setSelectedFile] = useState(defaultFileForProject);
  const [activeTab, setActiveTab] = useState('ALL'); // 기본값: 'ALL' (전체)
  const [activeFindingId, setActiveFindingId] = useState(null); // 한 파일 내 다중 취약점 중 포커스된 ID
  const [codeScope, setCodeScope] = useState('finding'); // 'finding' | 'full'
  const [showNoAnalysisModal, setShowNoAnalysisModal] = useState(false);
  const [unAnalyzedFileName, setUnAnalyzedFileName] = useState('');
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  // 스토리지 격리 키: project와 analysisId 결합
  const currentStorageScopeId = `${currentProjectId}_${currentAnalysisRun?.analysisId || activeAnalysisId || 'default'}`;

  // 해결 완료된 취약점 ID 목록 (현재 분석 런 격리 로드)
  const [resolvedFindingIds, setResolvedFindingIds] = useState(() =>
    loadStorageWithFallback(STORAGE_PREFIX_RESOLVED, currentStorageScopeId, [])
  );

  // 파일별 수정 및 저장된 코드 상태 (현재 분석 런 격리 로드 및 원본 동기화)
  const [savedFileCodes, setSavedFileCodes] = useState(() => {
    const saved = loadStorageWithFallback(STORAGE_PREFIX_SAVED_CODES, currentStorageScopeId, {});
    Object.keys(saved).forEach((fileName) => {
      if (currentFileFindingData[fileName]) {
        currentFileFindingData[fileName].codeLines = saved[fileName];
      }
    });
    return saved;
  });

  // 파일 트리 상태 (현재 분석 런 격리 로드)
  const [treeData, setTreeData] = useState(() => {
    const savedTree = loadStorageWithFallback(STORAGE_PREFIX_TREE, currentStorageScopeId, null);
    if (savedTree) return savedTree;

    const baseTree = currentAnalysisRun?.treeData || getProjectTreeData(currentProjectId);
    const initialResolved = loadStorageWithFallback(STORAGE_PREFIX_RESOLVED, currentStorageScopeId, []);
    if (initialResolved.length > 0) {
      const updateNodes = (nodes) =>
        nodes.map((node) => {
          if (!node.isDir) {
            const data = currentFileFindingData[node.name];
            const list = Array.isArray(data?.findings) && data.findings.length > 0
              ? data.findings
              : (data?.finding ? [data.finding] : []);
            const isAllResolved = list.length > 0 && list.every((f) => initialResolved.includes(f.id));
            if (data?.hasFinding && isAllResolved) {
              return { ...node, hasFinding: false };
            }
          }
          if (node.children) {
            return { ...node, children: updateNodes(node.children) };
          }
          return node;
        });
      return updateNodes(baseTree);
    }
    return baseTree;
  });

  // 프로젝트 또는 analysisId 변경 시 해당 분석 런 데이터 동기화
  useEffect(() => {
    const run = getAnalysisResult(currentProjectId, activeAnalysisId);
    setCurrentAnalysisRun(run);

    const fileData = run.fileFindingData || getProjectFileFindingData(currentProjectId);
    const defaultFile =
      (run.scope === '현재 파일' && run.selectedFile) ||
      getProjectDefaultFile(currentProjectId);

    setSelectedFile(defaultFile);
    setActiveTab('ALL');
    setActiveFindingId(null);
    setShowNoAnalysisModal(false);

    const storageScope = `${currentProjectId}_${run.analysisId || activeAnalysisId || 'default'}`;

    const loadedResolved = loadStorageWithFallback(STORAGE_PREFIX_RESOLVED, storageScope, []);
    setResolvedFindingIds(loadedResolved);

    // 저장 코드 동기화
    const loadedSavedCodes = loadStorageWithFallback(STORAGE_PREFIX_SAVED_CODES, storageScope, {});
    Object.keys(loadedSavedCodes).forEach((fileName) => {
      if (fileData[fileName]) {
        fileData[fileName].codeLines = loadedSavedCodes[fileName];
      }
    });
    setSavedFileCodes(loadedSavedCodes);

    const loadedTree = loadStorageWithFallback(STORAGE_PREFIX_TREE, storageScope, null);
    if (loadedTree) {
      setTreeData(loadedTree);
    } else {
      const baseTree = run.treeData || getProjectTreeData(currentProjectId);
      const updateNodes = (nodes) =>
        nodes.map((node) => {
          if (!node.isDir) {
            const data = fileData[node.name];
            const list = Array.isArray(data?.findings) && data.findings.length > 0
              ? data.findings
              : (data?.finding ? [data.finding] : []);
            const isAllResolved = list.length > 0 && list.every((f) => loadedResolved.includes(f.id));
            if (data?.hasFinding && isAllResolved) {
              return { ...node, hasFinding: false };
            }
          }
          if (node.children) {
            return { ...node, children: updateNodes(node.children) };
          }
          return node;
        });
      setTreeData(updateNodes(baseTree));
    }
  }, [currentProjectId, activeAnalysisId]);

  // 상단 취약점 유형 탭 변경 핸들러 (해당 취약점 파일 및 취약점 항목으로 스마트 포커스)
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'ALL') {
      // 1) 현재 파일에서 해당 타입 취약점 찾기
      const currentItem = currentFileFindingData[selectedFile];
      const currentFindings = Array.isArray(currentItem?.findings) && currentItem.findings.length > 0
        ? currentItem.findings
        : (currentItem?.finding ? [currentItem.finding] : []);

      const matchedInCurrent = currentFindings.find(
        (f) => f.vulnerabilityType === tabId && !resolvedFindingIds.includes(f.id)
      );

      if (matchedInCurrent) {
        setActiveFindingId(matchedInCurrent.id);
        return;
      }

      // 2) 다른 파일에서 해당 타입 취약점 찾기
      const matchedFile = Object.keys(currentFileFindingData).find((fileName) => {
        const item = currentFileFindingData[fileName];
        if (!item?.hasFinding) return false;
        const list = Array.isArray(item.findings) && item.findings.length > 0
          ? item.findings
          : (item.finding ? [item.finding] : []);
        return list.some(
          (f) => f.vulnerabilityType === tabId && !resolvedFindingIds.includes(f.id)
        );
      });
      if (matchedFile && matchedFile !== selectedFile) {
        setSelectedFile(matchedFile);
        setActiveFindingId(null);
      }
    }
  };

  // 초기 상태 원상 복구 토스트 알림 상태
  const [showResetToast, setShowResetToast] = useState(false);

  // 현재 프로젝트 및 분석의 코드/취약점 정보를 최초 상태로 원상 복구하여 저장
  const handleResetAllToInitial = () => {
    const { treeData: restoredTree, defaultFile, fileFindingData: restoredData } = resetProjectFindingData(currentProjectId);
    setSavedFileCodes({});
    setResolvedFindingIds([]);
    setTreeData(restoredTree);
    setSelectedFile(defaultFile);
    setActiveTab('ALL');
    setActiveFindingId(null);
    setCodeScope('finding');

    // 1) React state인 currentAnalysisRun 불변 객체로 갱신하여 즉각적인 리렌더링 보장
    if (currentAnalysisRun && restoredData) {
      const nextAnalysisRun = {
        ...currentAnalysisRun,
        fileFindingData: JSON.parse(JSON.stringify(restoredData)),
        treeData: JSON.parse(JSON.stringify(restoredTree)),
      };
      setCurrentAnalysisRun(nextAnalysisRun);
    }

    // 2) currentFileFindingData 맵 원본 복원
    if (currentFileFindingData && restoredData) {
      Object.keys(currentFileFindingData).forEach((key) => {
        delete currentFileFindingData[key];
      });
      Object.assign(currentFileFindingData, JSON.parse(JSON.stringify(restoredData)));
    }

    // 3) 현재 분석 런의 localStorage 데이터 격리 초기화
    removeStorage(getStorageKey(STORAGE_PREFIX_RESOLVED, currentStorageScopeId));
    removeStorage(getStorageKey(STORAGE_PREFIX_SAVED_CODES, currentStorageScopeId));
    removeStorage(getStorageKey(STORAGE_PREFIX_TREE, currentStorageScopeId));

    // 기본 프로젝트 키도 함께 정리
    removeStorage(getStorageKey(STORAGE_PREFIX_RESOLVED, currentProjectId));
    removeStorage(getStorageKey(STORAGE_PREFIX_SAVED_CODES, currentProjectId));
    removeStorage(getStorageKey(STORAGE_PREFIX_TREE, currentProjectId));
    if (currentProjectId === 'payments-api') {
      removeStorage(STORAGE_PREFIX_RESOLVED);
      removeStorage(STORAGE_PREFIX_SAVED_CODES);
      removeStorage(STORAGE_PREFIX_TREE);
    }

    // 4) analysisService의 분석 런 캐시도 초기화하여 원본과 일치시킴
    removeStorage(`codeguard_analysis_run_${currentAnalysisRun?.analysisId || activeAnalysisId || 128}`);
    removeStorage(`codeguard_latest_analysis_${currentProjectId}`);

    setShowResetToast(true);
    setTimeout(() => {
      setShowResetToast(false);
    }, 3000);
  };

  // 파일 선택 처리
  const handleFileSelect = (fileName) => {
    setSelectedFile(fileName);
    setActiveFindingId(null);
    const data = currentFileFindingData[fileName];
    if (!data || !data.hasFinding) {
      setUnAnalyzedFileName(fileName);
      setShowNoAnalysisModal(true);
    }
  };

  const handleGoToAnalysis = () => {
    setShowNoAnalysisModal(false);
    if (typeof setPage === 'function') {
      setPage(PAGES.ANALYZE);
    } else {
      const buttons = Array.from(document.querySelectorAll('nav button'));
      const analyzeBtn = buttons.find((btn) => btn.textContent?.includes('코드 분석'));
      analyzeBtn?.click();
    }
  };

  // 현재 파일 데이터
  const baseData = currentFileFindingData[selectedFile] || {
    hasFinding: false,
    codeLines: [`// ${selectedFile} 내용이 없습니다.`],
    vulnLineIndices: [],
    tagLabel: '',
    finding: null,
    diff: null,
  };

  // 1) 현재 파일의 모든 취약점 목록 (baseData.vulnLineIndices 및 diff 상속 보장)
  const allFileFindings = Array.isArray(baseData.findings) && baseData.findings.length > 0
    ? baseData.findings.map((f) => ({
        ...f,
        vulnLineIndices:
          (f.vulnLineIndices && f.vulnLineIndices.length > 0)
            ? f.vulnLineIndices
            : (f.line ? [f.line - 1] : baseData.vulnLineIndices || []),
      }))
    : (baseData.finding
        ? [{
            ...baseData.finding,
            vulnLineIndices:
              (baseData.finding.vulnLineIndices && baseData.finding.vulnLineIndices.length > 0)
                ? baseData.finding.vulnLineIndices
                : (baseData.vulnLineIndices && baseData.vulnLineIndices.length > 0)
                ? baseData.vulnLineIndices
                : (baseData.finding.line ? [baseData.finding.line - 1] : [3]),
            diff: baseData.finding.diff || baseData.diff,
          }]
        : []);

  // 2) 현재 선택된 유형 탭(activeTab)에 해당하는 취약점 목록
  const visibleFindings = allFileFindings.filter(
    (f) => activeTab === 'ALL' || f.vulnerabilityType === activeTab
  );

  // 3) 현재 포커스된 취약점 결정 (activeFindingId 우선, 미해결 취약점 우선, 없으면 첫 번째)
  const selectedFinding =
    (activeFindingId && allFileFindings.find((f) => f.id === activeFindingId)) ||
    visibleFindings.find((f) => !resolvedFindingIds.includes(f.id)) ||
    visibleFindings[0] ||
    allFileFindings[0] ||
    null;

  const isCurrentResolved = selectedFinding && resolvedFindingIds.includes(selectedFinding.id);

  // 현재 표시할 코드 본문 (저장된 코드가 있으면 우선 사용)
  const currentCodeLines = savedFileCodes[selectedFile] || baseData.codeLines;

  /**
   * 코드 내용과 취약점 diff/matchedCode를 기반으로 현재 코드 라인 상의 정확한 취약점 라인 인덱스(0-based)를 동적으로 탐색
   * @param {Object} finding - 취약점 객체
   * @param {string[]} codeLines - 현재 표시 중인 코드 라인 배열
   * @param {number[]} resolvedIds - 해결 완료된 취약점 ID 목록
   * @returns {number[]} 0-based 라인 인덱스 배열
   */
  const getDynamicFindingLines = (finding, codeLines, resolvedIds) => {
    if (!finding || !Array.isArray(codeLines) || codeLines.length === 0) return [];

    // 이미 해결된 취약점은 하이라이트할 라인이 없음 (빈 배열 반환하여 하이라이트 즉각 해제)
    if (resolvedIds.includes(finding.id)) return [];

    const diff = finding.diff || baseData.diff;
    const originalVulnIndices = Array.isArray(finding.vulnLineIndices) && finding.vulnLineIndices.length > 0
      ? finding.vulnLineIndices
      : (finding.line ? [finding.line - 1] : []);

    // 1) diff.beforeLines가 존재하는 경우: 실제 코드 본문에서 beforeLines 위치 동적 탐색
    if (diff && Array.isArray(diff.beforeLines) && diff.beforeLines.length > 0) {
      const firstBeforeLine = diff.beforeLines[0].trim();
      let matchIdx = -1;

      for (let i = 0; i < codeLines.length; i++) {
        if (codeLines[i].trim() === firstBeforeLine) {
          if (diff.beforeLines.length > 1 && i + 1 < codeLines.length) {
            if (codeLines[i + 1].trim() === diff.beforeLines[1].trim()) {
              matchIdx = i;
              break;
            }
          } else {
            matchIdx = i;
            break;
          }
        }
      }

      if (matchIdx !== -1) {
        // 원래 diff 시작 라인 대비 취약점 라인들의 상대적 오프셋 계산
        const baseStartLineIdx = Math.max(0, (diff.startLine || finding.line || 1) - 1);
        const relativeOffsets = originalVulnIndices.length > 0
          ? originalVulnIndices.map((idx) => Math.max(0, idx - baseStartLineIdx))
          : [0];

        // 동적으로 이동된 위치에 상대 오프셋을 적용하여 현재 코드 라인 인덱스 생성
        return relativeOffsets
          .map((offset) => matchIdx + offset)
          .filter((idx) => idx < codeLines.length);
      } else {
        // beforeLines가 코드에 존재하지 않는다면 이미 수정되어 해결된 것으로 간주
        return [];
      }
    }

    // 2) detectionSource.matchedCode가 존재하는 경우
    if (finding.detectionSource?.matchedCode) {
      const targetText = finding.detectionSource.matchedCode.trim();
      const foundIdx = codeLines.findIndex((line) => line.trim() === targetText || line.includes(targetText));
      if (foundIdx !== -1) {
        return [foundIdx];
      }
    }

    // 3) 폴백: 현재 코드가 기본 코드와 동일한 구조인 경우에만 원래의 vulnLineIndices 사용
    if (originalVulnIndices.length > 0 && originalVulnIndices.every((idx) => idx < codeLines.length)) {
      return originalVulnIndices;
    }

    return [];
  };

  // 4) 현재 표시할 취약 라인 목록 (라디오/토글: '이 취약점만' vs '전체 코드' 하이라이트 연동)
  const allUnresolvedFindings = allFileFindings.filter((f) => !resolvedFindingIds.includes(f.id));
  const activeUnresolvedFindings = visibleFindings.filter((f) => !resolvedFindingIds.includes(f.id));

  // 현재 코드 본문 기준 동적 취약점 라인 계산 헬퍼
  const getLinesForFinding = (f) => getDynamicFindingLines(f, currentCodeLines, resolvedFindingIds);

  // 상단 탭이 '전체'(activeTab === 'ALL')이거나 우측 토글이 '전체 코드'(codeScope === 'full')인 경우:
  // '이 취약점만'이 눌려 있어도 전체 취약점 라인들을 모두 하이라이트 상태로 유지!
  const isAllMode = activeTab === 'ALL' || codeScope === 'full';
  const currentVulnLines = isAllMode
    ? allUnresolvedFindings.flatMap((f) => getLinesForFinding(f))
    : activeUnresolvedFindings.flatMap((f) => getLinesForFinding(f));

  // 각 취약점별 라인 블럭 목록 (2줄 이상인 취약점도 한 블럭으로 묶임)
  const currentVulnBlocks = isAllMode
    ? allUnresolvedFindings.map((f) => getLinesForFinding(f)).filter((lines) => lines.length > 0)
    : activeUnresolvedFindings.map((f) => getLinesForFinding(f)).filter((lines) => lines.length > 0);

  // 그 중 현재 선택된 취약점(첫 번째 또는 클릭하여 선택한 취약점)은 더 진한 하이라이트(activeVulnIndices)로 선택 상태 표시!
  // 취약점이 2줄 이상인 경우(예: SQLI 라인 8-10 3줄, XSS 라인 26-27 2줄) 모든 해당 라인이 단일 블럭으로 진하게 하이라이트됨!
  // 단, 취약점이 이미 해결되었거나 currentVulnLines에 포함되어 있지 않은 경우 빈 배열로 처리하여 하이라이트 완전 해제!
  const selectedFindingLines = selectedFinding && !isCurrentResolved
    ? getLinesForFinding(selectedFinding)
    : [];

  const activeVulnIndices = selectedFindingLines.filter((idx) => currentVulnLines.includes(idx));
  const activeVulnIndex = activeVulnIndices.length > 0 ? activeVulnIndices[0] : null;

  // 5) 태그 라벨
  const currentTagLabel =
    codeScope === 'full'
      ? (allUnresolvedFindings.length > 0
          ? `${allUnresolvedFindings.length}개 보안 취약점 전체 탐지됨 (전체 코드 모드)`
          : '✓ 모든 취약점 해결 완료')
      : (selectedFinding
          ? (isCurrentResolved
              ? `✓ L${selectedFinding.line || ''} ${selectedFinding.title} 해결 완료`
              : selectedFinding.tagLabel || `${selectedFinding.title} · ${selectedFinding.severityBadge}`)
          : (allFileFindings.length > 0 && allFileFindings.every((f) => resolvedFindingIds.includes(f.id))
              ? '✓ 모든 보안 조치 완료 (안전한 코드로 수정됨)'
              : ''));

  // 6) 활성 Diff 객체
  const activeDiff = selectedFinding?.diff || baseData.diff;

  // 7) hasActiveFinding (상세 패널 & diff 노출 조건)
  const hasActiveFinding = Boolean(baseData.hasFinding && visibleFindings.length > 0 && selectedFinding);

  // 취약점 해결 클릭 핸들러 (after 코드 치환 및 프로젝트별 영구 저장)
  // scope: 'full' (전체 해결) vs 'finding' (이 취약점만 해결)
  const handleResolve = async (findingId, scope = codeScope) => {
    let patchedLines = [];
    let resolvingIds = [];

    if (scope === 'full') {
      // 1) 전체 범위: 해당 파일 내 모든 미해결 취약점을 일괄 해결
      resolvingIds = allFileFindings.map((f) => f.id);

      // 전체 보안 패치가 완료된 코드가 정의되어 있으면 우선 적용
      if (baseData.diff?.fullCleanCodeLines || selectedFinding?.diff?.fullCleanCodeLines) {
        patchedLines = [...(baseData.diff?.fullCleanCodeLines || selectedFinding?.diff?.fullCleanCodeLines)];
      } else {
        // fullCleanCodeLines가 없는 경우 각 취약점의 diff를 역순(startLine 내림차순)으로 누적 치환
        let accumulated = [...currentCodeLines];
        const sortedFindings = [...allFileFindings]
          .filter((f) => (f.diff || baseData.diff)?.startLine)
          .sort((a, b) => ((b.diff || baseData.diff).startLine || 0) - ((a.diff || baseData.diff).startLine || 0));

        sortedFindings.forEach((f) => {
          const d = f.diff || baseData.diff;
          if (d && d.afterLines) {
            const sIdx = Math.max(0, (d.startLine || 1) - 1);
            const delCount = d.beforeLines ? d.beforeLines.length : 1;
            accumulated.splice(sIdx, delCount, ...d.afterLines);
          }
        });
        patchedLines = accumulated;
      }
    } else {
      // 2) 이 취약점만 범위: 현재 선택된(진하게 강조된) 취약점 1건만 단독 정밀 치환
      resolvingIds = [findingId];
      const targetFinding = allFileFindings.find((f) => f.id === findingId) || selectedFinding;
      const diff = targetFinding?.diff || baseData.diff;
      if (diff && diff.afterLines) {
        const original = [...currentCodeLines];
        let startIdx = -1;
        if (diff.beforeLines && diff.beforeLines.length > 0) {
          const targetLineText = diff.beforeLines[0].trim();
          for (let i = 0; i < original.length; i++) {
            if (original[i].trim() === targetLineText) {
              if (diff.beforeLines.length > 1 && i + 1 < original.length) {
                if (original[i + 1].trim() === diff.beforeLines[1].trim()) {
                  startIdx = i;
                  break;
                }
              } else {
                startIdx = i;
                break;
              }
            }
          }
        }
        if (startIdx === -1) {
          startIdx = Math.max(0, (diff.startLine || 1) - 1);
        }
        const deleteCount = diff.beforeLines ? diff.beforeLines.length : 1;
        original.splice(startIdx, deleteCount, ...diff.afterLines);
        patchedLines = original;
      } else {
        patchedLines = [...currentCodeLines];
      }

      // 해결 후 남아있는 다음 미해결 취약점으로 선택 자동 이동
      const remainingUnresolved = allFileFindings.filter(
        (f) => f.id !== findingId && !resolvedFindingIds.includes(f.id)
      );
      if (remainingUnresolved.length > 0) {
        setActiveFindingId(remainingUnresolved[0].id);
      }
    }

    // 1) 파일에 저장 (메모리 상태, 원본 객체, localStorage 영구 보존)
    const nextSavedCodes = {
      ...savedFileCodes,
      [selectedFile]: patchedLines,
    };
    setSavedFileCodes(nextSavedCodes);
    currentFileFindingData[selectedFile].codeLines = patchedLines;
    saveStorage(getStorageKey(STORAGE_PREFIX_SAVED_CODES, currentStorageScopeId), nextSavedCodes);

    // 2) 해결 상태 등록 (메모리 상태 & localStorage 영구 보존)
    const nextResolvedIds = [...new Set([...resolvedFindingIds, ...resolvingIds])];
    setResolvedFindingIds(nextResolvedIds);
    saveStorage(getStorageKey(STORAGE_PREFIX_RESOLVED, currentStorageScopeId), nextResolvedIds);

    // 3) 파일 트리에서 해당 파일의 모든 취약점이 해결되었는지 확인
    const isFileFullyResolved = allFileFindings.every((f) => nextResolvedIds.includes(f.id));
    if (isFileFullyResolved) {
      const updateNodes = (nodes) =>
        nodes.map((node) => {
          if (!node.isDir && node.name === selectedFile) {
            return { ...node, hasFinding: false };
          }
          if (node.children) {
            return { ...node, children: updateNodes(node.children) };
          }
          return node;
        });
      const nextTree = updateNodes(treeData);
      setTreeData(nextTree);
      saveStorage(getStorageKey(STORAGE_PREFIX_TREE, currentStorageScopeId), nextTree);
    }

    // 4) 백엔드 연동 규격 API 및 분석 런 동기화
    for (const rId of resolvingIds) {
      await updateFindingStatusOnAnalysis({
        projectId: currentProjectId,
        analysisId: currentAnalysisRun?.analysisId,
        findingId: rId,
        status: 'RESOLVED',
      });
    }
  };

  // 실제 등록된 취약점 기반 동적 카운트 계산
  const dynamicTabs = calculateDynamicTypeTabs(currentFileFindingData, resolvedFindingIds);
  const dynamicTotals = calculateDynamicFindingTotals(currentFileFindingData, resolvedFindingIds);

  // 상단 헤더 경로 및 분석 런 정보 표기
  const analysisTitleText = currentAnalysisRun?.title || `${currentProjectId} 분석 결과`;
  const analysisMetaBadge = currentAnalysisRun?.analysisId
    ? `[분석 #${currentAnalysisRun.analysisId} · ${currentAnalysisRun.scope || '전체 프로젝트'}]`
    : '';
  const headerSubtitle = `${getProjectFilePath(currentProjectId, selectedFile)} ${analysisMetaBadge}`;

  // 현재 취약점 상세 객체 (해결 상태 동기화)
  const currentFindingObj = selectedFinding
    ? {
        ...selectedFinding,
        status: isCurrentResolved ? 'RESOLVED' : 'OPEN',
      }
    : null;

  return (
    <main className="content">
      {/* 상단 헤더 */}
      <PageHeader
        title="취약점 분석 결과"
        subtitle={headerSubtitle}
        currentUser={currentUser}
        onLogin={onLogin}
        onLogout={onLogout}
        extraAction={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="outline-btn reset-btn"
              onClick={handleResetAllToInitial}
              title="이 프로젝트의 모든 파일 코드를 취약점이 포함된 원래 상태로 되돌리고 저장합니다"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: '#f59e0b',
                color: '#f59e0b',
                fontWeight: 600,
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} />
              <span>취약점 코드 원상 복구</span>
            </button>
          </div>
        }
      />

      {/* 분석 실행 정보 알림 바 (현재 파일만 분석한 경우 또는 특정 룰만 검사한 경우 안내) */}
      {currentAnalysisRun && !currentAnalysisRun.isInitialDefault && (
        <div
          style={{
            margin: '0 24px 12px 24px',
            padding: '8px 16px',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={14} color="#38bdf8" />
            <span>
              최근 실행된 분석: <strong style={{ color: '#38bdf8' }}>{analysisTitleText}</strong> (ID: #{currentAnalysisRun.analysisId})
            </span>
            <span style={{ color: '#64748b' }}>|</span>
            <span>
              분석 범위: <strong style={{ color: '#f1f5f9' }}>{currentAnalysisRun.scope}</strong>
              {currentAnalysisRun.scope === '현재 파일' && ` (${currentAnalysisRun.selectedFile})`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={13} />
            <span>탐지 룰: {currentAnalysisRun.activeRules?.join(', ') || '전체'}</span>
          </div>
        </div>
      )}

      <div className="page-pad result-page">
        {/* 실제 취약점 개수가 반영된 필터 탭 & 심각도 요약 바 */}
        <div className="filter-summary-row">
          <VulnerabilityTypeTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            tabs={dynamicTabs}
          />
        </div>

        {/* 상단 메인 그리드 */}
        <div
          className={`result-grid-3col ${
            !hasActiveFinding ? 'no-finding' : ''
          } ${isTreeCollapsed ? 'tree-collapsed' : ''}`}
        >
          {/* 좌측: 파일 트리 (범위 상관없이 취약점이 있는 모든 파일에 빨간 점 표시) */}
          <FileTree
            items={treeData}
            activeFile={selectedFile}
            onSelect={handleFileSelect}
            showFindingDot={true}
            className="filetree result-tree"
            rootLabel={`탐색기 · ${displayProjectName.toUpperCase()}`}
            isCollapsed={isTreeCollapsed}
            onToggleCollapse={setIsTreeCollapsed}
          />

          {/* 중앙: 파일별 코드 뷰어 (해결 시 after 코드로 치환 표시) */}
          <CodeViewer
            fileName={selectedFile}
            codeLines={currentCodeLines}
            vulnLineIndices={currentVulnLines}
            vulnBlocks={currentVulnBlocks}
            activeVulnIndex={activeVulnIndex}
            activeVulnIndices={activeVulnIndices}
            onLineClick={(lineIdx) => {
              const matched = allFileFindings.find((f) => {
                const lines = getLinesForFinding(f);
                return lines.includes(lineIdx);
              });
              if (matched) {
                setActiveFindingId(matched.id);
              }
            }}
            tagLabel={currentTagLabel}
            className="editor result-editor"
          />

          {/* 우측: 취약점 상세 정보 & AI 분석 패널 */}
          {hasActiveFinding && (
            <FindingDetailPanel
              finding={currentFindingObj}
              scope={codeScope}
              onScopeChange={setCodeScope}
              onResolve={(id, scope) => handleResolve(id, scope)}
            />
          )}
        </div>

        {/* 하단: BEFORE / AFTER Diff 비교 패널 */}
        {hasActiveFinding && activeDiff && (
          <CodeDiffPanel
            fileName={selectedFile}
            startLine={activeDiff.startLine}
            beforeLines={activeDiff.beforeLines}
            afterLines={activeDiff.afterLines}
          />
        )}
      </div>

      {/* 분석 결과 없음 안내 팝업 모달 */}
      {showNoAnalysisModal && (
        <div className="modal-backdrop" onClick={() => setShowNoAnalysisModal(false)}>
          <div
            className="no-analysis-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="no-analysis-title"
          >
            <div className="no-analysis-header">
              <div className="no-analysis-title-group">
                <AlertCircle size={22} className="warning-icon" />
                <h4 id="no-analysis-title">먼저 코드 분석부터 해주세요</h4>
              </div>
            </div>

            <div className="no-analysis-body">
              <p className="no-analysis-desc">
                선택하신 <span className="highlight-file">{unAnalyzedFileName || selectedFile}</span> 파일은
                이번 분석 범위({currentAnalysisRun?.scope || '설정'})에서 취약점이 탐지되지 않았거나 분석 결과가 존재하지 않습니다.
              </p>
              <p className="no-analysis-sub">
                해당 파일의 취약점을 검사하시려면, <strong>코드 분석</strong> 페이지에서
                해당 파일을 선택하거나 <strong>전체 프로젝트</strong> 범위로 다시 분석을 실행해 주세요.
              </p>
            </div>

            <div className="no-analysis-footer">
              <button
                type="button"
                className="dark-btn"
                onClick={() => setShowNoAnalysisModal(false)}
              >
                확인
              </button>
              <button
                type="button"
                className="outline-btn"
                onClick={handleGoToAnalysis}
              >
                코드 분석하러 가기 <ArrowRight size={13} style={{ marginLeft: 4 }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 원상 복구 완료 토스트 안내 */}
      {showResetToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #38bdf8',
            borderRadius: '8px',
            padding: '14px 20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            zIndex: 9999,
          }}
        >
          <CheckCircle size={18} color="#38bdf8" />
          <div>
            <strong style={{ display: 'block', color: '#38bdf8', marginBottom: '2px' }}>원상 복구 완료</strong>
            <span>{currentProjectId} 프로젝트의 모든 파일 소스코드와 취약점이 초기 상태로 복구되어 저장되었습니다.</span>
          </div>
        </div>
      )}
    </main>
  );
}
