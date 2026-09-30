/**
 * 취약점 분석 결과 (SCR-003) 관련 Mock 데이터
 * image/결과화면.png 와이어프레임 최신본 준수
 * 다중 프로젝트 지원: payments-api, auth-service, admin-console
 */

// ==========================================
// 1. 프로젝트별 데이터 정의
// ==========================================

export const PROJECTS_DATA = {
  // ----------------------------------------------------
  // 프로젝트 1: payments-api (Node.js / TypeScript)
  // ----------------------------------------------------
  'payments-api': {
    id: 'payments-api',
    name: 'payments-api',
    defaultFile: 'users.ts',
    filePaths: {
      'users.ts': 'src/routes/users.ts',
      'payments.ts': 'src/routes/payments.ts',
      'database.ts': 'src/database.ts',
      'middleware.ts': 'src/middleware.ts',
      'config.ts': 'config.ts',
      'auth.ts': 'auth.ts',
      'package.json': 'package.json',
    },
    treeData: [
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
    ],
    fileFindingData: {
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
        vulnLineIndices: [5], // 라인 6
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
        vulnLineIndices: [3], // 라인 4
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
        vulnLineIndices: [3],
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
        vulnLineIndices: [3],
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
          '  }',
          "}",
        ],
        vulnLineIndices: [],
        tagLabel: '',
        finding: null,
        diff: null,
      },
    },
  },

  // ----------------------------------------------------
  // 프로젝트 2: auth-service (Go 마이크로서비스)
  // ----------------------------------------------------
  'auth-service': {
    id: 'auth-service',
    name: 'auth-service',
    defaultFile: 'token_service.go',
    filePaths: {
      'token_service.go': 'internal/auth/token_service.go',
      'password_hasher.go': 'internal/auth/password_hasher.go',
      'jwt_validator.go': 'internal/middleware/jwt_validator.go',
      'main.go': 'cmd/main.go',
      'crypto.go': 'pkg/crypto.go',
      'go.mod': 'go.mod',
    },
    treeData: [
      {
        name: 'cmd',
        isDir: true,
        isOpen: true,
        children: [
          { name: 'main.go', isDir: false, ext: 'GO', hasFinding: false },
        ],
      },
      {
        name: 'internal',
        isDir: true,
        isOpen: true,
        children: [
          {
            name: 'auth',
            isDir: true,
            isOpen: true,
            children: [
              { name: 'token_service.go', isDir: false, ext: 'GO', hasFinding: true, isSelected: true },
              { name: 'password_hasher.go', isDir: false, ext: 'GO', hasFinding: true },
            ],
          },
          {
            name: 'middleware',
            isDir: true,
            isOpen: true,
            children: [
              { name: 'jwt_validator.go', isDir: false, ext: 'GO', hasFinding: true },
            ],
          },
        ],
      },
      {
        name: 'pkg',
        isDir: true,
        isOpen: false,
        children: [
          { name: 'crypto.go', isDir: false, ext: 'GO', hasFinding: false },
        ],
      },
      { name: 'go.mod', isDir: false, ext: 'MOD', hasFinding: false },
    ],
    fileFindingData: {
      'token_service.go': {
        hasFinding: true,
        codeLines: [
          'package auth',
          '',
          'import (',
          '\t"time"',
          '\t"github.com/golang-jwt/jwt/v5"',
          ')',
          '',
          'var jwtSecretKey = []byte("auth_service_insecure_jwt_token_key_2026")',
          '',
          'func GenerateToken(userID string, role string) (string, error) {',
          '\tclaims := jwt.MapClaims{',
          '\t\t"sub":  userID,',
          '\t\t"role": role,',
          '\t\t"exp":  time.Now().Add(time.Hour * 24).Unix(),',
          '\t}',
          '\ttoken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)',
          '\treturn token.SignedString(jwtSecretKey)',
          '}',
        ],
        vulnLineIndices: [7], // 라인 8 (var jwtSecretKey = ...)
        tagLabel: '하드코딩된 시크릿 · 치명적',
        finding: {
          id: 201,
          vulnerabilityType: 'HARDCODED_SECRET',
          severity: 'CRITICAL',
          title: '하드코딩된 JWT 서명 비밀키 (Go)',
          severityBadge: '치명적 98% · CWE-798',
          cwe: 'CWE-798',
          confidence: '98%',
          status: 'OPEN',
          detectionSource: {
            title: '탐지 근거 · Go 정적 분석 AST',
            ruleId: 'GO-SEC-798',
            ruleTitle: '정적 토큰 바이트 배열 감지',
            matchedCode: 'var jwtSecretKey = []byte("auth_service_insecure_jwt_token_key_2026")',
          },
          description: '소스 코드 내에 JWT 서명용 마스터 비밀키가 평문 바이트로 하드코딩되어 있습니다.',
          recommendation: '운영체제 환경변수(os.Getenv) 또는 안전한 Vault 시크릿 엔진에서 로드하도록 수정하세요.',
          impact: '공격자가 해당 키로 임의의 관리자 JWT 토큰을 자체 서명하여 모든 인증을 우회할 수 있습니다.',
        },
        diff: {
          fileName: 'token_service.go',
          startLine: 8,
          beforeLines: [
            'var jwtSecretKey = []byte("auth_service_insecure_jwt_token_key_2026")',
          ],
          afterLines: [
            'var jwtSecretKey = []byte(os.Getenv("JWT_SIGNING_KEY"))',
            'func init() {',
            '\tif len(jwtSecretKey) == 0 {',
            '\t\tpanic("JWT_SIGNING_KEY 환경변수가 설정되지 않았습니다")',
            '\t}',
            '}',
          ],
          fullCleanCodeLines: [
            'package auth',
            '',
            'import (',
            '\t"os"',
            '\t"time"',
            '\t"github.com/golang-jwt/jwt/v5"',
            ')',
            '',
            'var jwtSecretKey = []byte(os.Getenv("JWT_SIGNING_KEY"))',
            '',
            'func init() {',
            '\tif len(jwtSecretKey) == 0 {',
            '\t\tpanic("JWT_SIGNING_KEY 환경변수가 설정되지 않았습니다")',
            '\t}',
            '}',
            '',
            'func GenerateToken(userID string, role string) (string, error) {',
            '\tclaims := jwt.MapClaims{',
            '\t\t"sub":  userID,',
            '\t\t"role": role,',
            '\t\t"exp":  time.Now().Add(time.Hour * 24).Unix(),',
            '\t}',
            '\ttoken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)',
            '\treturn token.SignedString(jwtSecretKey)',
            '}',
          ],
        },
      },

      'password_hasher.go': {
        hasFinding: true,
        codeLines: [
          'package auth',
          '',
          'import (',
          '\t"database/sql"',
          '\t"fmt"',
          ')',
          '',
          'func FindAccountByUsername(db *sql.DB, username string) (int64, string, error) {',
          '\tquery := fmt.Sprintf("SELECT id, password_hash FROM accounts WHERE username = \'%s\'", username)',
          '\tvar id int64',
          '\tvar hash string',
          '\terr := db.QueryRow(query).Scan(&id, &hash)',
          '\treturn id, hash, err',
          '}',
        ],
        vulnLineIndices: [8], // 라인 9 (fmt.Sprintf 쿼리 조립)
        tagLabel: 'SQL 삽입 가능성 · 치명적',
        finding: {
          id: 202,
          vulnerabilityType: 'SQL_INJECTION',
          severity: 'CRITICAL',
          title: '문자열 포맷팅에 의한 SQL 삽입 취약점',
          severityBadge: '치명적 96% · CWE-89',
          cwe: 'CWE-89',
          confidence: '96%',
          status: 'OPEN',
          detectionSource: {
            title: '탐지 근거 · Taint Dataflow 분석',
            ruleId: 'GO-SQLI-001',
            ruleTitle: 'fmt.Sprintf 쿼리 조합 Taint 유입',
            matchedCode: 'query := fmt.Sprintf("SELECT id, password_hash FROM accounts WHERE username = \'%s\'", username)',
          },
          description: 'username 파라미터가 적절한 이스케이프 또는 바인딩 없이 fmt.Sprintf를 통해 직접 SQL 쿼리에 삽입됩니다.',
          recommendation: 'db.QueryRow의 위치 매개변수($1, ?)를 사용하여 파라미터화된 쿼리를 실행하세요.',
          impact: '인증 우회(SQLi 우회) 및 사용자 비밀번호 해시 전수 유출 가능',
        },
        diff: {
          fileName: 'password_hasher.go',
          startLine: 9,
          beforeLines: [
            '\tquery := fmt.Sprintf("SELECT id, password_hash FROM accounts WHERE username = \'%s\'", username)',
            '\tvar id int64',
            '\tvar hash string',
            '\terr := db.QueryRow(query).Scan(&id, &hash)',
          ],
          afterLines: [
            '\tvar id int64',
            '\tvar hash string',
            '\terr := db.QueryRow("SELECT id, password_hash FROM accounts WHERE username = $1", username).Scan(&id, &hash)',
          ],
          fullCleanCodeLines: [
            'package auth',
            '',
            'import (',
            '\t"database/sql"',
            ')',
            '',
            'func FindAccountByUsername(db *sql.DB, username string) (int64, string, error) {',
            '\tvar id int64',
            '\tvar hash string',
            '\terr := db.QueryRow("SELECT id, password_hash FROM accounts WHERE username = $1", username).Scan(&id, &hash)',
            '\treturn id, hash, err',
            '}',
          ],
        },
      },

      'jwt_validator.go': {
        hasFinding: true,
        codeLines: [
          'package middleware',
          '',
          'import (',
          '\t"net/http"',
          ')',
          '',
          'const DefaultDevMasterKey = "developer_master_debug_key_allow_all"',
          '',
          'func ValidateTokenMiddleware(next http.Handler) http.Handler {',
          '\treturn http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {',
          '\t\tauthHeader := r.Header.Get("X-Dev-Bypass")',
          '\t\tif authHeader == DefaultDevMasterKey {',
          '\t\t\tnext.ServeHTTP(w, r)',
          '\t\t\treturn',
          '\t\t}',
          '\t\thttp.Error(w, "Unauthorized", http.StatusUnauthorized)',
          '\t})',
          '}',
        ],
        vulnLineIndices: [6], // 라인 7
        tagLabel: '개발자 백도어 키 노출 · 높음',
        finding: {
          id: 203,
          vulnerabilityType: 'HARDCODED_SECRET',
          severity: 'HIGH',
          title: '하드코딩된 백도어 우회 키 노출',
          severityBadge: '높음 94% · CWE-798',
          cwe: 'CWE-798',
          confidence: '95%',
          status: 'OPEN',
          detectionSource: {
            title: '탐지 근거 · 패턴 매칭',
            ruleId: 'SEC-BYPASS-01',
            ruleTitle: '테스트용 바이패스 키 잔존',
            matchedCode: 'const DefaultDevMasterKey = "developer_master_debug_key_allow_all"',
          },
          description: '운영 코드에 개발 단계에서 사용하던 바이패스 마스터 헤더 키가 삭제되지 않고 포함되어 있습니다.',
          recommendation: '상용 빌드에서 디버그 바이패스 코드를 완전 제거하고 정식 토큰 유효성 검사 루틴으로 대체하세요.',
          impact: '공격자가 X-Dev-Bypass 헤더만으로 모든 보안 검증 절차를 우회할 수 있습니다.',
        },
        diff: {
          fileName: 'jwt_validator.go',
          startLine: 7,
          beforeLines: [
            'const DefaultDevMasterKey = "developer_master_debug_key_allow_all"',
          ],
          afterLines: [
            '// 보안 패치: 디버그 바이패스 키 완전 폐기 및 프로덕션 검증 강제',
          ],
          fullCleanCodeLines: [
            'package middleware',
            '',
            'import (',
            '\t"net/http"',
            '\t"strings"',
            ')',
            '',
            'func ValidateTokenMiddleware(next http.Handler) http.Handler {',
            '\treturn http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {',
            '\t\tauthHeader := r.Header.Get("Authorization")',
            '\t\tif !strings.HasPrefix(authHeader, "Bearer ") {',
            '\t\t\thttp.Error(w, "Unauthorized: Invalid Token", http.StatusUnauthorized)',
            '\t\t\treturn',
            '\t\t}',
            '\t\tnext.ServeHTTP(w, r)',
            '\t})',
            '}',
          ],
        },
      },

      'main.go': {
        hasFinding: false,
        codeLines: [
          'package main',
          '',
          'import (',
          '\t"log"',
          '\t"net/http"',
          ')',
          '',
          'func main() {',
          '\tlog.Println("Starting auth-service on :8080...")',
          '\terr := http.ListenAndServe(":8080", nil)',
          '\tif err != nil {',
          '\t\tlog.Fatalf("Server startup failed: %v", err)',
          '\t}',
          '}',
        ],
        vulnLineIndices: [],
        tagLabel: '',
        finding: null,
        diff: null,
      },

      'crypto.go': {
        hasFinding: false,
        codeLines: [
          'package pkg',
          '',
          'import (',
          '\t"crypto/rand"',
          '\t"encoding/base64"',
          ')',
          '',
          'func GenerateRandomSalt(length int) (string, error) {',
          '\tb := make([]byte, length)',
          '\t_, err := rand.Read(b)',
          '\tif err != nil {',
          '\t\treturn "", err',
          '\t}',
          '\treturn base64.StdEncoding.EncodeToString(b), nil',
          '}',
        ],
        vulnLineIndices: [],
        tagLabel: '',
        finding: null,
        diff: null,
      },

      'go.mod': {
        hasFinding: false,
        codeLines: [
          'module github.com/codeguard/auth-service',
          '',
          'go 1.22',
          '',
          'require (',
          '\tgithub.com/golang-jwt/jwt/v5 v5.2.0',
          '\tgolang.org/x/crypto v0.21.0',
          ')',
        ],
        vulnLineIndices: [],
        tagLabel: '',
        finding: null,
        diff: null,
      },
    },
  },

  // ----------------------------------------------------
  // 프로젝트 3: admin-console (React / TypeScript 프론트)
  // ----------------------------------------------------
  'admin-console': {
    id: 'admin-console',
    name: 'admin-console',
    defaultFile: 'UserManagement.tsx',
    filePaths: {
      'UserManagement.tsx': 'src/pages/UserManagement.tsx',
      'RolePermissions.tsx': 'src/pages/RolePermissions.tsx',
      'adminApi.ts': 'src/api/adminApi.ts',
      'AdminHeader.tsx': 'src/components/AdminHeader.tsx',
      'exportReport.ts': 'src/utils/exportReport.ts',
      'package.json': 'package.json',
    },
    treeData: [
      {
        name: 'src',
        isDir: true,
        isOpen: true,
        children: [
          {
            name: 'pages',
            isDir: true,
            isOpen: true,
            children: [
              { name: 'UserManagement.tsx', isDir: false, ext: 'TSX', hasFinding: true, isSelected: true },
              { name: 'RolePermissions.tsx', isDir: false, ext: 'TSX', hasFinding: true },
            ],
          },
          {
            name: 'api',
            isDir: true,
            isOpen: true,
            children: [
              { name: 'adminApi.ts', isDir: false, ext: 'TS', hasFinding: true },
            ],
          },
          {
            name: 'components',
            isDir: true,
            isOpen: false,
            children: [
              { name: 'AdminHeader.tsx', isDir: false, ext: 'TSX', hasFinding: false },
            ],
          },
          {
            name: 'utils',
            isDir: true,
            isOpen: false,
            children: [
              { name: 'exportReport.ts', isDir: false, ext: 'TS', hasFinding: false },
            ],
          },
        ],
      },
      { name: 'package.json', isDir: false, ext: 'JSON', hasFinding: false },
    ],
    fileFindingData: {
      'UserManagement.tsx': {
        hasFinding: true,
        codeLines: [
          "import React from 'react';",
          "",
          'interface UserProfile {',
          '  id: string;',
          '  name: string;',
          '  customBio: string;',
          '}',
          '',
          'export const UserManagement: React.FC<{ user: UserProfile }> = ({ user }) => {',
          '  return (',
          '    <div className="user-profile-card">',
          '      <h3>{user.name}</h3>',
          '      <div className="bio-container" dangerouslySetInnerHTML={{ __html: user.customBio }} />',
          '    </div>',
          '  );',
          '};',
        ],
        vulnLineIndices: [12], // 라인 13 (dangerouslySetInnerHTML)
        tagLabel: 'DOM 기반 XSS · 치명적',
        finding: {
          id: 301,
          vulnerabilityType: 'XSS',
          severity: 'CRITICAL',
          title: 'DOM 기반 크로스사이트 스크립팅 (XSS)',
          severityBadge: '치명적 97% · CWE-79',
          cwe: 'CWE-79',
          confidence: '97%',
          status: 'OPEN',
          detectionSource: {
            title: '탐지 근거 · React 보안 룰셋',
            ruleId: 'REACT-XSS-001',
            ruleTitle: 'dangerouslySetInnerHTML 미정제 사용',
            matchedCode: '<div className="bio-container" dangerouslySetInnerHTML={{ __html: user.customBio }} />',
          },
          description: '사용자가 입력한 자기소개(customBio) HTML이 검증이나 살균(Sanitization) 없이 DOM에 직접 삽입됩니다.',
          recommendation: 'DOMPurify 라이브러리로 HTML을 정제하거나 일반 텍스트 바인딩을 사용하세요.',
          impact: '공격자가 악성 자바스크립트를 주입하여 관리자 세션 쿠키 탈취 및 비인가 작업 수행 가능',
        },
        diff: {
          fileName: 'UserManagement.tsx',
          startLine: 13,
          beforeLines: [
            '      <div className="bio-container" dangerouslySetInnerHTML={{ __html: user.customBio }} />',
          ],
          afterLines: [
            '      <div className="bio-container" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(user.customBio) }} />',
          ],
          fullCleanCodeLines: [
            "import React from 'react';",
            "import DOMPurify from 'dompurify';",
            "",
            'interface UserProfile {',
            '  id: string;',
            '  name: string;',
            '  customBio: string;',
            '}',
            '',
            'export const UserManagement: React.FC<{ user: UserProfile }> = ({ user }) => {',
            '  return (',
            '    <div className="user-profile-card">',
            '      <h3>{user.name}</h3>',
            '      <div className="bio-container" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(user.customBio) }} />',
            '    </div>',
            '  );',
            '};',
          ],
        },
      },

      'RolePermissions.tsx': {
        hasFinding: true,
        codeLines: [
          "import React, { useState } from 'react';",
          "import axios from 'axios';",
          "",
          'export const RolePermissions = () => {',
          "  const [filterRole, setFilterRole] = useState('');",
          '',
          '  const fetchRoleData = async (roleName: string) => {',
          '    const rawQuery = `/api/v1/permissions?filter=role=\'${roleName}\'`;',
          '    const response = await axios.get(rawQuery);',
          '    return response.data;',
          '  };',
          '',
          '  return <div className="role-manager">권한 관리자 콘솔</div>;',
          '};',
        ],
        vulnLineIndices: [7], // 라인 8 (rawQuery 조립)
        tagLabel: '쿼리 주입 가능성 · 높음',
        finding: {
          id: 302,
          vulnerabilityType: 'SQL_INJECTION',
          severity: 'HIGH',
          title: 'URL 쿼리 파라미터 인젝션 위험',
          severityBadge: '높음 89% · CWE-89',
          cwe: 'CWE-89',
          confidence: '90%',
          status: 'OPEN',
          detectionSource: {
            title: '탐지 근거 · API 호출 감사',
            ruleId: 'API-INJ-002',
            ruleTitle: '미검증 URL 쿼리 파라미터 조합',
            matchedCode: 'const rawQuery = `/api/v1/permissions?filter=role=\'${roleName}\'`;',
          },
          description: '클라이언트에서 백엔드로 전송되는 필터 쿼리 스트링에 특수문자 이스케이프가 누락되어 있습니다.',
          recommendation: 'axios params 객체를 활용하여 URL 인코딩을 자동 처리하도록 수정하세요.',
          impact: '백엔드 필터링 로직 우회 및 비인가 권한 목록 노출 위험',
        },
        diff: {
          fileName: 'RolePermissions.tsx',
          startLine: 8,
          beforeLines: [
            '    const rawQuery = `/api/v1/permissions?filter=role=\'${roleName}\'`;',
            '    const response = await axios.get(rawQuery);',
          ],
          afterLines: [
            '    const response = await axios.get("/api/v1/permissions", {',
            '      params: { role: roleName },',
            '    });',
          ],
          fullCleanCodeLines: [
            "import React, { useState } from 'react';",
            "import axios from 'axios';",
            "",
            'export const RolePermissions = () => {',
            "  const [filterRole, setFilterRole] = useState('');",
            '',
            '  const fetchRoleData = async (roleName: string) => {',
            '    const response = await axios.get("/api/v1/permissions", {',
            '      params: { role: roleName },',
            '    });',
            '    return response.data;',
            '  };',
            '',
            '  return <div className="role-manager">권한 관리자 콘솔</div>;',
            '};',
          ],
        },
      },

      'adminApi.ts': {
        hasFinding: true,
        codeLines: [
          "import axios from 'axios';",
          "",
          "const ADMIN_MASTER_TOKEN = 'adm_live_98bf1023a987d6e4c1';",
          "",
          "export const adminApiClient = axios.create({",
          "  baseURL: '/api/admin',",
          "  headers: {",
          "    Authorization: `Bearer ${ADMIN_MASTER_TOKEN}`,",
          "  },",
          "});",
        ],
        vulnLineIndices: [2], // 라인 3
        tagLabel: '민감 정보 노출 가능성 · 높음',
        finding: {
          id: 303,
          vulnerabilityType: 'HARDCODED_SECRET',
          severity: 'HIGH',
          title: '하드코딩된 관리자 API 마스터 토큰',
          severityBadge: '높음 95% · CWE-798',
          cwe: 'CWE-798',
          confidence: '95%',
          status: 'OPEN',
          detectionSource: {
            title: '탐지 근거 · 비밀정보 스캐너',
            ruleId: 'SECRET-API-03',
            ruleTitle: '클라이언트 번들 내 마스터 토큰 검출',
            matchedCode: "const ADMIN_MASTER_TOKEN = 'adm_live_98bf1023a987d6e4c1';",
          },
          description: '프론트엔드 자바스크립트 번들에 관리자 권한 API 마스터 키가 평문으로 포함되어 배포 시 누구나 열람 가능합니다.',
          recommendation: '클라이언트에 마스터 키를 노출하지 말고, 서버 측 세션 쿠키 인증으로 전환하세요.',
          impact: '관리자 전용 API(사용자 삭제, DB 덤프) 무단 호출 위험',
        },
        diff: {
          fileName: 'adminApi.ts',
          startLine: 3,
          beforeLines: [
            "const ADMIN_MASTER_TOKEN = 'adm_live_98bf1023a987d6e4c1';",
          ],
          afterLines: [
            "// 보안 패치: 쿠키 기반 HttpOnly 세션 인증으로 마스터 키 노출 방지",
            "const ADMIN_MASTER_TOKEN = '';",
          ],
          fullCleanCodeLines: [
            "import axios from 'axios';",
            "",
            "export const adminApiClient = axios.create({",
            "  baseURL: '/api/admin',",
            "  withCredentials: true, // HttpOnly 세션 쿠키 자동 전달",
            "});",
          ],
        },
      },

      'AdminHeader.tsx': {
        hasFinding: false,
        codeLines: [
          "import React from 'react';",
          "",
          "export const AdminHeader: React.FC = () => {",
          "  return (",
          "    <header className=\"admin-header\">",
          "      <h2>Admin Console Dashboard</h2>",
          "    </header>",
          "  );",
          "};",
        ],
        vulnLineIndices: [],
        tagLabel: '',
        finding: null,
        diff: null,
      },

      'exportReport.ts': {
        hasFinding: false,
        codeLines: [
          "export function generateCSVReport(rows: any[]): string {",
          "  if (!rows || rows.length === 0) return '';",
          "  const headers = Object.keys(rows[0]).join(',');",
          "  const body = rows.map((r) => Object.values(r).join(',')).join('\\n');",
          "  return `${headers}\\n${body}`;",
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
          '  "name": "admin-console",',
          '  "version": "1.0.0",',
          '  "dependencies": {',
          '    "react": "^18.2.0",',
          '    "react-dom": "^18.2.0",',
          '    "axios": "^1.6.0",',
          '    "dompurify": "^3.0.6"',
          '  }',
          "}",
        ],
        vulnLineIndices: [],
        tagLabel: '',
        finding: null,
        diff: null,
      },
    },
  },
};

// ==========================================
// 2. 프로젝트별 헬퍼 함수
// ==========================================

// 초기 스냅샷 딥카피 보관 (원상복구용)
const ORIGINAL_PROJECTS_SNAPSHOT = JSON.parse(JSON.stringify(PROJECTS_DATA));

/**
 * 프로젝트 ID를 정규화하여 지원되는 프로젝트 ID 반환 (fallback: payments-api)
 */
export function normalizeProjectId(rawProjectId) {
  if (!rawProjectId) return 'payments-api';
  const str = String(rawProjectId).trim();
  if (PROJECTS_DATA[str]) return str;
  // 번호나 별칭 매핑 (예: 128 -> payments-api)
  if (str === '128' || str === '1') return 'payments-api';
  if (str === '2' || str === 'auth') return 'auth-service';
  if (str === '3' || str === 'admin') return 'admin-console';
  return 'payments-api';
}

/**
 * 특정 프로젝트의 파일 트리 데이터 가져오기
 */
export function getProjectTreeData(projectId) {
  const normId = normalizeProjectId(projectId);
  return JSON.parse(JSON.stringify(PROJECTS_DATA[normId].treeData));
}

/**
 * 특정 프로젝트의 파일별 분석 데이터 맵 가져오기
 */
export function getProjectFileFindingData(projectId) {
  const normId = normalizeProjectId(projectId);
  return PROJECTS_DATA[normId].fileFindingData;
}

/**
 * 특정 프로젝트의 첫 번째 기본 선택 파일명 가져오기
 */
export function getProjectDefaultFile(projectId) {
  const normId = normalizeProjectId(projectId);
  return PROJECTS_DATA[normId].defaultFile;
}

/**
 * 파일 경로 헤더 표시용 상대 경로 가져오기
 */
export function getProjectFilePath(projectId, fileName) {
  const normId = normalizeProjectId(projectId);
  const paths = PROJECTS_DATA[normId]?.filePaths;
  if (paths && paths[fileName]) {
    return `${normId} · ${paths[fileName]}`;
  }
  return `${normId} · ${fileName}`;
}

/**
 * 특정 프로젝트의 파일 데이터 및 트리를 최초 상태로 복구
 */
export function resetProjectFindingData(projectId) {
  const normId = normalizeProjectId(projectId);
  const restoredProject = JSON.parse(JSON.stringify(ORIGINAL_PROJECTS_SNAPSHOT[normId]));
  
  // 객체 덮어쓰기
  PROJECTS_DATA[normId].treeData = restoredProject.treeData;
  PROJECTS_DATA[normId].fileFindingData = restoredProject.fileFindingData;

  return {
    projectId: normId,
    treeData: JSON.parse(JSON.stringify(restoredProject.treeData)),
    fileFindingData: restoredProject.fileFindingData,
    defaultFile: restoredProject.defaultFile,
  };
}

// ==========================================
// 3. 통계 및 필터 탭 동적 계산 함수
// ==========================================

/**
 * 실제 등록된 취약점 데이터 기반 동적 심각도 집계 계산 함수
 * @param {Object} fileData - 파일별 취약점 데이터
 * @param {Array<number>} resolvedIds - 해결 완료된 취약점 ID 목록
 */
export function calculateDynamicFindingTotals(fileData = PROJECTS_DATA['payments-api'].fileFindingData, resolvedIds = []) {
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
export function calculateDynamicTypeTabs(fileData = PROJECTS_DATA['payments-api'].fileFindingData, resolvedIds = []) {
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

// ==========================================
// 4. 하위 호환성용 기존 Export 유지
// ==========================================

export const resultTreeData = PROJECTS_DATA['payments-api'].treeData;
export const fileFindingData = PROJECTS_DATA['payments-api'].fileFindingData;

export function resetFileFindingData(projectId = 'payments-api') {
  const { treeData, fileFindingData: restored } = resetProjectFindingData(projectId);
  return {
    fileFindingData: restored,
    resultTreeData: treeData,
  };
}

export const vulnerabilityFilterTabs = calculateDynamicTypeTabs();
export const findingTotals = calculateDynamicFindingTotals();

export const currentFinding = fileFindingData['users.ts'].finding;
export const sampleDiff = fileFindingData['users.ts'].diff;
