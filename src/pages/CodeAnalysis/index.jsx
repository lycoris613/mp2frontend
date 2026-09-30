import { useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import FileTree from '../../components/common/FileTree';
import CodeViewer from '../../components/common/CodeViewer';
import AnalysisSettingsPanel from './components/AnalysisSettingsPanel';
import AnalysisProgressPanel from './components/AnalysisProgressPanel';
import { analysisTreeData, sampleCodeLines } from '../../data/analysisData';
import { PAGES } from '../../constants/navigation';

const initialFileContents = {
  'users.ts': sampleCodeLines,
  'payments.ts': [
    "import express from 'express';",
    "import Stripe from 'stripe';",
    '',
    "const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);",
    '',
    "export async function processPayment(req, res) {",
    "  const { amount, token } = req.body;",
    "  const charge = await stripe.charges.create({ amount, currency: 'usd', source: token });",
    "  res.json({ success: true, charge });",
    "}",
  ],
  'database.ts': [
    "import { Pool } from 'pg';",
    '',
    "export const pool = new Pool({",
    "  connectionString: process.env.DATABASE_URL,",
    "});",
  ],
  'middleware.ts': [
    "export function authMiddleware(req, res, next) {",
    "  const token = req.headers.authorization;",
    "  if (!token) return res.status(401).json({ error: 'Unauthorized' });",
    "  next();",
    "}",
  ],
  'package.json': [
    '{',
    '  "name": "payments-api",',
    '  "version": "1.0.0",',
    '  "dependencies": {',
    '    "express": "^4.18.2",',
    '    "pg": "^8.11.3"',
    '  }',
    '}',
  ],
};

/**
 * [SCR-002] 코드 분석 화면
 * image/코드입력.png 와이어프레임 최신본 준수
 * 개발자 B 담당: 파일 탐색기, + 로컬 파일 추가, 코드 뷰어, 분석 설정 연동
 */
export default function CodeAnalysisPage({ setPage, currentUser, onLogin, onLogout }) {
  const [treeData, setTreeData] = useState(analysisTreeData);
  const [fileContents, setFileContents] = useState(initialFileContents);
  const [selectedFile, setSelectedFile] = useState('users.ts');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisConfig, setAnalysisConfig] = useState(null);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  const handleStartAnalysis = (config) => {
    setAnalysisConfig(config);
    setIsAnalyzing(true);
  };

  const handleCloseModal = () => {
    setIsAnalyzing(false);
  };

  const handleViewResult = () => {
    setIsAnalyzing(false);
    setPage(PAGES.RESULT);
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
        if (node.name === 'src' && node.isDir) {
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

  const getSubTitlePath = () => {
    if (selectedFile === 'users.ts' || selectedFile === 'payments.ts') {
      return `src/routes/${selectedFile}`;
    }
    if (selectedFile === 'package.json') {
      return 'package.json';
    }
    return `src/${selectedFile}`;
  };

  return (
    <main className="content">
      <PageHeader
        compact
        title="payments-api"
        subtitle={getSubTitlePath()}
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
          rootLabel="탐색기 · PAYMENTS-API"
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
      />
    </main>
  );
}
