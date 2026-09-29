/**
 * 취약점 심각도(Severity) 상수 및 표시 정보
 * 04 UI화면 설계서 2.3절 및 05 React 컴포넌트 설계서 표 8-1 준수
 */
export const SEVERITY = {
  CRITICAL: {
    key: 'CRITICAL',
    label: '치명적',
    tone: 'danger',
    dot: '●',
  },
  HIGH: {
    key: 'HIGH',
    label: '높음',
    tone: 'warn',
    dot: '●',
  },
  MEDIUM: {
    key: 'MEDIUM',
    label: '중간',
    tone: 'moderate',
    dot: '●',
  },
  LOW: {
    key: 'LOW',
    label: '낮음',
    tone: 'safe',
    dot: '●',
  },
};

export const SEVERITY_LIST = [
  SEVERITY.CRITICAL,
  SEVERITY.HIGH,
  SEVERITY.MEDIUM,
  SEVERITY.LOW,
];
