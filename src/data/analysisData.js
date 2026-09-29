/**
 * 코드 분석 (SCR-002) 관련 Mock 데이터
 * image/코드입력.png 와이어프레임 최신본 준수
 */
export const analysisTreeData = [
  {
    name: 'src',
    isDir: true,
    isOpen: true,
    children: [
      {
        name: 'routes',
        isDir: true,
        isOpen: true,
        children: [
          { name: 'users.ts', isDir: false, ext: 'ts', isSelected: true },
          { name: 'payments.ts', isDir: false, ext: 'ts' },
        ],
      },
      { name: 'database.ts', isDir: false, ext: 'ts' },
      { name: 'middleware.ts', isDir: false, ext: 'ts' },
    ],
  },
  {
    name: 'tests',
    isDir: true,
    isOpen: false,
    children: [],
  },
  {
    name: 'package.json',
    isDir: false,
    ext: 'json',
  },
];

export const sampleCodeLines = [
  "import express from 'express';",
  "import db from './database';",
  '',
  "app.get('/api/users', async (req, res) => {",
  '  const userId = req.query.id;',
  '  const query = `SELECT * FROM users WHERE id = ${userId}`;',
  '  const result = await db.query(query);',
  '  res.json(result.rows);',
  '});',
];

export const analysisProgressInfo = {
  statusText: '● 분석 실행 중',
  percent: 64,
  currentFile: 'src/routes/users.ts',
  logs: [
    '14:32:21  동적 SQL 쿼리 발견',
    '14:32:22  CWE-89 규칙과 대조',
    '14:32:27  AI 신뢰도 계산 중...',
  ],
};

export const defaultAnalysisConfig = {
  title: '결제 API 점검',
  detectedLanguage: 'TypeScript',
  languageBadge: 'TS',
  scope: '현재 파일',
  scopeOptions: ['현재 파일', '전체 프로젝트'],
  rules: [
    { id: 'SQL_INJECTION', label: 'SQL 삽입', checked: true },
    { id: 'HARDCODED_SECRET', label: '하드코딩된 비밀정보', checked: true },
    { id: 'XSS', label: 'XSS', checked: true },
  ],
  estimatedTime: '약 20초',
  estimatedMeta: '1개 파일 · 187줄',
};

// 하위 호환용 flat 리스트
export const defaultFiles = [
  'routes',
  'users.ts',
  'payments.ts',
  'database.ts',
  'middleware.ts',
  'tests',
  'package.json',
];

export const sampleProgressLogs = [
  '처리 중  src/routes/users.ts',
  '14:32:21  동적 SQL 쿼리 발견',
  '14:32:22  CWE-89 규칙과 대조',
  '14:32:27  AI 신뢰도 계산 중...',
];
