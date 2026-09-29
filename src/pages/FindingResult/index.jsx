import { useState } from 'react';
import FileTree from '../../components/common/FileTree';
import CodeViewer from '../../components/common/CodeViewer';
import VulnerabilityTypeTabs from './components/VulnerabilityTypeTabs';
import SeveritySummary from './components/SeveritySummary';
import FindingDetailPanel from './components/FindingDetailPanel';
import CodeDiffPanel from './components/CodeDiffPanel';
import { sampleCodeLines } from '../../data/analysisData';

/**
 * [SCR-003] 취약점 분석 결과 화면
 * image/결과화면.png 와이어프레임 최신본 준수
 */
export default function FindingResultPage() {
  const [selectedFile, setSelectedFile] = useState('users.ts');
  const [activeTab, setActiveTab] = useState('SQL_INJECTION');
  const [codeScope, setCodeScope] = useState('finding');

  return (
    <main className="content">
      {/* 상단 헤더 */}
      <header className="topbar">
        <div>
          <h1>취약점 분석 결과</h1>
          <p>payments-api · src/routes/{selectedFile}</p>
        </div>

        <div className="top-actions">
          <button className="outline-btn report-btn">보고서 내보내기</button>
          <span className="avatar"></span>
          <div className="user">
            <b>지웅</b>
            <small>Frontend / LLM</small>
          </div>
        </div>
      </header>

      <div className="page-pad result-page">
        {/* 필터 탭 & 심각도 요약 바 */}
        <div className="filter-summary-row">
          <VulnerabilityTypeTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <SeveritySummary />
        </div>

        {/* 상단 3-Column 메인 그리드 */}
        <div className="result-grid-3col">
          {/* 좌측: 파일 트리 */}
          <FileTree
            activeFile={selectedFile}
            onSelect={setSelectedFile}
            showFindingDot={true}
            className="filetree result-tree"
            rootLabel="탐색기 · PAYMENTS-API"
          />

          {/* 중앙: 코드 뷰어 (라인 6 테두리 하이라이트 & 하단 태그) */}
          <CodeViewer
            fileName={selectedFile}
            codeLines={sampleCodeLines}
            vulnLineIndices={[5]} // 0-indexed (라인 6)
            tagLabel="SQL 삽입 가능성 · 치명적"
            className="editor result-editor"
          />

          {/* 우측: 취약점 상세 정보 & AI 분석 */}
          <FindingDetailPanel
            onScopeChange={setCodeScope}
          />
        </div>

        {/* 하단: BEFORE / AFTER Diff 비교 패널 */}
        <CodeDiffPanel fileName={selectedFile} />
      </div>
    </main>
  );
}
