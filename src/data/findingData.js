/**
 * 취약점 분석 결과 (SCR-003) 관련 Mock 데이터
 * image/결과화면.png 와이어프레임 최신본 준수
 */
export const resultTreeData = [
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
          { name: 'users.ts', isDir: false, hasFinding: true, isSelected: true },
          { name: 'payments.ts', isDir: false, hasFinding: true },
        ],
      },
      { name: 'database.ts', isDir: false, hasFinding: false },
      { name: 'middleware.ts', isDir: false, hasFinding: false },
    ],
  },
  { name: 'config.ts', isDir: false, hasFinding: true },
  { name: 'auth.ts', isDir: false, hasFinding: true },
];

export const vulnerabilityFilterTabs = [
  { id: 'SQL_INJECTION', label: 'SQL 삽입', count: 6, active: true },
  { id: 'HARDCODED_SECRET', label: '하드코딩된 비밀정보', count: 12, active: false },
  { id: 'XSS', label: '크로스사이트 스크립팅', count: 5, active: false },
];

export const findingTotals = {
  total: 23,
  critical: 3,
  high: 6,
  mediumLow: 14,
};

export const currentFinding = {
  id: 1,
  title: 'SQL 삽입 취약점',
  severityBadge: '치명적 98% · CWE-89',
  cwe: 'CWE-89',
  confidence: '97%',
  detectionSource: {
    title: '탐지 근거 · 룰 기반',
    ruleId: 'SQLI-001',
    ruleTitle: '문자열 연결 SQL 쿼리',
    matchedCode: 'SELECT * FROM users WHERE id = ${userId}',
  },
  description: '사용자 입력값이 검증 없이 SQL 쿼리 문자열에 직접 삽입됩니다.',
  recommendation: '문자열 보간 제거, 매개변수화 쿼리 사용 및 입력 ID 형식 검증.',
  impact: '인가되지 않은 데이터 조회, 데이터베이스 변조 및 명령 실행 위험이 있습니다.',
};

export const sampleDiff = {
  fileName: 'users.ts',
  startLine: 5,
  beforeLines: [
    'const userId = req.query.id;',
    'const query = `SELECT * FROM users WHERE id = ${userId}`;',
    'const result = await db.query(query);',
  ],
  afterLines: [
    'const userId = validateUserId(req.query.id);',
    "const query = 'SELECT * FROM users WHERE id = $1';",
    'const result = await db.query(query, [userId]);',
  ],
};

// 하위 호환성 flat 배열
export const resultFiles = [
  { name: 'routes', hasFinding: false, isDir: true },
  { name: 'users.ts', hasFinding: true, isDir: false },
  { name: 'payments.ts', hasFinding: true, isDir: false },
  { name: 'database.ts', hasFinding: false, isDir: false },
  { name: 'config.ts', hasFinding: true, isDir: false },
  { name: 'auth.ts', hasFinding: true, isDir: false },
];
