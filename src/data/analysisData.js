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
  'const router = express.Router();',
  '',
  '// [기능 1] 사용자 상세 조회 (취약점: SQL Injection)',
  "router.get('/api/users', async (req, res) => {",
  '  const userId = req.query.id;',
  '  const query = `SELECT * FROM users WHERE id = ${userId}`;',
  '  const result = await db.query(query);',
  '  res.json(result.rows);',
  '});',
  '',
  '// [기능 2] 관리자 권한 인증 헬퍼 (취약점: Hardcoded Secret)',
  "const ADMIN_MASTER_KEY = 'sec_master_key_2026_super_auth_token_99x';",
  '',
  'function verifyAdminAccess(token: string) {',
  '  if (token === ADMIN_MASTER_KEY) {',
  "    return { isAdmin: true, role: 'SUPERUSER' };",
  '  }',
  "  return { isAdmin: false, role: 'GUEST' };",
  '}',
  '',
  '// [기능 3] 사용자 프로필 카드 렌더링 (취약점: Reflected XSS)',
  "router.get('/api/users/profile', (req, res) => {",
  "  const nickname = req.query.name || 'Anonymous';",
  '  const profileHtml = `<div class="profile-card"><h3>사용자: ${nickname}</h3></div>`;',
  '  res.send(profileHtml);',
  '});',
  '',
  'export default router;',
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
  estimatedMeta: '1개 파일 · 31줄',
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
