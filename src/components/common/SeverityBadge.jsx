import { SEVERITY } from '../../constants/severity';

/**
 * 심각도 배지 공통 컴포넌트
 * 05 React 컴포넌트 설계서 표 8-7 준수
 * @param {string} severity - 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' 또는 한글 '치명적' 등
 * @param {string|null} cweId - 예: 'CWE-89'
 * @param {'sm'|'md'} size
 */
export default function SeverityBadge({ severity, cweId = null, size = 'sm' }) {
  const normKey =
    typeof severity === 'string'
      ? severity.toUpperCase().replace(/\s+/g, '_')
      : 'LOW';

  const config =
    SEVERITY[normKey] ||
    Object.values(SEVERITY).find((s) => s.label === severity) ||
    SEVERITY.LOW;

  const labelText = cweId ? `${config.label} · ${cweId}` : config.label;

  return (
    <span className={`risk ${config.tone} badge-${size}`}>
      {config.dot} {labelText}
    </span>
  );
}
