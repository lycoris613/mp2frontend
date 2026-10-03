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

/**
 * 파일명 및 코드 내용 기반 언어 감지 함수
 * 백엔드 Language.java 기준 (Java, JavaScript, TypeScript, Python, HTML 지원)
 * 미지원/알 수 없는 언어인 경우 isSupported: false, displayName: '확인실패' 반환
 */
export function detectLanguage(fileName, codeContent = '') {
  if (!fileName) {
    return {
      language: 'UNKNOWN',
      displayName: '확인실패',
      tag: 'FAIL',
      isSupported: false,
      message: '파일이 선택되지 않았습니다',
    };
  }

  const parts = fileName.split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';

  const LANGUAGE_MAP = {
    // TypeScript
    ts: { language: 'TYPESCRIPT', displayName: 'TypeScript', tag: 'TS', isSupported: true },
    tsx: { language: 'TYPESCRIPT', displayName: 'TypeScript (JSX)', tag: 'TSX', isSupported: true },
    // JavaScript
    js: { language: 'JAVASCRIPT', displayName: 'JavaScript', tag: 'JS', isSupported: true },
    jsx: { language: 'JAVASCRIPT', displayName: 'JavaScript (JSX)', tag: 'JSX', isSupported: true },
    mjs: { language: 'JAVASCRIPT', displayName: 'JavaScript Module', tag: 'MJS', isSupported: true },
    cjs: { language: 'JAVASCRIPT', displayName: 'CommonJS', tag: 'CJS', isSupported: true },
    // Java
    java: { language: 'JAVA', displayName: 'Java', tag: 'JAVA', isSupported: true },
    // Python
    py: { language: 'PYTHON', displayName: 'Python', tag: 'PY', isSupported: true },
    // HTML
    html: { language: 'HTML', displayName: 'HTML', tag: 'HTML', isSupported: true },
    htm: { language: 'HTML', displayName: 'HTML', tag: 'HTM', isSupported: true },
    jsp: { language: 'HTML', displayName: 'JSP / HTML', tag: 'JSP', isSupported: true },
  };

  if (ext && LANGUAGE_MAP[ext]) {
    return LANGUAGE_MAP[ext];
  }

  // 첫 줄 해시뱅(#!)으로 2차 시도
  const text = Array.isArray(codeContent) ? codeContent.join('\n') : String(codeContent || '');
  const firstLine = text.split('\n')[0]?.trim() || '';
  if (firstLine.startsWith('#!/usr/bin/env python') || firstLine.startsWith('#!/usr/bin/python')) {
    return LANGUAGE_MAP.py;
  }
  if (firstLine.startsWith('#!/usr/bin/env node') || firstLine.startsWith('#!/usr/bin/node')) {
    return LANGUAGE_MAP.js;
  }

  // 알 수 없거나 지원하지 않는 언어 -> 확인실패
  return {
    language: 'UNKNOWN',
    displayName: '확인실패',
    tag: 'FAIL',
    isSupported: false,
    message: `지원하지 않는 파일 형식 (.${ext || '확장자없음'})`,
  };
}

