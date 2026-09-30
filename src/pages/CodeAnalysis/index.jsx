import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import FileTree from '../../components/common/FileTree';
import CodeViewer from '../../components/common/CodeViewer';
import AnalysisSettingsPanel from './components/AnalysisSettingsPanel';
import AnalysisProgressPanel from './components/AnalysisProgressPanel';
import {
  normalizeProjectId,
  getProjectTreeData,
  getProjectFileFindingData,
  getProjectDefaultFile,
  getProjectFilePath,
} from '../../data/findingData';
import { executeAnalysis } from '../../services/analysisService';
import { PAGES } from '../../constants/navigation';

/**
 * 프로젝트별 초기 파일 내용 맵 생성 헬퍼
 */
const getInitialFileContents = (projId) => {
  const fileData = getProjectFileFindingData(projId);
  const contents = {};
  Object.keys(fileData).forEach((fileName) => {
    contents[fileName] = fileData[fileName].codeLines || [];
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
    setTreeData(getProjectTreeData(currentProjectId));
    setFileContents(getInitialFileContents(currentProjectId));
    setSelectedFile(getProjectDefaultFile(currentProjectId));
  }, [currentProjectId]);

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

  const handleFileAdd = ({ name, content, ext }) => {
    const lines = content ? content.split(/\r?\n/) : ['// 빈 파일입니다.'];
    setFileContents((prev) => ({
      ...prev,
      [name]: lines,
    }));

    setTreeData((prevTree) => {
      const existsInTree = (nodes) => {
        for (const n of nodes) {
          if (!n.isDir && n.name === name) return true;
          if (n.children && existsInTree(n.children)) return true;
        }
        return false;
      };

      if (existsInTree(prevTree)) {
        return prevTree;
      }

      let added = false;
      const updated = prevTree.map((node) => {
        if ((node.name === 'src' || node.name === 'internal') && node.isDir) {
          added = true;
          return {
            ...node,
            children: [
              ...(node.children || []),
              { name, isDir: false, ext: ext || 'FILE' },
            ],
          };
        }
        return node;
      });

      if (!added) {
        return [...prevTree, { name, isDir: false, ext: ext || 'FILE' }];
      }
      return updated;
    });

    setSelectedFile(name);
  };

  const headerSubtitle = getProjectFilePath(currentProjectId, selectedFile);

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

      <div className={`workspace ${isTreeCollapsed ? 'tree-collapsed' : ''}`}>
        {/* 좌측: 파일 계층 탐색기 (+ 로컬 파일 추가 기능 및 전체 접기/펼치기) */}
        <FileTree
          items={treeData}
          activeFile={selectedFile}
          onSelect={setSelectedFile}
          showAddButton={true}
          onAddFile={handleFileAdd}
          rootLabel={`탐색기 · ${currentProjectId.toUpperCase()}`}
          isCollapsed={isTreeCollapsed}
          onToggleCollapse={setIsTreeCollapsed}
        />

        {/* 중앙: 코드 뷰어 */}
        <CodeViewer
          fileName={selectedFile}
          codeLines={fileContents[selectedFile] || [`// ${selectedFile} 내용이 없습니다.`]}
        />

        {/* 우측: 분석 범위 및 설정 패널 */}
        <AnalysisSettingsPanel onStartAnalysis={handleStartAnalysis} />
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
    </main>
  );
}
