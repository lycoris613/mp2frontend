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
            if (data?.finding && initialResolved.includes(data.finding.id)) {
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
            if (data?.finding && loadedResolved.includes(data.finding.id)) {
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

  // 상단 취약점 유형 탭 변경 핸들러 (해당 취약점 파일로 스마트 포커스)
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'ALL') {
      const matchedFile = Object.keys(currentFileFindingData).find((fileName) => {
        const item = currentFileFindingData[fileName];
        return (
          item.hasFinding &&
          item.finding?.vulnerabilityType === tabId &&
          !resolvedFindingIds.includes(item.finding?.id)
        );
      });
      if (matchedFile && matchedFile !== selectedFile) {
        setSelectedFile(matchedFile);
      }
    }
  };

  // 초기 상태 원상 복구 토스트 알림 상태
  const [showResetToast, setShowResetToast] = useState(false);

  // 현재 프로젝트 및 분석의 코드/취약점 정보를 최초 상태로 원상 복구하여 저장
  const handleResetAllToInitial = () => {
    const { treeData: restoredTree, defaultFile } = resetProjectFindingData(currentProjectId);
    setSavedFileCodes({});
    setResolvedFindingIds([]);
    setTreeData(restoredTree);
    setSelectedFile(defaultFile);
    setActiveTab('ALL');

    // 현재 분석 런의 localStorage 데이터 격리 초기화
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

    setShowResetToast(true);
    setTimeout(() => {
      setShowResetToast(false);
    }, 3000);
  };

  // 파일 선택 처리
  const handleFileSelect = (fileName) => {
    setSelectedFile(fileName);
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

  const isCurrentResolved = baseData.finding && resolvedFindingIds.includes(baseData.finding.id);

  // 현재 표시할 코드 본문 (저장된 코드가 있으면 우선 사용)
  const currentCodeLines = savedFileCodes[selectedFile] || baseData.codeLines;

  // 현재 파일의 취약점이 선택된 탭(activeTab)과 일치하는지 여부
  const isTypeMatched =
    activeTab === 'ALL' ||
    (baseData.finding && baseData.finding.vulnerabilityType === activeTab);

  // 취약점이 존재하고 미해결이며, 현재 선택된 탭 유형과 일치할 때만 하이라이트 활성화
  const hasActiveFinding = baseData.hasFinding && !isCurrentResolved && isTypeMatched;
  const currentVulnLines = hasActiveFinding ? baseData.vulnLineIndices : [];
  const currentTagLabel = hasActiveFinding
    ? baseData.tagLabel
    : isCurrentResolved
    ? '✓ 보안 조치 완료 (안전한 코드로 수정됨)'
    : '';

  // 취약점 해결 클릭 핸들러 (after 코드 치환 및 프로젝트별 영구 저장)
  const handleResolve = async (findingId, scope = codeScope) => {
    const diff = baseData.diff;
    if (!diff) return;

    let patchedLines = [];

    if (scope === 'full' && diff.fullCleanCodeLines) {
      // 1) 전체 코드 범위: import문 및 완전한 보안 패치가 적용된 완성형 코드로 파일 전체 치환
      patchedLines = [...diff.fullCleanCodeLines];
    } else {
      // 2) 이 취약점만 범위: 취약 구간(startLine)만 afterLines로 정밀 치환
      const original = [...currentCodeLines];
      const startIdx = Math.max(0, diff.startLine - 1);
      const deleteCount = diff.beforeLines ? diff.beforeLines.length : 1;
      original.splice(startIdx, deleteCount, ...diff.afterLines);
      patchedLines = original;
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
    const nextResolvedIds = [...new Set([...resolvedFindingIds, findingId])];
    setResolvedFindingIds(nextResolvedIds);
    saveStorage(getStorageKey(STORAGE_PREFIX_RESOLVED, currentStorageScopeId), nextResolvedIds);

    // 3) 파일 트리에서 해당 파일의 취약점 인디케이터(●) 해결 처리 및 저장
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

    // 4) 백엔드 연동 규격 API 및 분석 런 동기화
    await updateFindingStatusOnAnalysis({
      projectId: currentProjectId,
      analysisId: currentAnalysisRun?.analysisId,
      findingId,
      status: 'RESOLVED',
    });
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
  const currentFindingObj = baseData.finding
    ? {
        ...baseData.finding,
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
          <SeveritySummary totals={dynamicTotals} />
        </div>

        {/* 상단 메인 그리드 */}
        <div
          className={`result-grid-3col ${
            !baseData.hasFinding || !isTypeMatched ? 'no-finding' : ''
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
            tagLabel={currentTagLabel}
            className="editor result-editor"
          />

          {/* 우측: 취약점 상세 정보 & AI 분석 패널 */}
          {baseData.hasFinding && isTypeMatched && (
            <FindingDetailPanel
              finding={currentFindingObj}
              onScopeChange={setCodeScope}
              onResolve={(id, scope) => handleResolve(id, scope)}
            />
          )}
        </div>

        {/* 하단: BEFORE / AFTER Diff 비교 패널 */}
        {baseData.hasFinding && isTypeMatched && baseData.diff && (
          <CodeDiffPanel
            fileName={selectedFile}
            startLine={baseData.diff.startLine}
            beforeLines={baseData.diff.beforeLines}
            afterLines={baseData.diff.afterLines}
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
