# CodeGuard AI Frontend

백엔드가 준비되기 전 UI/UX를 먼저 구현하기 위한 React + Vite 목업입니다. 현재 데이터는 `src/data/mockData.js`의 임시 데이터이며, 이후 Spring Boot REST API 응답으로 교체할 수 있습니다.

## 실행

```bash
npm install
npm run dev
```

VS Code 터미널에 표시되는 `http://localhost:5173` 주소를 브라우저에서 엽니다.

## 화면
- 홈: 보안 워크스페이스 대시보드
- 코드 분석: 파일 트리, 코드 에디터, 분석 설정, 진행 로그
- 분석 결과: 취약점 필터, 탐지 코드, 설명, Before/After 수정안

## 백엔드 연동 시
`src/data/mockData.js` 대신 `src/api/` 폴더를 만들고 Spring Boot API를 `fetch` 또는 Axios로 호출하면 됩니다. 화면 컴포넌트 구조는 그대로 사용할 수 있습니다.
