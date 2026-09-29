/**
 * 홈 대시보드 (SCR-001) 관련 Mock 데이터
 * 04 UI화면 설계서 3절 및 05 React 컴포넌트 설계서 표 8-6 준수
 */
export const dashboardMetrics = [
  {
    id: 'analyses-count',
    label: '이번 주 분석',
    value: '128',
    caption: '지난 주 대비 +18%',
    tone: 'positive',
  },
  {
    id: 'vuln-count',
    label: '발견한 취약점',
    value: '47',
    caption: '치명적 3건 포함',
    tone: 'default',
  },
  {
    id: 'improvement-rate',
    label: '개선율',
    value: '86.4%',
    caption: '+6.2%p 개선',
    tone: 'positive',
  },
  {
    id: 'avg-time',
    label: '평균 분석 시간',
    value: '2분 18초',
    caption: '32초 단축',
    tone: 'positive',
  },
];

export const recentProjects = [
  {
    id: 1,
    name: 'payments-api',
    meta: 'Node.js · main',
    risk: 82,
    tone: 'danger',
    updatedAt: '3분 전',
  },
  {
    id: 2,
    name: 'auth-service',
    meta: 'Go · release/2.4',
    risk: 68,
    tone: 'warn',
    updatedAt: '1시간 전',
  },
  {
    id: 3,
    name: 'admin-console',
    meta: 'TypeScript · develop',
    risk: 21,
    tone: 'safe',
    updatedAt: '2시간 전',
  },
];

export const trendChartBars = [42, 34, 48, 39, 43, 37, 33, 29, 24, 20, 18, 14];
