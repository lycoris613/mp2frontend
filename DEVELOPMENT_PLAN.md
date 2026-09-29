# CodeGuard AI 프론트엔드 2인 개발 역할 분담 및 주간 실행 계획서

> **프로젝트명**: CodeGuard AI (프론트엔드 MVP)  
> **협업 기간**: 화요일 ~ 금요일 (4일 집중 로드맵)  
> **기반 문서**: `note/04 UI화면 설계서.txt`, `note/05 React Component,Props State 설계서.txt`, `note/03 REST API 설계서.txt`  
> **핵심 원칙**: 기능별 파일 격리를 통한 **Git 머지 충돌(Merge Conflict) 제로화** 및 단계별 검증

---

## 1. 2인 역할 분담 개요 (R&R)

```text
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│  🧑‍💻 개발자 A : 플랫폼 & 대시보드 & 공통 기반  │  👩‍💻 개발자 B : 분석 엔진 & 결과 & 파이프라인│
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ • 서비스 뼈대 (Sidebar, PageHeader, Layout)   │ • 코드 입력 에디터 & 파일 트리 탐색기        │
│ • 홈 대시보드 (지표 카드 4종, SVG 차트 2종)  │ • 2단계 분석 파이프라인 (2초 폴링 모니터링)  │
│ • React Router 라우팅 체계 및 네비게이션     │ • 취약점 분석 결과 뷰어 (라인 하이라이트)    │
│ • 분석 결과 목록 (/analyses) 화면 및 삭제     │ • Before / After 코드 Diff 패널              │
│ • Axios Client, dashboardStore, uiStore      │ • analysisStore, findingApi, analysisApi     │
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

---

## 2. 개발자별 구현 기능 상세 명세

### 🧑‍💻 개발자 A : Platform, Dashboard & Routing

#### 2.1 구현 기능 목록
1. **공통 레이아웃 시스템**
   - 고정 폭 좌측 사이드바 (`Sidebar`): 메뉴 탭 전환, 즐겨찾기/프로젝트 목록, 보관함
   - 상단 헤더 (`PageHeader`): 전역 검색창, 사용자 프로필, 컴팩트 모드 대응
   - 레이아웃 래퍼 (`ProtectedLayout`): 로그인 후 공통 프레임 관리
2. **홈 대시보드 화면 ([SCR-001](note/04%20UI%ED%99%94%EB%A9%B4%20%EC%84%A4%EA%B3%84%EC%84%9C.txt))**
   - 히어로 배너 (`HeroBanner`): 서비스 슬로건 및 "코드 가져오기 시작" CTA 버튼
   - 통계 지표 카드 (`MetricCard`): 이번 주 분석(128건), 발견 취약점(47건), 개선율(86.4%), 평균 시간(2분 18초)
   - 최근 분석 목록 (`RecentAnalysisList`): 프로젝트명, 언어/브랜치 메타, 위험 점수 배지, 상대 시간
   - 30일 위험 추세 차트 (`SeverityTrendChart`): 일자별 심각도 막대 그래프 (SVG)
   - 취약점 유형 분포 파이 차트 (`VulnerabilityPieChart`): SQL 삽입(21건), 하드코딩 비밀정보(15건), XSS(11건) SVG
3. **라우팅 및 분석 이력 목록**
   - React Router 환경 구축 (`/`, `/analysis/new`, `/analyses`, `/analyses/:analysisId`)
   - 분석 결과 목록 페이지 (`AnalysisListPage`): 전체 분석 이력 테이블, 상태 필터링, 개별 분석 삭제 모달
4. **API 및 전역 상태 관리**
   - Axios Client 설정 (`src/api/client.js`): baseURL, 타임아웃, 공통 에러 인터셉터 (401, 403, 500)
   - `dashboardStore.js`: 대시보드 요약 정보 캐싱 및 로딩 상태 관리
   - `uiStore.js`: 글로벌 성공/에러 토스트 알림 관리
   - 공통 피드백 컴포넌트 연동 (`LoadingSpinner`, `EmptyState`, `ErrorMessage`, `Toast`)

#### 2.2 담당 파일 및 디렉토리
```text
src/
├── layouts/ProtectedLayout.jsx
├── components/layout/
│   ├── PageHeader.jsx
│   └── Sidebar.jsx
├── pages/Home/
│   ├── index.jsx
│   └── components/
│       ├── HeroBanner.jsx
│       ├── MetricCard.jsx
│       ├── RecentAnalysisList.jsx
│       ├── SeverityTrendChart.jsx
│       └── VulnerabilityPieChart.jsx
├── pages/AnalysisList/ (수/목 구현)
│   ├── index.jsx
│   └── components/
├── api/
│   ├── client.js
│   └── dashboardApi.js
├── stores/
│   ├── dashboardStore.js
│   └── uiStore.js
└── data/dashboardData.js
```

#### 2.3 담당 REST API
- `POST /api/v1/auth/login`, `POST /api/v1/auth/signup` (인증)
- `GET /api/v1/dashboard/summary` (대시보드 통계 및 최근 분석)
- `GET /api/v1/analyses` (분석 목록 조회)
- `DELETE /api/v1/analyses/{id}` (분석 삭제)

---

### 👩‍💻 개발자 B : Security Engine, Result & Pipeline

#### 2.1 구현 기능 목록
1. **공통 뷰어 컴포넌트 ([표 8-1](note/05%20React%20Component,Props%20State%20%EC%84%A4%EA%B3%84%EC%84%9C.txt))**
   - 파일 탐색기 트리 (`FileTree`): 디렉토리 계층 변환, 파일 선택, 취약점 보유 파일 점(●) 표시
   - 코드 뷰어 (`CodeViewer`): 라인 번호 매핑, 취약 라인 하이라이트(vuln-line), 취약점 태그 표시
   - 심각도 배지 (`SeverityBadge`): CRITICAL, HIGH, MEDIUM, LOW 규격 배지
2. **코드 분석 페이지 ([SCR-002](note/04%20UI%ED%99%94%EB%A9%B4%20%EC%84%A4%EA%B3%84%EC%84%9C.txt))**
   - 다중 파일 관리 (로컬 `useState`): `+ 파일 추가`, 파일 탭/트리 전환, 파일별 소스코드 편집 (`textarea`)
   - 분석 설정 패널 (`AnalysisSettingsPanel`): 언어 선택(TS/JS), 분석 범위(현재 파일/전체), 3대 보안 정책 옵션
   - 분석 진행 패널 (`AnalysisProgressPanel`): 심플한 진행 상태 및 프로그레스 바(%) 표시 (실시간 로그 추적 제외하여 백엔드/프론트엔드 연동 부담 완화)
3. **취약점 분석 결과 페이지 ([SCR-003](note/04%20UI%ED%99%94%EB%A9%B4%20%EC%84%A4%EA%B3%84%EC%84%9C.txt))**
   - 유형 필터 탭 (`VulnerabilityTypeTabs`): SQL 삽입, 하드코딩 API 키, XSS 등 탭별 건수 및 필터링
   - 집계 요약 (`SeveritySummary`): 전체 건수 및 심각도 등급별 요약 카운터
   - 취약점 상세 정보 패널 (`FindingDetailPanel`): CWE 번호, 위험도, AI 신뢰도(%), 설명, 공격 효과, 탐지 룰 출처
   - Before / After Diff 비교 패널 (`CodeDiffPanel`): 취약 코드(빨강) vs 안전한 개선 코드(초록) 비교
   - 취약점 조치: 상태 변경 (미해결 / 해결 / 무시) 버튼
4. **비동기 분석 파이프라인 & 전역 상태 관리**
   - `analysisStore.js`: 분석 요청, 파일/취약점 목록 저장, 선택된 취약점 관리
   - **비동기 폴링 엔진**: 분석 시작 후 `GET /api/v1/analyses/{id}/status`를 2초 간격으로 폴링하여 진행률(%) 갱신 및 `COMPLETED` 시 결과 화면으로 전환
   - `analysisApi.js`, `findingApi.js`: 백엔드 분석/취약점 호출 함수 모듈화

#### 2.2 담당 파일 및 디렉토리
```text
src/
├── components/common/
│   ├── FileTree.jsx
│   ├── CodeViewer.jsx
│   ├── SeverityBadge.jsx
│   ├── LoadingSpinner.jsx
│   └── EmptyState.jsx
├── pages/CodeAnalysis/
│   ├── index.jsx
│   └── components/
│       ├── AnalysisSettingsPanel.jsx
│       └── AnalysisProgressPanel.jsx
├── pages/FindingResult/
│   ├── index.jsx
│   └── components/
│       ├── VulnerabilityTypeTabs.jsx
│       ├── SeveritySummary.jsx
│       ├── FindingDetailPanel.jsx
│       └── CodeDiffPanel.jsx
├── api/
│   ├── analysisApi.js
│   └── findingApi.js
├── stores/
│   └── analysisStore.js
└── data/
    ├── analysisData.js
    └── findingData.js
```

#### 2.3 담당 REST API
- `POST /api/v1/analyses` (분석 생성 및 분석 ID 발급)
- `GET /api/v1/analyses/{id}/status` (진행 상태 2초 폴링)
- `GET /api/v1/analyses/{id}` (분석 결과 요약)
- `GET /api/v1/analyses/{id}/files` & `/files/{fileId}` (파일 트리 및 파일 본문 조회)
- `GET /api/v1/analyses/{id}/findings` (취약점 목록 조회)
- `GET /api/v1/findings/{findingId}` (취약점 상세 조회)
- `PATCH /api/v1/findings/{findingId}/status` (취약점 해결/무시 상태 변경)

---

## 3. 요일별 주간 실행 로드맵 (화 ~ 금)

### 📅 화요일 : 전체 UI 및 공통 컴포넌트 완성
> **목표**: 백엔드가 없어도 디자인 시안과 거의 동일한 3개 핵심 화면을 이동하면서 확인할 수 있는 상태.

- **🧑‍💻 개발자 A**
  - [x] 홈 페이지 레이아웃 및 5개 컴포넌트 스타일 마무리
  - [x] 지표 카드 4종(`MetricCard`) 및 30일 심각도 막대 차트(`SeverityTrendChart`) 정돈
  - [x] 취약점 파이차트(`VulnerabilityPieChart`) SVG 색상 및 텍스트 위치 정밀 조정
  - [x] 공통 `Sidebar`, `PageHeader`, 버튼 CSS 통일 및 화면 축소 시 레이아웃 깨짐 점검
- **👩‍💻 개발자 B**
  - [x] 코드 분석 페이지 디자인 마무리 (`AnalysisSettingsPanel`, `AnalysisProgressPanel`)
  - [x] 분석 결과 페이지 디자인 마무리 (`VulnerabilityTypeTabs`, `SeveritySummary`, `FindingDetailPanel`, `CodeDiffPanel`)
  - [x] 공통 `FileTree`, `CodeViewer`, `SeverityBadge` 스타일 정돈
  - [x] 분석 화면과 결과 화면의 반응형 그리드 점검

---

### 📅 수요일 : 실제로 조작 가능한 프론트엔드 구현
> **목표**: 서버가 없어도 사용자가 클릭하고 코드를 입력하면서 전체 서비스 흐름을 체험할 수 있는 상태.

- **🧑‍💻 개발자 A (라우팅 & 화면 전환)**
  - [ ] `react-router-dom` 패키지 도입 및 `src/App.jsx` 라우터 구조화 (`/`, `/analysis/new`, `/analyses`, `/analyses/:analysisId`)
  - [ ] `Sidebar` 메뉴 항목 클릭 시 해당 URL로 라우트 이동 연동
  - [ ] 홈 화면 "코드 가져오기 시작" CTA 클릭 시 `/analysis/new`로 이동 처리
  - [ ] 분석 결과 목록 페이지 (`/analyses`) 기본 화면 골격 구현
- **👩‍💻 개발자 B (코드 입력 & 결과 동적 인터랙션)**
  - [ ] 분석 페이지: `+ 파일 추가` 클릭 시 파일 목록 추가 및 활성 파일 전환 (로컬 `useState`)
  - [ ] 분석 페이지: 에디터 내 소스코드 직접 수정/입력 기능 구현 (`textarea` 또는 편집 뷰어)
  - [ ] 분석 페이지: 3대 탐지 옵션 체크박스(SQL Injection / Secret / XSS) 및 분석 범위 선택 토글
  - [ ] 결과 페이지: 상단 취약점 탭 클릭 시 해당 취약점 목록만 필터링 렌더링
  - [ ] 결과 페이지: 특정 취약점 클릭 시 상세 설명(CWE, 신뢰도, 설명) 및 Before/After Diff 코드 동적 변경

---

### 📅 목요일 : Mock API 구조 + 상태 관리 + 추가 화면
> **목표**: Component → Zustand Store → API 함수 → Mock Data 계층 분리 완성 (나중에 Spring Boot가 완성되어도 UI 코드 수정 없이 API 레이어만 스위칭 가능).

- **🧑‍💻 개발자 A (Axios 기반 & 대시보드/목록 스토어)**
  - [ ] Axios 인스턴스 구축 (`src/api/client.js`): baseURL 환경변수화 및 목업/실서버 스위칭 구조
  - [ ] 대시보드 API & Store 구현 (`dashboardApi.js`, `dashboardStore.js`): 통계 캐싱 처리
  - [ ] 분석 결과 목록 페이지 (`/analyses`) 완성: 필터링, 정렬, 삭제 확인 모달 연동
  - [ ] 화면 4대 상태 처리: 로딩(`LoadingSpinner`), 빈 데이터(`EmptyState`), 에러(`ErrorMessage`), 알림(`Toast`)
- **👩‍💻 개발자 B (분석/결과 API & 2초 폴링 스토어)**
  - [ ] 분석 & 취약점 API 함수 모듈화 (`analysisApi.js`, `findingApi.js`)
  - [ ] `analysisStore.js` 구현: 분석 생성 요청, 결과 데이터 상태 저장
  - [ ] **2초 간격 비동기 폴링 시뮬레이터** 구현:
    - 시작 → 진행률 갱신(30% → 75% → 100%) → `COMPLETED` 시 결과 화면으로 자동 전환
  - [ ] 분석 중 / 분석 완료 / 분석 실패 상태 분기 처리

---

### 📅 금요일 : Spring Boot 연결 준비 + 통합 테스트
> **목표**: 프론트엔드 MVP 완성 및 백엔드 통합 가능한 상태 (실제 API 또는 완벽한 E2E 흐름 검증).

- **🧑‍💻 개발자 A (대시보드·목록 연동 및 보안/에러 핸들링)**
  - [ ] 백엔드 `GET /api/v1/dashboard/summary`, `GET /api/v1/analyses` 실서버 연동
  - [ ] Axios 인터셉터: 401(토큰 만료), 403(권한 없음), 500(서버 오류) 에러 공통 처리
  - [ ] 사이드바 최근 프로젝트 목록 실시간 동기화 확인
- **👩‍💻 개발자 B (핵심 분석 파이프라인 E2E 연동)**
  - [ ] 핵심 4단계 파이프라인 연동:
    1. 코드 입력 후 분석 시작 → `POST /api/v1/analyses` (analysisId 반환)
    2. `GET /api/v1/analyses/{id}/status` 2초 폴링 (`SCANNING` → `EXPLAINING` → `COMPLETED`)
    3. 완료 시 `/analyses/{id}` 자동 이동
    4. 분석 결과 요약, 파일 트리, 취약점 상세 정보, Before/After Diff 렌더링
  - [ ] 취약점 상태 변경 (`PATCH /api/v1/findings/{id}/status`) 연동
- **공통 (A + B)**
  - [ ] **전체 시나리오 통합 E2E 테스트**:  
    홈 진입 → 대시보드 확인 → 코드 분석 진입 → 코드 입력 및 옵션 설정 → 분석 시작 → 2초 폴링 진행 확인 → 결과 화면 확인 → 취약점 조치 → 홈 복귀 후 통계 갱신 확인
  - [ ] 최종 `npm run build` 검증 및 브랜치 머지

---

## 4. Git 협업 규칙 (머지 충돌 방지 약속)

1. **브랜치 명명 규칙**
   - 개발자 A: `feature/fe-platform-dashboard`
   - 개발자 B: `feature/fe-security-pipeline`
2. **공통 상수 파일 변경 금지**
   - `src/constants/`의 `severity.js`, `vulnerabilityTypes.js`, `navigation.js`는 이미 표준화되어 있으므로 임의 수정하지 않고 `import`하여 참조합니다.
3. **공통 컴포넌트(`components/common/`) 수정 시 사전 공유**
   - `FileTree`, `CodeViewer`, `SeverityBadge`의 Props를 변경해야 할 때만 5분 싱크 후 반영합니다.
4. **목업 데이터 독립성**
   - 개발자 A는 `src/data/dashboardData.js`만 수정하고, 개발자 B는 `src/data/analysisData.js`, `src/data/findingData.js`만 수정하여 데이터 파일 충돌을 원천 방지합니다.
