/**
 * 취약점 분석 결과 (SCR-003) 관련 Mock 데이터
 * image/결과화면.png 와이어프레임 최신본 준수
 * 개발자 B 담당: 파일별 상세 코드, 취약점 정보, Diff 데이터
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
          { name: 'users.ts', isDir: false, ext: 'TS', hasFinding: true, isSelected: true },
          { name: 'payments.ts', isDir: false, ext: 'TS', hasFinding: true },
        ],
      },
      { name: 'database.ts', isDir: false, ext: 'TS', hasFinding: false },
      { name: 'middleware.ts', isDir: false, ext: 'TS', hasFinding: false },
    ],
  },
  { name: 'config.ts', isDir: false, ext: 'TS', hasFinding: true },
  { name: 'auth.ts', isDir: false, ext: 'TS', hasFinding: true },
  { name: 'package.json', isDir: false, ext: 'JSON', hasFinding: false },
];

/**
 * 파일별 취약점 분석 결과 맵
 * - hasFinding: true인 경우 취약점 코드 라인, AI 분석 상세, Before/After Diff 제공
 * - hasFinding: false인 경우 분석 결과가 없는 클린 코드로 팝업 안내 트리거
 * - fullCleanCodeLines: '전체 코드' 패치 시 파일 전체를 안전하게 대체할 완성형 코드
 */
export const fileFindingData = {
  'users.ts': {
    hasFinding: true,
    codeLines: [
      "import express from 'express';",
      "import db from './database';",
      "",
      "app.get('/api/users', async (req, res) => {",
      "  const userId = req.query.id;",
      "  const query = `SELECT * FROM users WHERE id = ${userId}`;",
      "  const result = await db.query(query);",
      "  res.json(result.rows);",
      "});",
    ],
    vulnLineIndices: [5], // 라인 6 (0-indexed: 5)
    tagLabel: 'SQL 삽입 가능성 · 치명적',
    finding: {
      id: 1,
      vulnerabilityType: 'SQL_INJECTION',
      severity: 'CRITICAL',
      title: 'SQL 삽입 취약점',
      severityBadge: '치명적 98% · CWE-89',
      cwe: 'CWE-89',
      confidence: '97%',
      status: 'OPEN',
      detectionSource: {
        title: '탐지 근거 · 룰 기반',
        ruleId: 'SQLI-001',
        ruleTitle: '문자열 연결 SQL 쿼리',
        matchedCode: 'SELECT * FROM users WHERE id = ${userId}',
      },
      description: '사용자 입력값이 검증 없이 SQL 쿼리 문자열에 직접 삽입됩니다.',
      recommendation: '문자열 보간 제거, 매개변수화 쿼리 사용 및 입력 ID 형식 검증.',
      impact: '인가되지 않은 데이터 조회, 데이터베이스 변조 및 명령 실행 위험이 있습니다.',
    },
    diff: {
      fileName: 'users.ts',
      startLine: 5,
      beforeLines: [
        '  const userId = req.query.id;',
        '  const query = `SELECT * FROM users WHERE id = ${userId}`;',
        '  const result = await db.query(query);',
      ],
      afterLines: [
        '  const userId = validateUserId(req.query.id);',
        "  const query = 'SELECT * FROM users WHERE id = $1';",
        '  const result = await db.query(query, [userId]);',
      ],
      fullCleanCodeLines: [
        "import express from 'express';",
        "import db from './database';",
        "import { validateUserId } from '../utils/validation';",
        "",
        "const app = express();",
        "",
        "app.get('/api/users', async (req, res) => {",
        "  const userId = validateUserId(req.query.id);",
        "  const query = 'SELECT * FROM users WHERE id = $1';",
        "  const result = await db.query(query, [userId]);",
        "  res.json(result.rows);",
        "});",
      ],
    },
  },

  'payments.ts': {
    hasFinding: true,
    codeLines: [
      "import express from 'express';",
      "import Stripe from 'stripe';",
      "",
      "const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);",
      "",
      "export async function processPayment(req, res) {",
      "  const { amount, token } = req.body;",
      "  const charge = await stripe.charges.create({ amount, currency: 'usd', source: token });",
      "  res.json({ success: true, charge });",
      "}",
    ],
    vulnLineIndices: [3], // 라인 4 (0-indexed: 3)
    tagLabel: '민감 정보 노출 가능성 · 높음',
    finding: {
      id: 2,
      vulnerabilityType: 'HARDCODED_SECRET',
      severity: 'HIGH',
      title: '하드코딩된 비밀정보 취약점',
      severityBadge: '높음 91% · CWE-798',
      cwe: 'CWE-798',
      confidence: '93%',
      status: 'OPEN',
      detectionSource: {
        title: '탐지 근거 · 환경변수 검사',
        ruleId: 'SEC-004',
        ruleTitle: '환경변수 직접 노출 위험',
        matchedCode: 'const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);',
      },
      description: 'API 키 및 시크릿 토큰의 유효성 검증과 보호 장치 없이 인스턴스를 초기화하고 있습니다.',
      recommendation: '키 관리 서비스(KMS) 연동 및 런타임 보안 마스킹 적용.',
      impact: '키 유출 시 외부 결제 API 무단 호출 및 결제 정보 조작 위험이 있습니다.',
    },
    diff: {
      fileName: 'payments.ts',
      startLine: 4,
      beforeLines: [
        'const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);',
      ],
      afterLines: [
        "import { getSecureSecret } from '../config/vault';",
        "const stripe = new Stripe(await getSecureSecret('STRIPE_KEY'));",
      ],
      fullCleanCodeLines: [
        "import express from 'express';",
        "import Stripe from 'stripe';",
        "import { getSecureSecret } from '../config/vault';",
        "",
        "export async function processPayment(req, res) {",
        "  const secretKey = await getSecureSecret('STRIPE_KEY');",
        "  const stripe = new Stripe(secretKey);",
        "  const { amount, token } = req.body;",
        "  const charge = await stripe.charges.create({ amount, currency: 'usd', source: token });",
        "  res.json({ success: true, charge });",
        "}",
      ],
    },
  },

  'auth.ts': {
    hasFinding: true,
    codeLines: [
      "import jwt from 'jsonwebtoken';",
      "",
      "export function verifyToken(token: string) {",
      "  return jwt.verify(token, 'hardcoded_jwt_secret_key_123');",
      "}",
    ],
    vulnLineIndices: [3], // 라인 4 (0-indexed: 3)
    tagLabel: '하드코딩된 시크릿 · 치명적',
    finding: {
      id: 3,
      vulnerabilityType: 'HARDCODED_SECRET',
      severity: 'CRITICAL',
      title: '하드코딩된 JWT 서명 키',
      severityBadge: '치명적 99% · CWE-798',
      cwe: 'CWE-798',
      confidence: '99%',
      status: 'OPEN',
      detectionSource: {
        title: '탐지 근거 · 룰 기반',
        ruleId: 'JWT-002',
        ruleTitle: '하드코딩된 서명 키',
        matchedCode: "jwt.verify(token, 'hardcoded_jwt_secret_key_123')",
      },
      description: 'JWT 검증 키가 소스코드 내 평문 문자열로 노출되어 있어 누구나 토큰을 위조할 수 있습니다.',
      recommendation: '환경 변수 또는 비밀 관리자(Vault)에서 키를 주입받도록 수정하세요.',
      impact: '인증 우회 및 임의 사용자 권한 획득 가능',
    },
    diff: {
      fileName: 'auth.ts',
      startLine: 4,
      beforeLines: [
        "  return jwt.verify(token, 'hardcoded_jwt_secret_key_123');",
      ],
      afterLines: [
        '  const secret = process.env.JWT_SECRET;',
        '  if (!secret) throw new Error("JWT_SECRET missing");',
        '  return jwt.verify(token, secret);',
      ],
      fullCleanCodeLines: [
        "import jwt from 'jsonwebtoken';",
        "",
        "export function verifyToken(token: string) {",
        "  const secret = process.env.JWT_SECRET;",
        "  if (!secret) throw new Error('JWT_SECRET missing');",
        "  return jwt.verify(token, secret);",
        "}",
      ],
    },
  },

  'config.ts': {
    hasFinding: true,
    codeLines: [
      "export const appConfig = {",
      "  env: 'development',",
      "  port: 3000,",
      "  cors: { origin: '*' },",
      "  debug: true,",
      "};",
    ],
    vulnLineIndices: [3], // 라인 4 (0-indexed: 3)
    tagLabel: 'CORS 와일드카드 허용 · 중간',
    finding: {
      id: 4,
      vulnerabilityType: 'XSS',
      severity: 'MEDIUM',
      title: '과도하게 허용된 CORS 정책',
      severityBadge: '중간 78% · CWE-942',
      cwe: 'CWE-942',
      confidence: '85%',
      status: 'OPEN',
      detectionSource: {
        title: '탐지 근거 · 설정 감사',
        ruleId: 'CORS-001',
        ruleTitle: '와일드카드 오리진 허용',
        matchedCode: "cors: { origin: '*' },",
      },
      description: "CORS origin이 '*'로 설정되어 있어 악의적인 도메인에서의 교차 출처 요청이 허용될 수 있습니다.",
      recommendation: '신뢰할 수 있는 도메인 화이트리스트를 명시적으로 지정하세요.',
      impact: '민감한 사용자 세션 데이터 탈취 위험',
    },
    diff: {
      fileName: 'config.ts',
      startLine: 4,
      beforeLines: [
        "  cors: { origin: '*' },",
      ],
      afterLines: [
        "  cors: { origin: ['https://app.codeguard.io'] },",
      ],
      fullCleanCodeLines: [
        "export const appConfig = {",
        "  env: 'production',",
        "  port: 3000,",
        "  cors: { origin: ['https://app.codeguard.io'] },",
        "  debug: false,",
        "};",
      ],
    },
  },

  'database.ts': {
    hasFinding: false,
    codeLines: [
      "import { Pool } from 'pg';",
      "",
      "export const pool = new Pool({",
      "  connectionString: process.env.DATABASE_URL,",
      "  max: 20,",
      "  idleTimeoutMillis: 30000,",
      "  connectionTimeoutMillis: 2000,",
      "});",
      "",
      "export async function query(text: string, params?: any[]) {",
      "  const start = Date.now();",
      "  const res = await pool.query(text, params);",
      "  const duration = Date.now() - start;",
      "  return res;",
      "}",
    ],
    vulnLineIndices: [],
    tagLabel: '',
    finding: null,
    diff: null,
  },

  'middleware.ts': {
    hasFinding: false,
    codeLines: [
      "import { Request, Response, NextFunction } from 'express';",
      "",
      "export function requestLogger(req: Request, res: Response, next: NextFunction) {",
      "  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);",
      "  next();",
      "}",
      "",
      "export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {",
      "  console.error(err.stack);",
      "  res.status(500).json({ error: 'Internal Server Error' });",
      "}",
    ],
    vulnLineIndices: [],
    tagLabel: '',
    finding: null,
    diff: null,
  },

  'package.json': {
    hasFinding: false,
    codeLines: [
      "{",
      '  "name": "payments-api",',
      '  "version": "1.0.0",',
      '  "dependencies": {',
      '    "express": "^4.18.2",',
      '    "pg": "^8.11.3",',
      '    "stripe": "^14.10.0"',
      "  }",
      "}",
    ],
    vulnLineIndices: [],
    tagLabel: '',
    finding: null,
    diff: null,
  },
};

/**
 * 실제 등록된 취약점 데이터 기반 동적 심각도 집계 계산 함수
 * @param {Object} fileData - 파일별 취약점 데이터
 * @param {Array<number>} resolvedIds - 해결 완료된 취약점 ID 목록
 */
export function calculateDynamicFindingTotals(fileData = fileFindingData, resolvedIds = []) {
  let critical = 0;
  let high = 0;
  let mediumLow = 0;
  let total = 0;

  Object.values(fileData).forEach((item) => {
    if (item.hasFinding && item.finding) {
      if (resolvedIds.includes(item.finding.id)) return;
      total++;
      const sev = item.finding.severity;
      if (sev === 'CRITICAL') critical++;
      else if (sev === 'HIGH') high++;
      else mediumLow++;
    }
  });

  return { total, critical, high, mediumLow };
}

/**
 * 실제 등록된 취약점 데이터 기반 동적 유형별 탭 개수 계산 함수
 * @param {Object} fileData - 파일별 취약점 데이터
 * @param {Array<number>} resolvedIds - 해결 완료된 취약점 ID 목록
 */
export function calculateDynamicTypeTabs(fileData = fileFindingData, resolvedIds = []) {
  const counts = {
    SQL_INJECTION: 0,
    HARDCODED_SECRET: 0,
    XSS: 0,
  };

  let totalActive = 0;

  Object.values(fileData).forEach((item) => {
    if (item.hasFinding && item.finding) {
      if (resolvedIds.includes(item.finding.id)) return;
      totalActive++;
      const type = item.finding.vulnerabilityType;
      if (counts[type] !== undefined) {
        counts[type]++;
      }
    }
  });

  return [
    { id: 'ALL', label: '전체', count: totalActive, active: true },
    { id: 'SQL_INJECTION', label: 'SQL 삽입', count: counts.SQL_INJECTION, active: false },
    { id: 'HARDCODED_SECRET', label: '하드코딩된 비밀정보', count: counts.HARDCODED_SECRET, active: false },
    { id: 'XSS', label: '크로스사이트 스크립팅', count: counts.XSS, active: false },
  ];
}

// 원본 복구용 초기 스냅샷 딥카피 보관
const ORIGINAL_FILE_FINDING_SNAPSHOT = JSON.parse(JSON.stringify(fileFindingData));
const ORIGINAL_RESULT_TREE_SNAPSHOT = JSON.parse(JSON.stringify(resultTreeData));

/**
 * 모든 파일의 소스코드와 취약점 정보를 최초의 문제점 상태로 복구하여 저장하는 함수
 */
export function resetFileFindingData() {
  const restored = JSON.parse(JSON.stringify(ORIGINAL_FILE_FINDING_SNAPSHOT));
  Object.keys(restored).forEach((key) => {
    fileFindingData[key] = restored[key];
  });
  return {
    fileFindingData: restored,
    resultTreeData: JSON.parse(JSON.stringify(ORIGINAL_RESULT_TREE_SNAPSHOT)),
  };
}

// 초기 기본 집계 (실제 데이터 기반)
export const vulnerabilityFilterTabs = calculateDynamicTypeTabs();
export const findingTotals = calculateDynamicFindingTotals();

// 하위 호환성용 단일 객체
export const currentFinding = fileFindingData['users.ts'].finding;
export const sampleDiff = fileFindingData['users.ts'].diff;
