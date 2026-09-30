/**
 * 백엔드 REST API 설계서(v1) 완벽 대응 Mock 데이터 저장소
 * - 백엔드 연동 전 프론트엔드 단독 테스트 및 시뮬레이션용
 * - CRUD 및 상태 변경(해결 완료, 무시, 분석 생성 등)이 메모리 상에서 실시간 동기화됨
 */

// 1. 대시보드 통계 Mock Data (GET /api/v1/dashboard/summary)
export const initialDashboardSummary = {
  weeklyAnalysisCount: 128,
  weeklyAnalysisDelta: 0.18,
  totalFindings: 47,
  criticalCount: 3,
  resolutionRate: 0.864,
  resolutionRateDelta: 0.062,
  averageDurationSeconds: 138,
  severityTrend: [
    { date: '09/20', critical: 1, high: 2, medium: 4, low: 3 },
    { date: '09/21', critical: 0, high: 3, medium: 5, low: 2 },
    { date: '09/22', critical: 2, high: 1, medium: 3, low: 4 },
    { date: '09/23', critical: 1, high: 4, medium: 6, low: 1 },
    { date: '09/24', critical: 3, high: 2, medium: 4, low: 5 },
    { date: '09/25', critical: 0, high: 5, medium: 3, low: 2 },
    { date: '09/26', critical: 2, high: 3, medium: 2, low: 4 },
  ],
  typeDistribution: [
    { type: 'SQL_INJECTION', displayName: 'SQL 삽입', count: 18, ratio: 0.38 },
    { type: 'HARDCODED_SECRET', displayName: '하드코딩된 비밀정보', count: 14, ratio: 0.30 },
    { type: 'XSS', displayName: '크로스사이트 스크립팅', count: 9, ratio: 0.19 },
    { type: 'CORS_MISCONFIG', displayName: 'CORS 설정 오류', count: 6, ratio: 0.13 },
  ],
  recentAnalyses: [
    {
      analysisId: 128,
      title: 'payments-api',
      language: 'TypeScript',
      overallSeverity: 'CRITICAL',
      riskScore: 82,
      totalFiles: 4,
      totalFindings: 23,
      createdAt: '2026-09-27T14:32:18',
    },
    {
      analysisId: 127,
      title: 'auth-service',
      language: 'Go',
      overallSeverity: 'HIGH',
      riskScore: 68,
      totalFiles: 5,
      totalFindings: 11,
      createdAt: '2026-09-26T10:05:44',
    },
    {
      analysisId: 126,
      title: 'admin-console',
      language: 'TypeScript',
      overallSeverity: 'LOW',
      riskScore: 21,
      totalFiles: 8,
      totalFindings: 4,
      createdAt: '2026-09-25T16:20:10',
    },
  ],
};

// 2. 분석 목록 Mock Data (GET /api/v1/analyses)
export const initialAnalyses = [
  {
    analysisId: 128,
    title: 'payments-api',
    status: 'COMPLETED',
    language: 'TypeScript',
    overallSeverity: 'CRITICAL',
    riskScore: 82,
    totalFiles: 4,
    totalFindings: 23,
    createdAt: '2026-09-27T14:32:18',
  },
  {
    analysisId: 127,
    title: 'auth-service',
    status: 'COMPLETED',
    language: 'Go',
    overallSeverity: 'HIGH',
    riskScore: 68,
    totalFiles: 5,
    totalFindings: 11,
    createdAt: '2026-09-26T10:05:44',
  },
  {
    analysisId: 126,
    title: 'admin-console',
    status: 'COMPLETED',
    language: 'TypeScript',
    overallSeverity: 'LOW',
    riskScore: 21,
    totalFiles: 8,
    totalFindings: 4,
    createdAt: '2026-09-25T16:20:10',
  },
];

// 3. 분석 상세 요약 Mock Data (GET /api/v1/analyses/{id})
export const initialAnalysisDetails = {
  128: {
    analysisId: 128,
    title: 'payments-api',
    status: 'COMPLETED',
    overallSeverity: 'CRITICAL',
    totalFiles: 4,
    totalFindings: 23,
    severityCount: { CRITICAL: 3, HIGH: 6, MEDIUM: 9, LOW: 5 },
    typeCount: [
      { type: 'SQL_INJECTION', displayName: 'SQL 삽입', cweId: 'CWE-89', count: 6 },
      { type: 'HARDCODED_SECRET', displayName: '하드코딩된 비밀정보', cweId: 'CWE-798', count: 12 },
      { type: 'XSS', displayName: '크로스사이트 스크립팅', cweId: 'CWE-79', count: 5 },
    ],
    ruleCount: [
      { ruleId: 'SQLI-003', count: 4 },
      { ruleId: 'SECRET-002', count: 9 },
      { ruleId: 'XSS-001', count: 5 },
    ],
    resolutionRate: 0.0,
    durationSeconds: 47,
    startedAt: '2026-09-27T14:32:19',
    completedAt: '2026-09-27T14:33:06',
  },
};

// 4. 파일 트리 Mock Data (GET /api/v1/analyses/{id}/files)
export const initialAnalysisFiles = {
  128: [
    {
      fileId: 501,
      relativePath: 'src/routes/users.ts',
      fileName: 'users.ts',
      language: 'TypeScript',
      fileSizeBytes: 412,
      lineCount: 9,
      findingCount: 6,
      highestSeverity: 'CRITICAL',
    },
    {
      fileId: 502,
      relativePath: 'src/routes/payments.ts',
      fileName: 'payments.ts',
      language: 'TypeScript',
      fileSizeBytes: 980,
      lineCount: 11,
      findingCount: 2,
      highestSeverity: 'HIGH',
    },
    {
      fileId: 503,
      relativePath: 'src/auth.ts',
      fileName: 'auth.ts',
      language: 'TypeScript',
      fileSizeBytes: 245,
      lineCount: 5,
      findingCount: 1,
      highestSeverity: 'CRITICAL',
    },
    {
      fileId: 504,
      relativePath: 'src/config.ts',
      fileName: 'config.ts',
      language: 'TypeScript',
      fileSizeBytes: 180,
      lineCount: 6,
      findingCount: 1,
      highestSeverity: 'MEDIUM',
    },
    {
      fileId: 505,
      relativePath: 'src/database.ts',
      fileName: 'database.ts',
      language: 'TypeScript',
      fileSizeBytes: 520,
      lineCount: 14,
      findingCount: 0,
      highestSeverity: null,
    },
    {
      fileId: 506,
      relativePath: 'src/middleware.ts',
      fileName: 'middleware.ts',
      language: 'TypeScript',
      fileSizeBytes: 430,
      lineCount: 10,
      findingCount: 0,
      highestSeverity: null,
    },
    {
      fileId: 507,
      relativePath: 'package.json',
      fileName: 'package.json',
      language: 'JSON',
      fileSizeBytes: 195,
      lineCount: 8,
      findingCount: 0,
      highestSeverity: null,
    },
  ],
};

// 5. 파일 본문 및 마커 Mock Data (GET /api/v1/analyses/{id}/files/{fileId})
export const initialFileContents = {
  501: {
    fileId: 501,
    relativePath: 'src/routes/users.ts',
    fileName: 'users.ts',
    language: 'TypeScript',
    lineCount: 9,
    content: `import express from 'express';
import db from './database';

app.get('/api/users', async (req, res) => {
  const userId = req.query.id;
  const query = \`SELECT * FROM users WHERE id = \${userId}\`;
  const result = await db.query(query);
  res.json(result.rows);
});`,
    findingMarkers: [
      {
        findingId: 9001,
        startLine: 6,
        endLine: 6,
        severity: 'CRITICAL',
        label: 'SQL 삽입 가능성 · 치명적',
      },
    ],
  },
  502: {
    fileId: 502,
    relativePath: 'src/routes/payments.ts',
    fileName: 'payments.ts',
    language: 'TypeScript',
    lineCount: 11,
    content: `import express from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function processPayment(req, res) {
  const { amount, token } = req.body;
  const charge = await stripe.charges.create({ amount, currency: 'usd', source: token });
  res.json({ success: true, charge });
}`,
    findingMarkers: [
      {
        findingId: 9002,
        startLine: 4,
        endLine: 4,
        severity: 'HIGH',
        label: '민감 정보 노출 가능성 · 높음',
      },
    ],
  },
  503: {
    fileId: 503,
    relativePath: 'src/auth.ts',
    fileName: 'auth.ts',
    language: 'TypeScript',
    lineCount: 5,
    content: `import jwt from 'jsonwebtoken';

export function verifyToken(token: string) {
  return jwt.verify(token, 'hardcoded_jwt_secret_key_123');
}`,
    findingMarkers: [
      {
        findingId: 9003,
        startLine: 4,
        endLine: 4,
        severity: 'CRITICAL',
        label: '하드코딩된 시크릿 · 치명적',
      },
    ],
  },
  504: {
    fileId: 504,
    relativePath: 'src/config.ts',
    fileName: 'config.ts',
    language: 'TypeScript',
    lineCount: 6,
    content: `export const appConfig = {
  env: 'development',
  port: 3000,
  cors: { origin: '*' },
  debug: true,
};`,
    findingMarkers: [
      {
        findingId: 9004,
        startLine: 4,
        endLine: 4,
        severity: 'MEDIUM',
        label: 'CORS 와일드카드 허용 · 중간',
      },
    ],
  },
  505: {
    fileId: 505,
    relativePath: 'src/database.ts',
    fileName: 'database.ts',
    language: 'TypeScript',
    lineCount: 14,
    content: `import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return res;
}`,
    findingMarkers: [],
  },
  506: {
    fileId: 506,
    relativePath: 'src/middleware.ts',
    fileName: 'middleware.ts',
    language: 'TypeScript',
    lineCount: 10,
    content: `import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
  next();
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
}`,
    findingMarkers: [],
  },
  507: {
    fileId: 507,
    relativePath: 'package.json',
    fileName: 'package.json',
    language: 'JSON',
    lineCount: 8,
    content: `{
  "name": "payments-api",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "stripe": "^14.10.0"
  }
}`,
    findingMarkers: [],
  },
};

// 6. 취약점 목록 Mock Data (GET /api/v1/analyses/{id}/findings)
export const initialFindings = {
  128: [
    {
      findingId: 9001,
      fileId: 501,
      relativePath: 'src/routes/users.ts',
      ruleId: 'SQLI-003',
      ruleTitle: '템플릿 리터럴 SQL 삽입',
      vulnerabilityType: 'SQL_INJECTION',
      displayName: 'SQL 삽입 취약점',
      cweId: 'CWE-89',
      severity: 'CRITICAL',
      status: 'OPEN',
      startLine: 6,
      endLine: 6,
      codeSnippet: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
      llmStatus: 'SUCCESS',
      confidence: 97,
      verdict: 'TRUE_POSITIVE',
      summary: '사용자 입력값이 검증 없이 SQL 쿼리 문자열에 직접 삽입됩니다.',
    },
    {
      findingId: 9002,
      fileId: 502,
      relativePath: 'src/routes/payments.ts',
      ruleId: 'SECRET-004',
      ruleTitle: '환경변수 직접 노출 위험',
      vulnerabilityType: 'HARDCODED_SECRET',
      displayName: '하드코딩된 비밀정보 취약점',
      cweId: 'CWE-798',
      severity: 'HIGH',
      status: 'OPEN',
      startLine: 4,
      endLine: 4,
      codeSnippet: 'const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);',
      llmStatus: 'SUCCESS',
      confidence: 93,
      verdict: 'TRUE_POSITIVE',
      summary: 'API 키 및 시크릿 토큰의 보호 장치 없이 인스턴스를 초기화하고 있습니다.',
    },
    {
      findingId: 9003,
      fileId: 503,
      relativePath: 'src/auth.ts',
      ruleId: 'JWT-002',
      ruleTitle: '하드코딩된 서명 키',
      vulnerabilityType: 'HARDCODED_SECRET',
      displayName: '하드코딩된 JWT 서명 키',
      cweId: 'CWE-798',
      severity: 'CRITICAL',
      status: 'OPEN',
      startLine: 4,
      endLine: 4,
      codeSnippet: "jwt.verify(token, 'hardcoded_jwt_secret_key_123')",
      llmStatus: 'SUCCESS',
      confidence: 99,
      verdict: 'TRUE_POSITIVE',
      summary: 'JWT 검증 키가 소스코드 내 평문 문자열로 노출되어 있어 토큰 위조가 가능합니다.',
    },
    {
      findingId: 9004,
      fileId: 504,
      relativePath: 'src/config.ts',
      ruleId: 'CORS-001',
      ruleTitle: '와일드카드 오리진 허용',
      vulnerabilityType: 'XSS',
      displayName: '과도하게 허용된 CORS 정책',
      cweId: 'CWE-942',
      severity: 'MEDIUM',
      status: 'OPEN',
      startLine: 4,
      endLine: 4,
      codeSnippet: "cors: { origin: '*' },",
      llmStatus: 'SUCCESS',
      confidence: 85,
      verdict: 'TRUE_POSITIVE',
      summary: "CORS origin이 '*'로 설정되어 악의적인 도메인에서의 요청이 허용될 수 있습니다.",
    },
  ],
};

// 7. 취약점 상세 정보 Mock Data (GET /api/v1/findings/{findingId})
export const initialFindingDetails = {
  9001: {
    findingId: 9001,
    analysisId: 128,
    file: {
      fileId: 501,
      relativePath: 'src/routes/users.ts',
      language: 'TypeScript',
    },
    detection: {
      ruleId: 'SQLI-003',
      ruleTitle: '템플릿 리터럴 SQL 삽입',
      ruleDescription: 'SQL 문자열 안에서 ${} 보간으로 외부 입력을 직접 결합하고 있습니다.',
      matchedText: '`SELECT * FROM users WHERE id = ${userId}`',
    },
    vulnerabilityType: 'SQL_INJECTION',
    displayName: 'SQL 삽입 취약점',
    cweId: 'CWE-89',
    severity: 'CRITICAL',
    status: 'OPEN',
    startLine: 6,
    endLine: 6,
    llmAnalysis: {
      status: 'SUCCESS',
      verdict: 'TRUE_POSITIVE',
      confidence: 97,
      explanation: '사용자가 전달한 query 파라미터를 검증 없이 템플릿 리터럴로 SQL 문자열에 결합하고 있습니다.',
      riskDescription: '공격자가 id 파라미터에 SQL 구문을 넣어 users 테이블 전체를 조회하거나 데이터베이스를 조작할 수 있습니다.',
      attackScenario: "GET /api/users?id=1 OR 1=1 을 호출하면 조건이 항상 참이 되어 전체 사용자 데이터가 유출됩니다.",
      remediation: '문자열 보간을 제거하고 매개변수화 쿼리(Prepared Statement)를 사용하며 입력 ID를 철저히 검증하세요.',
      modelName: 'claude-sonnet-4-6',
      promptVersion: 'v1.0',
    },
    beforeCode: {
      startLine: 5,
      lines: [
        'const userId = req.query.id;',
        'const query = `SELECT * FROM users WHERE id = ${userId}`;',
        'const result = await db.query(query);',
      ],
    },
    afterCode: {
      startLine: 5,
      lines: [
        'const userId = validateUserId(req.query.id);',
        "const query = 'SELECT * FROM users WHERE id = $1';",
        'const result = await db.query(query, [userId]);',
      ],
    },
  },
  9002: {
    findingId: 9002,
    analysisId: 128,
    file: {
      fileId: 502,
      relativePath: 'src/routes/payments.ts',
      language: 'TypeScript',
    },
    detection: {
      ruleId: 'SECRET-004',
      ruleTitle: '환경변수 직접 노출 위험',
      ruleDescription: '보안 저장소 없이 환경변수 키를 직접 코드에서 접근하고 있습니다.',
      matchedText: 'const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);',
    },
    vulnerabilityType: 'HARDCODED_SECRET',
    displayName: '하드코딩된 비밀정보 취약점',
    cweId: 'CWE-798',
    severity: 'HIGH',
    status: 'OPEN',
    startLine: 4,
    endLine: 4,
    llmAnalysis: {
      status: 'SUCCESS',
      verdict: 'TRUE_POSITIVE',
      confidence: 93,
      explanation: 'API 키 및 시크릿 토큰의 유효성 검증과 런타임 보안 보호 장치 없이 인스턴스를 초기화하고 있습니다.',
      riskDescription: '키 유출 시 외부 결제 API 무단 호출 및 결제 정보 조작 위험이 있습니다.',
      attackScenario: '프로세스 덤프나 환경변수 노출 취약점을 통해 Stripe 시크릿 키가 유출될 수 있습니다.',
      remediation: '키 관리 서비스(KMS, Vault) 연동 및 런타임 보안 마스킹을 적용하세요.',
      modelName: 'claude-sonnet-4-6',
      promptVersion: 'v1.0',
    },
    beforeCode: {
      startLine: 4,
      lines: ['const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);'],
    },
    afterCode: {
      startLine: 4,
      lines: [
        "import { getSecureSecret } from '../config/vault';",
        "const stripe = new Stripe(await getSecureSecret('STRIPE_KEY'));",
      ],
    },
  },
  9003: {
    findingId: 9003,
    analysisId: 128,
    file: {
      fileId: 503,
      relativePath: 'src/auth.ts',
      language: 'TypeScript',
    },
    detection: {
      ruleId: 'JWT-002',
      ruleTitle: '하드코딩된 서명 키',
      ruleDescription: 'JWT 검증 키가 소스코드 내 평문 문자열로 작성되어 있습니다.',
      matchedText: "jwt.verify(token, 'hardcoded_jwt_secret_key_123')",
    },
    vulnerabilityType: 'HARDCODED_SECRET',
    displayName: '하드코딩된 JWT 서명 키',
    cweId: 'CWE-798',
    severity: 'CRITICAL',
    status: 'OPEN',
    startLine: 4,
    endLine: 4,
    llmAnalysis: {
      status: 'SUCCESS',
      verdict: 'TRUE_POSITIVE',
      confidence: 99,
      explanation: 'JWT 검증 키가 평문 문자열로 노출되어 있어 누구나 임의의 유효한 토큰을 위조할 수 있습니다.',
      riskDescription: '인증 우회 및 모든 관리자/사용자 계정 탈취가 가능합니다.',
      attackScenario: '공격자가 공개된 키로 admin role 토큰을 자체 서명하여 관리자 API를 무제한 호출합니다.',
      remediation: '비밀 관리자 또는 보안 환경변수에서 키를 주입받도록 수정하세요.',
      modelName: 'claude-sonnet-4-6',
      promptVersion: 'v1.0',
    },
    beforeCode: {
      startLine: 3,
      lines: ["  return jwt.verify(token, 'hardcoded_jwt_secret_key_123');"],
    },
    afterCode: {
      startLine: 3,
      lines: [
        '  const secret = process.env.JWT_SECRET;',
        '  if (!secret) throw new Error("JWT_SECRET missing");',
        '  return jwt.verify(token, secret);',
      ],
    },
  },
  9004: {
    findingId: 9004,
    analysisId: 128,
    file: {
      fileId: 504,
      relativePath: 'src/config.ts',
      language: 'TypeScript',
    },
    detection: {
      ruleId: 'CORS-001',
      ruleTitle: '와일드카드 오리진 허용',
      ruleDescription: "CORS 허용 도메인이 '*' 와일드카드로 설정되어 있습니다.",
      matchedText: "cors: { origin: '*' },",
    },
    vulnerabilityType: 'XSS',
    displayName: '과도하게 허용된 CORS 정책',
    cweId: 'CWE-942',
    severity: 'MEDIUM',
    status: 'OPEN',
    startLine: 4,
    endLine: 4,
    llmAnalysis: {
      status: 'SUCCESS',
      verdict: 'TRUE_POSITIVE',
      confidence: 85,
      explanation: "CORS origin이 '*'로 설정되어 모든 외부 출처에서의 요청이 허용됩니다.",
      riskDescription: '신뢰할 수 없는 사이트에서 사용자의 브라우저를 통해 사내 API를 무단 호출할 수 있습니다.',
      attackScenario: '공격자 사이트 접속 시 백그라운드에서 fetch 요청으로 사용자의 민감 데이터를 탈취합니다.',
      remediation: '허용할 도메인 목록(White-list)을 명시적으로 배열로 지정하세요.',
      modelName: 'claude-sonnet-4-6',
      promptVersion: 'v1.0',
    },
    beforeCode: {
      startLine: 4,
      lines: ["  cors: { origin: '*' },"],
    },
    afterCode: {
      startLine: 4,
      lines: ["  cors: { origin: ['https://app.codeguard.io'] },"],
    },
  },
};

/**
 * 인메모리 Mock 상태 저장소 인스턴스 (Mock Database)
 * 사용자의 변경(분석 생성, 취약점 상태 변경, 분석 삭제)을 메모리에 보존
 */
class MockDatabase {
  constructor() {
    this.dashboardSummary = JSON.parse(JSON.stringify(initialDashboardSummary));
    this.analyses = JSON.parse(JSON.stringify(initialAnalyses));
    this.analysisDetails = JSON.parse(JSON.stringify(initialAnalysisDetails));
    this.analysisFiles = JSON.parse(JSON.stringify(initialAnalysisFiles));
    this.fileContents = JSON.parse(JSON.stringify(initialFileContents));
    this.findings = JSON.parse(JSON.stringify(initialFindings));
    this.findingDetails = JSON.parse(JSON.stringify(initialFindingDetails));
    
    // 폴링 진행 시뮬레이션용 진행 상태 맵
    this.pollingProgress = new Map();
  }

  // 대시보드 통계 조회
  getDashboardSummary() {
    return { ...this.dashboardSummary };
  }

  // 분석 목록 조회
  getAnalyses({ status, page = 0, size = 20 } = {}) {
    let list = [...this.analyses];
    if (status && status !== 'ALL') {
      list = list.filter((a) => a.status === status);
    }
    const totalElements = list.length;
    const totalPages = Math.ceil(totalElements / size) || 1;
    const start = page * size;
    const content = list.slice(start, start + size);
    return {
      content,
      page: { number: page, size, totalElements, totalPages },
    };
  }

  // 분석 상세 요약 조회
  getAnalysisDetail(analysisId) {
    const detail = this.analysisDetails[analysisId];
    if (!detail) {
      // 기본 생성된 분석이거나 없으면 기본값 조합
      const basic = this.analyses.find((a) => a.analysisId === Number(analysisId));
      if (!basic) return null;
      return {
        analysisId: basic.analysisId,
        title: basic.title,
        status: basic.status,
        overallSeverity: basic.overallSeverity || 'CRITICAL',
        totalFiles: basic.totalFiles || 2,
        totalFindings: basic.totalFindings || 4,
        severityCount: { CRITICAL: 2, HIGH: 1, MEDIUM: 1, LOW: 0 },
        typeCount: [
          { type: 'SQL_INJECTION', displayName: 'SQL 삽입', cweId: 'CWE-89', count: 1 },
          { type: 'HARDCODED_SECRET', displayName: '하드코딩된 비밀정보', cweId: 'CWE-798', count: 2 },
          { type: 'XSS', displayName: '크로스사이트 스크립팅', cweId: 'CWE-79', count: 1 },
        ],
        resolutionRate: 0.0,
        durationSeconds: 32,
        startedAt: basic.createdAt,
        completedAt: new Date().toISOString(),
      };
    }
    return detail;
  }

  // 분석 생성 (POST /api/v1/analyses)
  createAnalysis({ title, files = [], scanOptions = {} }) {
    const analysisId = Math.floor(100 + Math.random() * 900);
    const newAnalysis = {
      analysisId,
      title: title || '신규 분석 프로젝트',
      status: 'SCANNING',
      language: 'TypeScript',
      overallSeverity: 'CRITICAL',
      riskScore: 78,
      totalFiles: files.length || 1,
      totalFindings: 4,
      createdAt: new Date().toISOString(),
    };

    this.analyses.unshift(newAnalysis);

    // 파일 트리 및 본문 등록
    const registeredFiles = files.map((f, idx) => {
      const fileId = 600 + idx;
      const fileName = f.relativePath.split('/').pop() || f.relativePath;
      const content = f.content || '';
      const lineCount = content.split('\n').length;
      
      this.fileContents[fileId] = {
        fileId,
        relativePath: f.relativePath,
        fileName,
        language: 'TypeScript',
        lineCount,
        content,
        findingMarkers: [
          {
            findingId: 9100 + idx,
            startLine: Math.min(5, lineCount),
            endLine: Math.min(5, lineCount),
            severity: 'CRITICAL',
            label: '잠재적 보안 취약점 감지',
          },
        ],
      };

      return {
        fileId,
        relativePath: f.relativePath,
        fileName,
        language: 'TypeScript',
        fileSizeBytes: content.length,
        lineCount,
        findingCount: 1,
        highestSeverity: 'CRITICAL',
      };
    });

    this.analysisFiles[analysisId] = registeredFiles.length > 0 ? registeredFiles : this.analysisFiles[128];
    this.findings[analysisId] = this.findings[128] || [];

    // 폴링 상태 초기화 (0%부터 시작)
    this.pollingProgress.set(analysisId, { step: 0 });

    return {
      analysisId,
      title: newAnalysis.title,
      status: 'PENDING',
      totalFiles: newAnalysis.totalFiles,
      estimatedDurationSeconds: 20,
      createdAt: newAnalysis.createdAt,
    };
  }

  // 분석 진행 상태 폴링 (GET /api/v1/analyses/{id}/status)
  getAnalysisStatus(analysisId) {
    const id = Number(analysisId);
    let tracker = this.pollingProgress.get(id);
    if (!tracker) {
      tracker = { step: 3 }; // 기본 완료
    } else {
      tracker.step += 1;
    }
    this.pollingProgress.set(id, tracker);

    if (tracker.step === 1) {
      return {
        analysisId: id,
        status: 'SCANNING',
        stage: 'SCAN',
        stageLabel: '규칙 기반 취약점 탐지 중',
        progress: 35,
        currentFile: 'src/routes/users.ts',
        processedFiles: 1,
        totalFiles: 2,
        findingsSoFar: 2,
        startedAt: new Date().toISOString(),
        recentLogs: [
          { time: '14:32:20', message: '소스코드 AST 파싱 완료' },
          { time: '14:32:21', message: 'CWE-89 규칙과 대조 중' },
        ],
      };
    } else if (tracker.step === 2) {
      return {
        analysisId: id,
        status: 'EXPLAINING',
        stage: 'EXPLAIN',
        stageLabel: 'AI 모델 취약점 설명 생성 중',
        progress: 75,
        totalFindings: 4,
        explainedFindings: 3,
        recentLogs: [
          { time: '14:32:21', message: '동적 SQL 쿼리 발견 (SQLI-003)' },
          { time: '14:32:22', message: 'CWE-89 규칙 매칭 완료' },
          { time: '14:32:25', message: 'Claude AI 취약점 설명 및 패치 코드 생성 중...' },
        ],
      };
    } else {
      // 완료
      const target = this.analyses.find((a) => a.analysisId === id);
      if (target) {
        target.status = 'COMPLETED';
      }
      return {
        analysisId: id,
        status: 'COMPLETED',
        stage: 'DONE',
        stageLabel: '분석 완료',
        progress: 100,
        totalFiles: 4,
        totalFindings: 23,
        recentLogs: [
          { time: '14:32:21', message: '동적 SQL 쿼리 발견 (SQLI-003)' },
          { time: '14:32:25', message: 'AI 설명 생성 완료' },
          { time: '14:32:28', message: '모든 취약점 분석 및 수정안 도출 완료' },
        ],
      };
    }
  }

  // 파일 트리 조회 (GET /api/v1/analyses/{id}/files)
  getAnalysisFiles(analysisId) {
    const id = Number(analysisId);
    return this.analysisFiles[id] || this.analysisFiles[128];
  }

  // 파일 코드 본문 조회 (GET /api/v1/analyses/{id}/files/{fileId})
  getFileContent(analysisId, fileId) {
    const fid = Number(fileId);
    return this.fileContents[fid] || null;
  }

  // 취약점 목록 조회 (GET /api/v1/analyses/{id}/findings)
  getFindings(analysisId, { type, severity, status, fileId } = {}) {
    const id = Number(analysisId);
    let list = this.findings[id] || this.findings[128] || [];

    if (type && type !== 'ALL') {
      list = list.filter((f) => f.vulnerabilityType === type);
    }
    if (severity) {
      list = list.filter((f) => f.severity === severity);
    }
    if (status) {
      list = list.filter((f) => f.status === status);
    }
    if (fileId) {
      list = list.filter((f) => f.fileId === Number(fileId));
    }

    return {
      content: list,
      page: { number: 0, size: 50, totalElements: list.length, totalPages: 1 },
    };
  }

  // 취약점 상세 조회 (GET /api/v1/findings/{findingId})
  getFindingDetail(findingId) {
    const fid = Number(findingId);
    return this.findingDetails[fid] || null;
  }

  // 취약점 상태 변경 (PATCH /api/v1/findings/{findingId}/status)
  updateFindingStatus(findingId, status) {
    const fid = Number(findingId);
    const detail = this.findingDetails[fid];
    if (!detail) {
      throw new Error('해당 취약점을 찾을 수 없습니다.');
    }

    if (detail.status === status) {
      const err = new Error(`이미 ${status} 상태입니다.`);
      err.response = { status: 409, data: { message: `이미 ${status} 상태입니다.` } };
      throw err;
    }

    detail.status = status;

    // 목록 내 상태도 동기화
    for (const id in this.findings) {
      const found = this.findings[id].find((f) => f.findingId === fid);
      if (found) {
        found.status = status;
      }
    }

    return {
      findingId: fid,
      status,
      updatedAt: new Date().toISOString(),
    };
  }

  // 분석 삭제 (DELETE /api/v1/analyses/{id})
  deleteAnalysis(analysisId) {
    const id = Number(analysisId);
    this.analyses = this.analyses.filter((a) => a.analysisId !== id);
    delete this.analysisDetails[id];
    delete this.analysisFiles[id];
    delete this.findings[id];
    return { success: true, message: '분석이 성공적으로 삭제되었습니다.' };
  }
}

// 싱글톤 인스턴스 export
export const mockDb = new MockDatabase();
