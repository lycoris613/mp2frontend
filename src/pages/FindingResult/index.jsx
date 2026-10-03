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
  PROJECTS_DATA,
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
import {
  readFromLocalCode,
  writeToLocalCode,
  batchWriteToLocalCode,
  getLocalCodeBaseDir,
} from '../../services/localCodeSyncService';
import LocalPathConfigModal from '../../components/common/LocalPathConfigModal';
import { insertNodeIntoTreeHierarchy } from '../../utils/fileTreeHelper';
import { PAGES } from '../../constants/navigation';
import { scopedKey } from '../../utils/accountScope';
import { AlertCircle, ArrowRight, RotateCcw, CheckCircle, ShieldAlert, Layers, FolderSync, HardDrive, FolderCog } from 'lucide-react';

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
  if (!storageId) return loadStorage(prefix, fallback);

  // 1) storageId 전체 키 (예: payments-api_1)
  const specificKey = getStorageKey(prefix, storageId);
  const data = loadStorage(specificKey, null);
  if (data !== null) return data;

  // 2) _default 접미사 키 (예: payments-api_default)
  const projPrefix = storageId.includes('_') ? storageId.split('_')[0] : storageId;
  const defaultKey = `${prefix}_${projPrefix}_default`;
  const defaultData = loadStorage(defaultKey, null);
  if (defaultData !== null) return defaultData;

  // 3) 프로젝트 기본 키 (예: payments-api)
  const projectKey = `${prefix}_${projPrefix}`;
  const projectData = loadStorage(projectKey, null);
  if (projectData !== null) return projectData;

  // 4) 전역 레거시 키 확인 (하위 호환성)
  const legacyData = loadStorage(prefix, null);
  if (legacyData !== null) return legacyData;

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
  analysisId = null,
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
  const rawAnalysisId =
    searchParams.get('analysisId') ||
    routeParams.analysisId ||
    analysisId;
  const activeAnalysisId =
    rawAnalysisId && Number(rawAnalysisId) < 100 ? Number(rawAnalysisId) : null;

  const currentProjectId = normalizeProjectId(queryProject || projectId || 'payments-api');

  // 2) 현재 분석 런(Run) 결과 로드 (백엔드 실데이터 비동기 동기화)
  const [currentAnalysisRun, setCurrentAnalysisRun] = useState(null);
  const displayProjectName = currentAnalysisRun?.projectId || currentProjectId;

  const currentFileFindingData = currentAnalysisRun?.fileFindingData || {};

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

  // 파일 트리 상태: 프로젝트 원래 전체 파일 트리 기본 로드
  const [treeData, setTreeData] = useState(() => getProjectTreeData(currentProjectId));

  // 프로젝트 또는 analysisId 변경 시 해당 분석 런 데이터 동기화
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const run = await Promise.resolve(getAnalysisResult(currentProjectId, activeAnalysisId));
        if (isCancelled || !run) return;
        setCurrentAnalysisRun(run);

        const fileData = run.fileFindingData || {};
        const queryFile = searchParams.get('file');
        const queryFindingId = searchParams.get('findingId');

        const defaultFile =
          queryFile ||
          (run.scope === '현재 파일' && run.selectedFile) ||
          Object.keys(fileData)[0] ||
          'users.ts';

        setSelectedFile(defaultFile);
        setActiveTab('ALL');
        setActiveFindingId(queryFindingId || null);
        setShowNoAnalysisModal(false);

        const storageScope = `${currentProjectId}_${run.analysisId || activeAnalysisId || 'default'}`;

        // 1) 원상 복구 플래그 및 원상 복구된 취약점 데이터 확인
        const isRestored =
          loadStorageWithFallback('codeguard_is_restored', storageScope, false) === true;

        const restoredFindings =
          loadStorageWithFallback('codeguard_restored_findings', storageScope, null);

        if (restoredFindings) {
          Object.keys(restoredFindings).forEach((fileName) => {
            if (!fileData[fileName]) {
              fileData[fileName] = JSON.parse(JSON.stringify(restoredFindings[fileName]));
            } else if (isRestored || !fileData[fileName].hasFinding || !fileData[fileName].findings?.length) {
              fileData[fileName].hasFinding = restoredFindings[fileName].hasFinding;
              fileData[fileName].findings = JSON.parse(JSON.stringify(restoredFindings[fileName].findings || []));
              fileData[fileName].finding = restoredFindings[fileName].finding
                ? JSON.parse(JSON.stringify(restoredFindings[fileName].finding))
                : null;
              fileData[fileName].vulnLineIndices = [...(restoredFindings[fileName].vulnLineIndices || [])];
              fileData[fileName].tagLabel = restoredFindings[fileName].tagLabel || '';
              fileData[fileName].diff = restoredFindings[fileName].diff
                ? JSON.parse(JSON.stringify(restoredFindings[fileName].diff))
                : null;
            }
          });
        }

        // 2) 해결된 취약점 ID 목록 동기화 (원상 복구 상태이면 빈 배열)
        const loadedResolved = isRestored ? [] : loadStorageWithFallback(STORAGE_PREFIX_RESOLVED, storageScope, []);
        setResolvedFindingIds(loadedResolved);

        // 3) 저장 코드 동기화
        const loadedSavedCodes = loadStorageWithFallback(STORAGE_PREFIX_SAVED_CODES, storageScope, {});
        Object.keys(loadedSavedCodes).forEach((fileName) => {
          if (fileData[fileName]) {
            fileData[fileName].codeLines = loadedSavedCodes[fileName];
          }
        });

        // 3-1) 로컬 디스크(C:\Users\user\Documents\code\{projectId}\{relativePath})의 실제 파일 내용이 있으면 우선 적용
        try {
          const projectPaths = PROJECTS_DATA[normalizeProjectId(currentProjectId)]?.filePaths || {};
          const relPath = projectPaths[defaultFile] || defaultFile;
          const localRes = await readFromLocalCode(currentProjectId, defaultFile, relPath);
          if (localRes && localRes.lines?.length > 0) {
            if (fileData[defaultFile]) {
              fileData[defaultFile].codeLines = localRes.lines;
            }
            loadedSavedCodes[defaultFile] = localRes.lines;
          }
        } catch (e) {
          // 로컬 동기화 실패 시 로컬스토리지 유지
        }

        setSavedFileCodes(loadedSavedCodes);

        // 4) 파일 트리 동기화 (저장된 트리 우선 또는 run.treeData)
        const savedTree = loadStorageWithFallback(STORAGE_PREFIX_TREE, storageScope, null);
        const baseTree = savedTree || run.treeData || getProjectTreeData(run.projectId || currentProjectId);
        const resolvedIdsStr = loadedResolved.map(String);
        const updateNodes = (nodes) =>
          nodes.map((node) => {
            if (!node.isDir) {
              const data = fileData[node.name];
              const list = Array.isArray(data?.findings) && data.findings.length > 0
                ? data.findings
                : (data?.finding ? [data.finding] : []);
              const isAllResolved = list.length > 0 && list.every((f) => resolvedIdsStr.includes(String(f.id)));
              const hasFinding = Boolean(data?.hasFinding && !isAllResolved);
              return { ...node, hasFinding };
            }
            if (node.children) {
              return { ...node, children: updateNodes(node.children) };
            }
            return node;
          });
        setTreeData(updateNodes(baseTree));
      } catch (err) {
        console.error('분석 결과 로드 실패:', err);
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
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
  // 모든 취약점 해결(0개) 완료 알림 상태
  const [showAllResolvedToast, setShowAllResolvedToast] = useState(false);

  // 현재 프로젝트 및 분석의 코드/취약점 정보를 최초 상태로 원상 복구하여 영구 저장
  const handleResetAllToInitial = () => {
    const targetProject = displayProjectName || currentProjectId;
    const { treeData: restoredTree, defaultFile, fileFindingData: restoredData } = resetProjectFindingData(targetProject);

    // 1) 파일별 원래 취약점이 포함된 코드 추출
    const restoredFileCodes = {};
    Object.keys(restoredData).forEach((fileName) => {
      if (restoredData[fileName]?.codeLines) {
        restoredFileCodes[fileName] = [...restoredData[fileName].codeLines];
      }
    });

    // 2) React 상태 일괄 갱신
    setSavedFileCodes(restoredFileCodes);
    setResolvedFindingIds([]);
    setTreeData(restoredTree);
    setSelectedFile(defaultFile);
    setActiveTab('ALL');
    setActiveFindingId(null);
    setCodeScope('finding');

    // 3) React state인 currentAnalysisRun 불변 객체로 갱신하여 즉각적인 리렌더링 보장
    let nextAnalysisRun = null;
    if (currentAnalysisRun && restoredData) {
      nextAnalysisRun = {
        ...currentAnalysisRun,
        fileFindingData: JSON.parse(JSON.stringify(restoredData)),
        treeData: JSON.parse(JSON.stringify(restoredTree)),
      };
      setCurrentAnalysisRun(nextAnalysisRun);
    }

    // 4) currentFileFindingData 맵 원본 복원
    if (currentFileFindingData && restoredData) {
      Object.keys(currentFileFindingData).forEach((key) => {
        delete currentFileFindingData[key];
      });
      Object.assign(currentFileFindingData, JSON.parse(JSON.stringify(restoredData)));
    }

    // 5) localStorage에 취약점 코드 및 관련 취약점 정보 영구 저장
    const targetAnalysisId = currentAnalysisRun?.analysisId || activeAnalysisId;
    const scopesToSave = [
      currentStorageScopeId,
      targetProject,
      `${targetProject}_default`,
      targetAnalysisId ? `${targetProject}_${targetAnalysisId}` : null,
    ].filter(Boolean);

    scopesToSave.forEach((scope) => {
      // 5-1. 취약점 소스코드 파일별 저장
      saveStorage(getStorageKey(STORAGE_PREFIX_SAVED_CODES, scope), restoredFileCodes);
      // 5-2. 해결된 취약점 ID 목록 초기화 (모든 취약점 활성화)
      saveStorage(getStorageKey(STORAGE_PREFIX_RESOLVED, scope), []);
      // 5-3. 취약점 데이터 원본 저장 (다른 페이지 이동 후 복원용)
      saveStorage(getStorageKey('codeguard_restored_findings', scope), restoredData);
      // 5-4. 취약점이 있는 파일에 빨간 점이 켜진 파일 트리 영구 저장
      saveStorage(getStorageKey(STORAGE_PREFIX_TREE, scope), restoredTree);
      // 5-5. 원상 복구 플래그 활성화
      saveStorage(getStorageKey('codeguard_is_restored', scope), true);
    });

    // 5-6. 글로벌/하위 호환 레거시 키 동기화
    saveStorage(STORAGE_PREFIX_SAVED_CODES, restoredFileCodes);
    saveStorage(STORAGE_PREFIX_RESOLVED, []);
    saveStorage(STORAGE_PREFIX_TREE, restoredTree);
    saveStorage('codeguard_restored_findings', restoredData);
    saveStorage('codeguard_is_restored', true);

    // 5-7. 분석 런 객체 캐시 저장
    if (nextAnalysisRun) {
      if (nextAnalysisRun.analysisId) {
        saveStorage(`codeguard_analysis_run_${nextAnalysisRun.analysisId}`, nextAnalysisRun);
      }
      saveStorage(`codeguard_latest_analysis_${targetProject}`, nextAnalysisRun);
      saveStorage(`codeguard_latest_analysis_default`, nextAnalysisRun);
    }

    // 5-8. 이 분석이 취약점 0개로 해결 완료 목록(codeguard_resolved_analysis_ids)에 등록되어 있었다면 제거
    //      -> 분석 결과 목록(/analyses/list) 및 대시보드 최근 분석에 즉시 다시 노출 복구!
    if (targetAnalysisId) {
      const aId = Number(targetAnalysisId);
      const resolvedAnalyses = JSON.parse(localStorage.getItem(scopedKey('codeguard_resolved_analysis_ids')) || '[]');
      const updatedResolved = resolvedAnalyses.filter((id) => Number(id) !== aId);
      localStorage.setItem(scopedKey('codeguard_resolved_analysis_ids'), JSON.stringify(updatedResolved));
    }

    // 5-9. 로컬 컴퓨터(C:\Users\user\Documents\code\{targetProject})의 실제 파일들도 원래 취약점 코드로 즉시 저장 동기화!
    const projectPaths = PROJECTS_DATA[normalizeProjectId(targetProject)]?.filePaths || {};
    batchWriteToLocalCode(targetProject, restoredFileCodes, projectPaths).catch(() => {});

    setShowResetToast(true);
    setTimeout(() => {
      setShowResetToast(false);
    }, 3500);
  };

  // 로컬 파일 동기화 토스트 상태
  const [localSyncToast, setLocalSyncToast] = useState('');

  // 로컬 소스코드 기준 저장 디렉토리 상태
  const [localBaseDir, setLocalBaseDir] = useState(() => getLocalCodeBaseDir());
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);

  // 탐색기에서 새 파일 추가 시 로컬 PC 파일 시스템(C:\Users\user\Documents\code\{projectId}\{relativePath}) 및 화면 동기화
  const handleFileAdd = async ({ name, content, ext, relativePath, targetFolder }) => {
    if (!name) return;
    const lines = content ? content.split(/\r?\n/) : ['// 빈 파일입니다.'];
    const pId = displayProjectName || currentProjectId;
    const finalRelPath = relativePath || (targetFolder ? `${targetFolder}/${name}` : name);

    // 1) 프로젝트 경로 매핑 등록
    const normId = normalizeProjectId(pId);
    if (PROJECTS_DATA[normId]) {
      if (!PROJECTS_DATA[normId].filePaths) {
        PROJECTS_DATA[normId].filePaths = {};
      }
      PROJECTS_DATA[normId].filePaths[name] = finalRelPath;
    }

    // 2) 로컬 PC(C:\Users\user\Documents\code\{pId}\{finalRelPath})에 실제 파일 저장
    try {
      const savedSuccess = await writeToLocalCode(pId, name, finalRelPath, lines);
      if (savedSuccess) {
        setLocalSyncToast(`로컬 파일 저장 완료: C:\\Users\\user\\Documents\\code\\${pId}\\${finalRelPath}`);
        setTimeout(() => setLocalSyncToast(''), 4500);
      }
    } catch (e) {
      console.warn('로컬 파일 저장 실패:', e);
    }

    // 3) 파일 취약점 데이터 등록 (새 파일은 취약점 없는 정상 파일)
    if (!currentFileFindingData[name]) {
      currentFileFindingData[name] = {
        hasFinding: false,
        findings: [],
        vulnLineIndices: [],
        tagLabel: ext || name.split('.').pop()?.toUpperCase() || 'FILE',
        codeLines: lines,
        diff: null,
      };
    } else {
      currentFileFindingData[name].codeLines = lines;
    }

    // 4) 저장 코드 상태 갱신
    setSavedFileCodes((prev) => {
      const nextCodes = { ...prev, [name]: lines };
      saveStorage(getStorageKey(STORAGE_PREFIX_SAVED_CODES, currentStorageScopeId), nextCodes);
      saveStorage(STORAGE_PREFIX_SAVED_CODES, nextCodes);
      return nextCodes;
    });

    // 5) 트리 계층에 노드 삽입 및 상태 저장
    const newNode = {
      name,
      isDir: false,
      ext: ext || name.split('.').pop()?.toUpperCase() || 'FILE',
      hasFinding: false,
    };

    setTreeData((prevTree) => {
      const updatedTree = insertNodeIntoTreeHierarchy(prevTree, finalRelPath, newNode);
      saveStorage(getStorageKey(STORAGE_PREFIX_TREE, currentStorageScopeId), updatedTree);
      saveStorage(STORAGE_PREFIX_TREE, updatedTree);
      return updatedTree;
    });

    // 6) 선택 파일 변경
    setSelectedFile(name);
  };

  // 사용자가 외부(메모장, VS Code 등)에서 수정한 C:\Users\user\Documents\code 파일을 웹 화면으로 즉시 다시 불러오기
  const handleReloadFromLocalFile = async () => {
    try {
      const pId = displayProjectName || currentProjectId;
      const projectPaths = PROJECTS_DATA[normalizeProjectId(pId)]?.filePaths || {};
      const relPath = projectPaths[selectedFile] || selectedFile;
      const localRes = await readFromLocalCode(pId, selectedFile, relPath);

      if (localRes && localRes.lines?.length > 0) {
        setSavedFileCodes((prev) => ({ ...prev, [selectedFile]: localRes.lines }));
        if (currentFileFindingData[selectedFile]) {
          currentFileFindingData[selectedFile].codeLines = localRes.lines;
        }
        setLocalSyncToast(`C:\\Users\\user\\Documents\\code\\${pId}\\${relPath} 파일에서 최신 코드를 불러왔습니다.`);
        setTimeout(() => setLocalSyncToast(''), 4000);
      } else {
        setLocalSyncToast(`C:\\Users\\user\\Documents\\code\\${pId}\\${relPath} 파일을 읽을 수 없습니다.`);
        setTimeout(() => setLocalSyncToast(''), 4000);
      }
    } catch (e) {
      setLocalSyncToast(`로컬 파일 읽기 오류: ${e.message}`);
      setTimeout(() => setLocalSyncToast(''), 4000);
    }
  };

  // 파일 선택 처리 (로컬 디스크 파일 우선 확인 및 백엔드 코드 연동)
  const handleFileSelect = async (fileName) => {
    setSelectedFile(fileName);
    setActiveFindingId(null);

    // 1) 로컬 디스크(C:\Users\user\Documents\code\{projectId}\{relativePath})에 수정된 파일이 있는지 우선 확인
    try {
      const pId = displayProjectName || currentProjectId;
      const projectPaths = PROJECTS_DATA[normalizeProjectId(pId)]?.filePaths || {};
      const relPath = projectPaths[fileName] || fileName;
      const localRes = await readFromLocalCode(pId, fileName, relPath);
      if (localRes && localRes.lines?.length > 0) {
        setSavedFileCodes((prev) => ({ ...prev, [fileName]: localRes.lines }));
        if (currentFileFindingData[fileName]) {
          currentFileFindingData[fileName].codeLines = localRes.lines;
        }
        return;
      }
    } catch (e) {}

    // 2) 저장된 코드가 이미 존재하거나 currentFileFindingData에 코드가 정상적으로 있으면 백엔드에서 덮어쓰지 않음
    if (savedFileCodes && savedFileCodes[fileName]) return;
    const targetItem = currentFileFindingData[fileName];
    if (targetItem && targetItem.codeLines && targetItem.codeLines.length > 1) return;

    if (currentAnalysisRun?.analysisId) {
      // 트리 노드에서 fileId 탐색
      const findNode = (nodes) => {
        for (const n of nodes) {
          if (!n.isDir && n.name === fileName && n.fileId) return n;
          if (n.children) {
            const found = findNode(n.children);
            if (found) return found;
          }
        }
        return null;
      };

      const nodeWithId = findNode(treeData);
      if (nodeWithId?.fileId) {
        try {
          const detail = await analysisApi.getAnalysisFileContent(currentAnalysisRun.analysisId, nodeWithId.fileId);
          if (detail && typeof detail.content === 'string') {
            const lines = detail.content.split('\n');
            setSavedFileCodes((prev) => ({ ...prev, [fileName]: lines }));
            if (targetItem) {
              targetItem.codeLines = lines;
            }
          }
        } catch (e) {
          console.warn('파일 코드 실시간 로드 실패:', e.message);
        }
      }
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

  // 현재 파일 데이터 (currentFileFindingData 우선, 없으면 프로젝트 기본 파일 데이터 사용)
  const baseData =
    currentFileFindingData[selectedFile] ||
    getProjectFileFindingData(displayProjectName)?.[selectedFile] ||
    getProjectFileFindingData(currentProjectId)?.[selectedFile] || {
      hasFinding: false,
      codeLines: [`// ${selectedFile} 소스코드를 로드 중입니다...`],
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
              : '✓ 보안 점검 완료 · 취약점 미탐지 (Clean)'));

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
    if (currentFileFindingData[selectedFile]) {
      currentFileFindingData[selectedFile].codeLines = patchedLines;
    }

    // 2) 해결 상태 등록 (메모리 상태 & localStorage 영구 보존)
    const nextResolvedIds = [...new Set([...resolvedFindingIds, ...resolvingIds])];
    setResolvedFindingIds(nextResolvedIds);

    const targetProject = displayProjectName || currentProjectId;
    const targetAnalysisId = currentAnalysisRun?.analysisId || activeAnalysisId;
    const scopesToSave = [
      currentStorageScopeId,
      targetProject,
      `${targetProject}_default`,
      targetAnalysisId ? `${targetProject}_${targetAnalysisId}` : null,
    ].filter(Boolean);

    // 3) 스코프별 일괄 영구 저장 및 원상 복구 플래그 해제 (부분/전체 해결 상태)
    scopesToSave.forEach((scope) => {
      saveStorage(getStorageKey(STORAGE_PREFIX_SAVED_CODES, scope), nextSavedCodes);
      saveStorage(getStorageKey(STORAGE_PREFIX_RESOLVED, scope), nextResolvedIds);
      saveStorage(getStorageKey('codeguard_is_restored', scope), false);
    });
    saveStorage(STORAGE_PREFIX_SAVED_CODES, nextSavedCodes);
    saveStorage(STORAGE_PREFIX_RESOLVED, nextResolvedIds);
    // 3-1) 로컬 컴퓨터(C:\Users\user\Documents\code\{targetProject}\{relativePath})의 실제 파일에 수정된 코드 즉시 저장 반영!
    const targetPaths = PROJECTS_DATA[normalizeProjectId(targetProject)]?.filePaths || {};
    const targetRelPath = targetPaths[selectedFile] || selectedFile;
    writeToLocalCode(targetProject, selectedFile, targetRelPath, patchedLines).catch(() => {});

    // 4) 파일 트리에서 해당 파일의 모든 취약점이 해결되었는지 확인
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
      scopesToSave.forEach((scope) => {
        saveStorage(getStorageKey(STORAGE_PREFIX_TREE, scope), nextTree);
      });
      saveStorage(STORAGE_PREFIX_TREE, nextTree);
    }

    // 4) 백엔드 연동 규격 API 및 분석 런 동기화 (실패 시에도 UI 중단 방지)
    try {
      for (const rId of resolvingIds) {
        await updateFindingStatusOnAnalysis({
          projectId: currentProjectId,
          analysisId: currentAnalysisRun?.analysisId,
          findingId: rId,
          status: 'RESOLVED',
        });
      }
    } catch (e) {
      console.warn('취약점 상태 백엔드 동기화 실패(로컬 유지):', e.message);
    }

    // 5) 모든 취약점이 수정되어 0개가 되었을 때 분석 목록에서 제거되도록 등록
    const allAnalysisFindings = Object.values(currentFileFindingData).flatMap((f) => f.findings || []);
    const resolvedIdsStr = nextResolvedIds.map(String);
    const totalCount = Number(currentAnalysisRun?.totalFindings || allAnalysisFindings.length || 0);

    const isAllAnalysisResolved =
      (allAnalysisFindings.length > 0 && allAnalysisFindings.every((f) => resolvedIdsStr.includes(String(f.id)))) ||
      (totalCount > 0 && nextResolvedIds.length >= totalCount);

    if (isAllAnalysisResolved && currentAnalysisRun?.analysisId) {
      const aId = Number(currentAnalysisRun.analysisId);
      const currentList = JSON.parse(localStorage.getItem(scopedKey('codeguard_resolved_analysis_ids')) || '[]');
      if (!currentList.map(Number).includes(aId)) {
        localStorage.setItem(scopedKey('codeguard_resolved_analysis_ids'), JSON.stringify([...currentList, aId]));
      }
      setShowAllResolvedToast(true);
      setTimeout(() => setShowAllResolvedToast(false), 5000);
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
  const headerSubtitle = `${getProjectFilePath(displayProjectName, selectedFile)} ${analysisMetaBadge}`;

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
              className="outline-btn"
              onClick={handleReloadFromLocalFile}
              title="내 컴퓨터(C:\Users\user\Documents\code)에서 직접 수정한 최신 파일 내용을 웹 화면으로 불러옵니다"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: '#10b981',
                color: '#059669',
                background: 'rgba(16, 185, 129, 0.06)',
                fontWeight: 600,
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <FolderSync size={13} />
              <span>내 PC 파일에서 불러오기</span>
            </button>
            <button
              type="button"
              className="outline-btn reset-btn"
              onClick={handleResetAllToInitial}
              title="이 프로젝트의 모든 파일 코드를 취약점이 포함된 원래 상태로 되돌리고 내 PC(C:\Users\user\Documents\code) 및 브라우저에 저장합니다"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: 'var(--high)',
                color: 'var(--high)',
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

      {/* 로컬 파일 동기화 성공/알림 토스트 */}
      {localSyncToast && (
        <div
          style={{
            margin: '0 24px 12px 24px',
            padding: '10px 18px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid #10b981',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#065f46',
            fontWeight: 500,
            fontSize: '13px',
          }}
        >
          <CheckCircle size={16} color="#10b981" />
          <span>{localSyncToast}</span>
        </div>
      )}

      {/* 로컬 PC 파일 연동 정보 배너 */}
      <div
        style={{
          margin: '0 24px 12px 24px',
          padding: '8px 16px',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--text-2)',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HardDrive size={14} color="#6366f1" />
          <span>
            로컬 파일 실시간 연동 중:{' '}
            <strong style={{ color: '#4f46e5' }}>
              {localBaseDir}\{displayProjectName}\{PROJECTS_DATA[normalizeProjectId(displayProjectName || currentProjectId)]?.filePaths?.[selectedFile] || selectedFile}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => setIsPathModalOpen(true)}
            title="다른 컴퓨터나 다른 폴더 경로로 로컬 소스코드 저장 위치 변경"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              borderRadius: '4px',
              color: '#818cf8',
              fontSize: '11px',
              cursor: 'pointer',
              marginLeft: '6px',
              fontWeight: 500,
            }}
          >
            <FolderCog size={12} />
            <span>경로 변경</span>
          </button>
          <span style={{ color: 'var(--text-3)' }}>|</span>
          <span style={{ color: 'var(--text-3)' }}>
            화면에서 취약점 수정 시 해당 프로젝트 계층 파일에 즉시 저장되며, 외부에서 파일 수정 후 [내 PC 파일에서 불러오기]를 누르면 즉시 반영됩니다.
          </span>
        </div>
      </div>

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
            color: 'var(--text-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={14} color="var(--accent)" />
            <span>
              최근 실행된 분석: <strong style={{ color: 'var(--accent)' }}>{analysisTitleText}</strong> (ID: #{currentAnalysisRun.analysisId})
            </span>
            <span style={{ color: 'var(--text-3)' }}>|</span>
            <span>
              분석 범위: <strong style={{ color: 'var(--text-1)' }}>{currentAnalysisRun.scope}</strong>
              {currentAnalysisRun.scope === '현재 파일' && ` (${currentAnalysisRun.selectedFile})`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={13} />
            <span>탐지 룰: {currentAnalysisRun.activeRules?.join(', ') || '전체'}</span>
          </div>
        </div>
      )}

      {/* 모든 취약점 해결 알림 바 */}
      {showAllResolvedToast && (
        <div
          style={{
            margin: '0 24px 12px 24px',
            padding: '10px 18px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid #10b981',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#065f46',
            fontWeight: 500,
            fontSize: '13px',
          }}
        >
          <CheckCircle size={16} color="#10b981" />
          <span>모든 취약점이 수정되어 취약점 수가 0개가 되었습니다. 분석 결과 목록에서 자동으로 제거되었습니다.</span>
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
          className={`result-grid-3col ${isTreeCollapsed ? 'tree-collapsed' : ''}`}
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

          {/* 우측: 취약점 상세 정보 & AI 분석 패널 또는 안전한 파일 안내 */}
          {hasActiveFinding ? (
            <FindingDetailPanel
              finding={currentFindingObj}
              scope={codeScope}
              onScopeChange={setCodeScope}
              onResolve={(id, scope) => handleResolve(id, scope)}
            />
          ) : (
            <aside className="finding finding-clean-box">
              <div style={{ padding: '32px 20px', textAlign: 'center', color: '#4b5563' }}>
                <div style={{ display: 'inline-flex', padding: '12px', background: '#ecfdf5', borderRadius: '50%', marginBottom: '16px', color: '#10b981' }}>
                  <CheckCircle size={32} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
                  보안 취약점 없음
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6, marginBottom: '16px' }}>
                  선택하신 <strong>{selectedFile}</strong> 파일에 대한 정적 분석 결과, 보안 규칙 위반 사항이 발견되지 않았습니다.
                </p>
                <span style={{ display: 'inline-block', fontSize: '12px', fontWeight: 500, padding: '4px 10px', background: '#ecfdf5', color: '#047857', borderRadius: '4px' }}>
                  ✓ 보안 점검 통과 (Clean)
                </span>
              </div>
            </aside>
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
            background: 'var(--bg-2)',
            color: 'var(--text-1)',
            border: '1px solid var(--accent)',
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
          <CheckCircle size={18} color="var(--accent)" />
          <div>
            <strong style={{ display: 'block', color: 'var(--accent)', marginBottom: '2px' }}>취약점 코드 원상 복구 완료</strong>
            <span>{displayProjectName} 프로젝트의 취약점이 포함된 원본 소스코드와 취약점 정보가 정상 저장되었습니다.</span>
          </div>
        </div>
      )}

      {/* 로컬 소스코드 저장 경로 설정 모달 */}
      <LocalPathConfigModal
        isOpen={isPathModalOpen}
        onClose={() => setIsPathModalOpen(false)}
        onPathChanged={(newDir) => {
          setLocalBaseDir(newDir);
          setLocalSyncToast(`로컬 저장 경로가 '${newDir}'(으)로 변경되었습니다.`);
          setTimeout(() => setLocalSyncToast(''), 4500);
        }}
      />
    </main>
  );
}
