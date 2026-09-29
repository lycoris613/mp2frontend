/**
 * 지표 통계 카드 컴포넌트
 * 05 React 컴포넌트 설계서 표 8-6 준수
 *
 * @param {string} label - 지표명 (예: '이번 주 분석')
 * @param {string|number} value - 지표 값 (예: '128', '86.4%')
 * @param {string} caption - 부가 설명 (예: '지난 주 대비 +18%')
 * @param {'default'|'positive'|'negative'} tone - 캡션 색조
 */
export default function MetricCard({
  label,
  value,
  caption = '',
  tone = 'default',
}) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <b>{value}</b>
      {caption && <small className={tone}>{caption}</small>}
    </article>
  );
}
