import { useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import FileTree from '../../components/common/FileTree';
import CodeViewer from '../../components/common/CodeViewer';
import AnalysisSettingsPanel from './components/AnalysisSettingsPanel';
import AnalysisProgressPanel from './components/AnalysisProgressPanel';
import { sampleCodeLines } from '../../data/analysisData';
import { PAGES } from '../../constants/navigation';

/**
 * [SCR-002] 코드 분석 화면
 * image/코드입력.png 와이어프레임 최신본 준수
 */
export default function CodeAnalysisPage({ setPage, currentUser, onLogin, onLogout }) {
  const [selectedFile, setSelectedFile] = useState('users.ts');
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  const handleStartAnalysis = (config) => {
    setPage(PAGES.RESULT);
  };

  return (
    <main className="content">
      <PageHeader
        compact
        title="payments-api"
        subtitle={`src/routes/${selectedFile}`}
        currentUser={currentUser}
        onLogin={onLogin}
        onLogout={onLogout}
      />

      <div className="workspace">
        {/* 좌측: 파일 계층 탐색기 */}
        <FileTree
          activeFile={selectedFile}
          onSelect={setSelectedFile}
          rootLabel="탐색기 · PAYMENTS-API"
        />

        {/* 중앙: 코드 뷰어 및 플로팅 분석 진행 카드 */}
        <CodeViewer
          fileName={selectedFile}
          codeLines={sampleCodeLines}
        >
          {isAnalyzing && (
            <AnalysisProgressPanel
              visible={isAnalyzing}
              percent={64}
            />
          )}
        </CodeViewer>

        {/* 우측: 분석 범위 및 설정 패널 */}
        <AnalysisSettingsPanel onStartAnalysis={handleStartAnalysis} />
      </div>
    </main>
  );
}
