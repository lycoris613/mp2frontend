import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import FileTree from '../../components/common/FileTree';
import CodeViewer from '../../components/common/CodeViewer';
import AnalysisSettingsPanel from './components/AnalysisSettingsPanel';
import AnalysisProgressPanel from './components/AnalysisProgressPanel';
import { scopedKey } from '../../utils/accountScope';
import {
  PROJECTS_DATA,
  normalizeProjectId,
  getProjectTreeData,
  getProjectFileFindingData,
  getProjectDefaultFile,
  getProjectFilePath,
} from '../../data/findingData';
import { executeAnalysis } from '../../services/analysisService';
import {
  writeToLocalCode,
  deleteLocalCode,
  renameLocalCode,
  getLocalCodeBaseDir,
} from '../../services/localCodeSyncService';
import LocalPathConfigModal from '../../components/common/LocalPathConfigModal';
import {
  insertNodeIntoTreeHierarchy,
  removeNodeFromTreeHierarchy,
  renameNodeInTreeHierarchy,
  moveNodeInTreeHierarchy,
} from '../../utils/fileTreeHelper';
import { detectLanguage } from '../../utils/language';
import { PAGES } from '../../constants/navigation';
import { CheckCircle, HardDrive, FolderCog } from 'lucide-react';
import {
  saveCustomProjectTree,
  getCustomProjectTree,
} from '../../services/projectService';

/**
 * 프로젝트별 초기 파일 내용 맵 생성 헬퍼
 */
const getInitialFileContents = (projId) => {
  const fileData = getProjectFileFindingData(projId) || {};
  const contents = {};
  Object.keys(fileData).forEach((fileName) => {
    contents[fileName] = fileData[fileName]?.codeLines || [];
  });
  return contents;
};

/**
 * [SCR-002] 코드 분석 화면
 * image/코드입력.png 와이어프레임 최신본 준수
 * - 사이드바에서 프로젝트 선택 시 해당 프로젝트의 파일 목록과 코드 로드
 * - 파일 탐색기, + 로컬 파일 추가, 코드 뷰어, 분석 설정 연동
 * - 분석 완료 후 결과 보기 클릭 시 해당 프로젝트의 분석 결과(/analyses?project=...&analysisId=...)로 이동
 */
export default function CodeAnalysisPage({ setPage, currentUser, onLogin, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  // URL에서 선택된 프로젝트 식별 (?project=auth-service 등)
  const searchParams = new URLSearchParams(location.search);
  const queryProject = searchParams.get('project') || searchParams.get('projectId');
  const currentProjectId = normalizeProjectId(queryProject || 'payments-api');

  const [treeData, setTreeData] = useState(() => getProjectTreeData(currentProjectId));
  const [fileContents, setFileContents] = useState(() => getInitialFileContents(currentProjectId));
  const [selectedFile, setSelectedFile] = useState(() => getProjectDefaultFile(currentProjectId));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisConfig, setAnalysisConfig] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  // 사이드바에서 프로젝트 전환 시 해당 프로젝트의 파일 트리와 코드 동기화
  useEffect(() => {
    const nextTree = getProjectTreeData(currentProjectId);
    setTreeData(nextTree);
    const nextContents = getInitialFileContents(currentProjectId);
    setFileContents(nextContents);
    const nextDefaultFile =
      getProjectDefaultFile(currentProjectId) ||
      Object.keys(nextContents)[0] ||
      null;
    setSelectedFile(nextDefaultFile);
  }, [currentProjectId]);

  // 커스텀 프로젝트인 경우 트리 변경 시 로컬 스토리지에 지속 저장
  useEffect(() => {
    const customList = JSON.parse(
      localStorage.getItem(scopedKey('codeguard_custom_projects')) || '[]'
    );
    if (customList.some((p) => p.id === currentProjectId)) {
      saveCustomProjectTree(currentProjectId, treeData);
    }
  }, [treeData, currentProjectId]);

  const handleStartAnalysis = async (config) => {
    setAnalysisConfig(config);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await executeAnalysis({
        projectId: currentProjectId,
        title: config.title,
        scope: config.scope,
        selectedFile,
        language: config?.language,
        rules: config.rules,
        fileContents,
        treeData,
      });
      setAnalysisResult(result);
    } catch (err) {
      console.error('분석 실행 실패:', err);
    }
  };

  const handleCloseModal = () => {
    setIsAnalyzing(false);
  };

  // 분석 완료 후 결과 보기 클릭 시 해당 분석 ID가 반영된 결과 화면으로 이동
  const handleViewResult = () => {
    setIsAnalyzing(false);
    const aId = analysisResult?.analysisId;
    const targetUrl = aId
      ? `/analyses?project=${currentProjectId}&analysisId=${aId}`
      : `/analyses?project=${currentProjectId}`;

    if (typeof navigate === 'function') {
      navigate(targetUrl);
    } else if (typeof setPage === 'function') {
      setPage(PAGES.RESULT);
    }
  };

  const [localSyncToast, setLocalSyncToast] = useState('');
  const [localBaseDir, setLocalBaseDir] = useState(() => getLocalCodeBaseDir());
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);

  const handleFileAdd = async ({ name, content, ext, relativePath, targetFolder }) => {
    if (!name) return;
    const lines = content ? content.split(/\r?\n/) : ['// 빈 파일입니다.'];
    const detected = detectLanguage(name, lines);
    const resolvedExt = ext || (detected.isSupported ? detected.tag : (detected.tag || 'FILE'));
    const finalRelPath = relativePath || (targetFolder ? `${targetFolder}/${name}` : name);

    // 1) 프로젝트 경로 매핑 등록
    const normId = normalizeProjectId(currentProjectId);
    if (PROJECTS_DATA[normId]) {
      if (!PROJECTS_DATA[normId].filePaths) {
        PROJECTS_DATA[normId].filePaths = {};
      }
      PROJECTS_DATA[normId].filePaths[name] = finalRelPath;
    }

    // 2) 로컬 PC(C:\Users\user\Documents\code\{currentProjectId}\{finalRelPath})에 실제 파일 저장
    try {
      const savedSuccess = await writeToLocalCode(currentProjectId, name, finalRelPath, lines);
      if (savedSuccess) {
        setLocalSyncToast(`로컬 파일 저장 완료: C:\\Users\\user\\Documents\\code\\${currentProjectId}\\${finalRelPath}`);
        setTimeout(() => setLocalSyncToast(''), 4500);
      }
    } catch (e) {
      console.warn('로컬 파일 저장 실패:', e);
    }

    setFileContents((prev) => ({
      ...prev,
      [name]: lines,
    }));

    const newNode = {
      name,
      isDir: false,
      ext: resolvedExt,
      hasFinding: false,
    };

    setTreeData((prevTree) => insertNodeIntoTreeHierarchy(prevTree, finalRelPath, newNode));
    setSelectedFile(name);
  };

  const handleFileRename = async ({ oldName, newName, oldRelPath, newRelPath, isDir }) => {
    if (!oldName || !newName || oldName === newName) return;

    // 1) 트리 데이터 노드 이름 갱신
    setTreeData((prevTree) => renameNodeInTreeHierarchy(prevTree, oldName, newName));

    // 2) 로컬 디스크(C:\Users\user\Documents\code) 이름 변경 API 호출
    try {
      await renameLocalCode(currentProjectId, oldRelPath, newRelPath, oldName, newName);
    } catch (e) {
      console.warn('로컬 파일/폴더 이름 변경 실패:', e);
    }

    // 3) 파일인 경우 코드 내용 키 및 선택 파일 동기화
    if (!isDir) {
      setFileContents((prev) => {
        const next = { ...prev };
        if (next[oldName]) {
          next[newName] = next[oldName];
          delete next[oldName];
        }
        return next;
      });

      if (selectedFile === oldName) {
        setSelectedFile(newName);
      }

      // PROJECTS_DATA 매핑 갱신
      const normId = normalizeProjectId(currentProjectId);
      if (PROJECTS_DATA[normId]?.filePaths) {
        delete PROJECTS_DATA[normId].filePaths[oldName];
        PROJECTS_DATA[normId].filePaths[newName] = newRelPath;
      }
    }

    setLocalSyncToast(`[이름 수정 완료] ${oldName} → ${newName}`);
    setTimeout(() => setLocalSyncToast(''), 4000);
  };

  const handleFileDelete = async ({ name, relativePath, isDir }) => {
    if (!name) return;

    // 1) 트리 데이터에서 노드 제거
    setTreeData((prevTree) => removeNodeFromTreeHierarchy(prevTree, name, relativePath));

    // 2) 로컬 디스크(C:\Users\user\Documents\code) 실제 파일/폴더 삭제 API 호출
    try {
      await deleteLocalCode(currentProjectId, isDir ? '' : name, relativePath);
    } catch (e) {
      console.warn('로컬 파일/폴더 삭제 실패:', e);
    }

    // 3) 파일인 경우 상태 정리 및 다른 파일로 포커스 이동
    if (!isDir) {
      setFileContents((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });

      const normId = normalizeProjectId(currentProjectId);
      if (PROJECTS_DATA[normId]?.filePaths) {
        delete PROJECTS_DATA[normId].filePaths[name];
      }

      if (selectedFile === name) {
        const remainingFiles = Object.keys(fileContents).filter((f) => f !== name);
        setSelectedFile(remainingFiles[0] || '');
      }
    }

    setLocalSyncToast(`[삭제 완료] ${name} ${isDir ? '폴더' : '파일'}이(가) 삭제되었습니다.`);
    setTimeout(() => setLocalSyncToast(''), 4000);
  };

  const handleFileMove = async ({ name, oldRelPath, newRelPath, targetFolder, isDir }) => {
    if (!name || !oldRelPath || !newRelPath || oldRelPath === newRelPath) return;

    // 1) 트리 데이터에서 노드 이동
    setTreeData((prevTree) => moveNodeInTreeHierarchy(prevTree, name, oldRelPath, targetFolder));

    // 2) 로컬 디스크 파일 이동 API 호출
    try {
      await renameLocalCode(currentProjectId, oldRelPath, newRelPath, name, name);
    } catch (e) {
      console.warn('로컬 파일 이동 실패:', e);
    }

    // 3) PROJECTS_DATA 경로 매핑 갱신
    const normId = normalizeProjectId(currentProjectId);
    if (PROJECTS_DATA[normId]?.filePaths) {
      PROJECTS_DATA[normId].filePaths[name] = newRelPath;
    }

    // 4) 토스트 알림
    setLocalSyncToast(`[파일 위치 이동 완료] ${name} → ${targetFolder || '루트'}`);
    setTimeout(() => setLocalSyncToast(''), 4000);
  };

  const headerSubtitle = selectedFile
    ? getProjectFilePath(currentProjectId, selectedFile)
    : `${currentProjectId} (새 빈 프로젝트)`;

  return (
    <main className="content">
      <PageHeader
        compact
        title={currentProjectId}
        subtitle={headerSubtitle}
        currentUser={currentUser}
        onLogin={onLogin}
        onLogout={onLogout}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <HardDrive size={14} color="#6366f1" style={{ flexShrink: 0 }} />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            로컬 파일 실시간 연동 중:{' '}
            <strong style={{ color: '#4f46e5' }}>
              {localBaseDir}\{currentProjectId}
              {selectedFile
                ? `\\${PROJECTS_DATA[normalizeProjectId(currentProjectId)]?.filePaths?.[selectedFile] || selectedFile}`
                : ' (프로젝트 루트)'}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => setIsPathModalOpen(true)}
            title="다른 컴퓨터나 다른 폴더 경로로 로컬 소스코드 저장 위치 변경"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '3px 10px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              borderRadius: '4px',
              color: '#818cf8',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              minWidth: 'max-content',
              lineHeight: 1.3,
            }}
          >
            <FolderCog size={12} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap' }}>경로 변경</span>
          </button>
        </div>
        <span style={{ color: 'var(--text-3)', fontSize: '11px', flexShrink: 0, marginLeft: '12px' }}>
          우클릭으로 파일 추가/수정/삭제 및 드래그로 계층 변경 시 해당 로컬 경로에 즉시 반영됩니다.
        </span>
      </div>

      <div className={`workspace ${isTreeCollapsed ? 'tree-collapsed' : ''}`}>
        {/* 좌측: 파일 계층 탐색기 (우클릭 컨텍스트 메뉴로 파일 추가, 수정, 삭제 및 드래그 앤 드롭 이동) */}
        <FileTree
          items={treeData}
          activeFile={selectedFile}
          onSelect={setSelectedFile}
          enableContextMenu={true}
          onAddFile={handleFileAdd}
          onRenameFile={handleFileRename}
          onDeleteFile={handleFileDelete}
          onMoveFile={handleFileMove}
          rootLabel={`탐색기 · ${currentProjectId.toUpperCase()}`}
          isCollapsed={isTreeCollapsed}
          onToggleCollapse={setIsTreeCollapsed}
        />

        {/* 중앙: 코드 뷰어 */}
        <CodeViewer
          fileName={selectedFile || '파일 없음'}
          codeLines={
            selectedFile
              ? (fileContents[selectedFile] || [`// ${selectedFile} 내용이 없습니다.`])
              : [
                  `// [${currentProjectId}] 새 빈 프로젝트가 생성되었습니다.`,
                  '// 좌측 파일 탐색기에서 [+ 첫 파일 추가하기]를 누르거나,',
                  '// 마우스 우클릭으로 새 파일을 생성해 코드 분석을 시작하세요.',
                ]
          }
        />

        {/* 우측: 분석 범위 및 설정 패널 */}
        <AnalysisSettingsPanel
          onStartAnalysis={handleStartAnalysis}
          selectedFile={selectedFile}
          codeContent={fileContents[selectedFile] || []}
          fileContents={fileContents}
        />
      </div>

      {/* 분석 실행 모달 팝업 */}
      <AnalysisProgressPanel
        isOpen={isAnalyzing}
        onClose={handleCloseModal}
        onViewResult={handleViewResult}
        fileName={selectedFile}
        config={analysisConfig}
        result={analysisResult}
      />

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
