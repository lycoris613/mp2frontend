import { useState, useEffect } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import FileTree from '../../components/common/FileTree';
import CodeViewer from '../../components/common/CodeViewer';
import VulnerabilityTypeTabs from './components/VulnerabilityTypeTabs';
import SeveritySummary from './components/SeveritySummary';
import FindingDetailPanel from './components/FindingDetailPanel';
import CodeDiffPanel from './components/CodeDiffPanel';
import {
  resultTreeData as initialTreeData,
  fileFindingData,
  calculateDynamicFindingTotals,
  calculateDynamicTypeTabs,
  resetFileFindingData,
} from '../../data/findingData';
import { PAGES } from '../../constants/navigation';
import { AlertCircle, ArrowRight, RotateCcw, CheckCircle } from 'lucide-react';

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

const loadStorageWithFallback = (prefix, projectId, fallback) => {
  const specificKey = getStorageKey(prefix, projectId);
  const data = loadStorage(specificKey, null);
  if (data !== null) return data;

  // 기본 프로젝트(payments-api 또는 128)라면 이전 전역 키도 확인 (하위 호환성 유지)
  if (projectId === 'payments-api' || projectId === '128' || !projectId) {
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
 * - 프로젝트별 독립된 코드 파일 저장 및 취약점 해결 상태 격리 (localStorage)
 * - 취약점 해결 시 After 코드 치환 및 범위(이 취약점만/전체 코드)별 반영
 * - 실제 등록된 취약점 데이터 기반 실시간 동적 카운트 집계
 * 
 * @param {string|number} projectId - 개발자 A가 사이드바/라우터에서 전달하는 프로젝트 ID (기본값: 'payments-api')
 * @param {string|number} analysisId - 분석 ID (기본값: 128)
 * @param {string} projectTitle - 프로젝트명 (기본값: 'payments-api')
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
  // URL에서 projectId/analysisId 자동 감지 (React Router 연동 호환)
  // 예: /results/:projectId 또는 /analyses/:analysisId 또는 ?projectId=...
  const getUrlParamId = () => {
    if (typeof window === 'undefined') return null;
    try {
      // 1) /results/:id 또는 /analyses/:id 경로 패턴 감지
      const match = window.location.pathname.match(/\/(?:results|analyses)\/([^/?#]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]);

      // 2) ?projectId=... 또는 ?analysisId=... 쿼리 파라미터 감지
      const searchParams = new URLSearchParams(window.location.search);
      const qId = searchParams.get('projectId') || searchParams.get('analysisId');
      if (qId) return qId;
    } catch (e) {
      // ignore
    }
    return null;
  };

  const [activeUrlId, setActiveUrlId] = useState(getUrlParamId);

  // 브라우저 뒤로가기/앞으로가기 및 URL 변경 감지
  useEffect(() => {
    const handleLocationChange = () => {
      setActiveUrlId(getUrlParamId());
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const currentProjectId = String(
    projectId !== 'payments-api' ? projectId : activeUrlId || projectId || analysisId || 'payments-api'
  );
  const displayProjectName =
    projectTitle !== 'payments-api'
      ? projectTitle
      : (activeUrlId && isNaN(activeUrlId) ? activeUrlId : projectTitle) || projectId || 'payments-api';

  const [selectedFile, setSelectedFile] = useState('users.ts');
  const [activeTab, setActiveTab] = useState('ALL'); // 기본값: 'ALL' (전체)
  const [codeScope, setCodeScope] = useState('finding'); // 'finding' | 'full'
  const [showNoAnalysisModal, setShowNoAnalysisModal] = useState(false);
  const [unAnalyzedFileName, setUnAnalyzedFileName] = useState('');
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  // 상단 취약점 유형 탭 변경 핸들러 (해당 취약점 파일로 스마트 포커스)
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'ALL') {
      const matchedFile = Object.keys(fileFindingData).find((fileName) => {
        const item = fileFindingData[fileName];
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

  // 해결 완료된 취약점 ID 목록 (프로젝트별 격리 로드)
  const [resolvedFindingIds, setResolvedFindingIds] = useState(() =>
    loadStorageWithFallback(STORAGE_PREFIX_RESOLVED, currentProjectId, [])
  );

  // 파일별 수정 및 저장된 코드 상태 (프로젝트별 격리 로드 및 원본 동기화)
  const [savedFileCodes, setSavedFileCodes] = useState(() => {
    const saved = loadStorageWithFallback(STORAGE_PREFIX_SAVED_CODES, currentProjectId, {});
    Object.keys(saved).forEach((fileName) => {
      if (fileFindingData[fileName]) {
        fileFindingData[fileName].codeLines = saved[fileName];
      }
    });
    return saved;
  });

  // 파일 트리 상태 (프로젝트별 격리 로드)
  const [treeData, setTreeData] = useState(() => {
    const savedTree = loadStorageWithFallback(STORAGE_PREFIX_TREE, currentProjectId, null);
    if (savedTree) return savedTree;

    const initialResolved = loadStorageWithFallback(STORAGE_PREFIX_RESOLVED, currentProjectId, []);
    if (initialResolved.length > 0) {
      const updateNodes = (nodes) =>
        nodes.map((node) => {
          if (!node.isDir) {
            const data = fileFindingData[node.name];
            if (data?.finding && initialResolved.includes(data.finding.id)) {
              return { ...node, hasFinding: false };
            }
          }
          if (node.children) {
            return { ...node, children: updateNodes(node.children) };
          }
          return node;
        });
      return updateNodes(initialTreeData);
    }
    return initialTreeData;
  });

  // 사이드바 또는 라우터에서 프로젝트가 변경될 때 프로젝트별 격리 데이터 로드
  useEffect(() => {
    const loadedResolved = loadStorageWithFallback(STORAGE_PREFIX_RESOLVED, currentProjectId, []);
    setResolvedFindingIds(loadedResolved);

    // 원본 데이터 복원 후 해당 프로젝트의 저장 코드로 재동기화
    resetFileFindingData();
    const loadedSavedCodes = loadStorageWithFallback(STORAGE_PREFIX_SAVED_CODES, currentProjectId, {});
    Object.keys(loadedSavedCodes).forEach((fileName) => {
      if (fileFindingData[fileName]) {
        fileFindingData[fileName].codeLines = loadedSavedCodes[fileName];
      }
    });
    setSavedFileCodes(loadedSavedCodes);

    const loadedTree = loadStorageWithFallback(STORAGE_PREFIX_TREE, currentProjectId, null);
    if (loadedTree) {
      setTreeData(loadedTree);
    } else {
      const updateNodes = (nodes) =>
        nodes.map((node) => {
          if (!node.isDir) {
            const data = fileFindingData[node.name];
            if (data?.finding && loadedResolved.includes(data.finding.id)) {
              return { ...node, hasFinding: false };
            }
          }
          if (node.children) {
            return { ...node, children: updateNodes(node.children) };
          }
          return node;
        });
      setTreeData(updateNodes(initialTreeData));
    }
  }, [currentProjectId]);

  // 초기 상태 원상 복구 토스트 알림 상태
  const [showResetToast, setShowResetToast] = useState(false);

  // 현재 프로젝트의 코드 및 취약점 정보를 최초 상태로 원상 복구하여 저장
  const handleResetAllToInitial = () => {
    const { resultTreeData: restoredTree } = resetFileFindingData();
    setSavedFileCodes({});
    setResolvedFindingIds([]);
    setTreeData(restoredTree);

    // 현재 프로젝트의 localStorage 데이터만 격리 초기화
    removeStorage(getStorageKey(STORAGE_PREFIX_RESOLVED, currentProjectId));
    removeStorage(getStorageKey(STORAGE_PREFIX_SAVED_CODES, currentProjectId));
    removeStorage(getStorageKey(STORAGE_PREFIX_TREE, currentProjectId));
    if (currentProjectId === 'payments-api' || currentProjectId === '128') {
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
    const data = fileFindingData[fileName];
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
  const baseData = fileFindingData[selectedFile] || {
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
  // activeTab이 'ALL'이면 전체 일치, 특정 유형이면 해당 유형만 일치
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
  const handleResolve = (findingId, scope = codeScope) => {
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

    // 1) 파일에 저장 (메모리 상태, 원본 객체, 프로젝트별 localStorage 영구 보존)
    const nextSavedCodes = {
      ...savedFileCodes,
      [selectedFile]: patchedLines,
    };
    setSavedFileCodes(nextSavedCodes);
    fileFindingData[selectedFile].codeLines = patchedLines;
    saveStorage(getStorageKey(STORAGE_PREFIX_SAVED_CODES, currentProjectId), nextSavedCodes);

    // 2) 해결 상태 등록 (메모리 상태 & 프로젝트별 localStorage 영구 보존)
    const nextResolvedIds = [...new Set([...resolvedFindingIds, findingId])];
    setResolvedFindingIds(nextResolvedIds);
    saveStorage(getStorageKey(STORAGE_PREFIX_RESOLVED, currentProjectId), nextResolvedIds);

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
    saveStorage(getStorageKey(STORAGE_PREFIX_TREE, currentProjectId), nextTree);
  };

  // 실제 등록된 취약점 기반 동적 카운트 계산
  const dynamicTabs = calculateDynamicTypeTabs(fileFindingData, resolvedFindingIds);
  const dynamicTotals = calculateDynamicFindingTotals(fileFindingData, resolvedFindingIds);

  const getSubTitlePath = () => {
    if (selectedFile === 'users.ts' || selectedFile === 'payments.ts') {
      return `${displayProjectName} · src/routes/${selectedFile}`;
    }
    if (selectedFile === 'package.json') {
      return `${displayProjectName} · package.json`;
    }
    return `${displayProjectName} · src/${selectedFile}`;
  };

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
        subtitle={getSubTitlePath()}
        currentUser={currentUser}
        onLogin={onLogin}
        onLogout={onLogout}
        extraAction={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="outline-btn reset-btn"
              onClick={handleResetAllToInitial}
              title="모든 파일의 코드를 취약점이 포함된 원래 상태로 되돌리고 저장합니다"
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
                아직 취약점 분석 결과가 존재하지 않습니다.
              </p>
              <p className="no-analysis-sub">
                취약점 탐지 결과 및 AI 개선 수정안을 확인하시려면, 먼저 <strong>코드 분석</strong> 페이지에서
                해당 파일을 포함하여 분석을 실행해 주세요.
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
            <span>모든 파일의 소스코드와 취약점이 초기 테스트 상태로 복구되어 저장되었습니다.</span>
          </div>
        </div>
      )}
    </main>
  );
}
