import { findingTotals } from '../../../data/findingData';

/**
 * 취약점 심각도별 집계 요약 카운터 컴포넌트
 * image/결과화면.png 와이어프레임 최신본 준수
 *
 * @param {object} totals - 전체 및 등급별 카운트
 */
export default function SeveritySummary({ totals = findingTotals }) {
  return (
    <div className="severity-summary-bar">
      <span className="summary-total">
        전체 <b>{totals.total}</b>
      </span>
      <span className="summary-item critical">
        <span className="dot red">●</span> 치명적 <b>{totals.critical}</b>
      </span>
      <span className="summary-item high">
        <span className="dot orange">●</span> 높음 <b>{totals.high}</b>
      </span>
      <span className="summary-item medium">
        <span className="dot gray">●</span> 중간·낮음 <b>{totals.mediumLow}</b>
      </span>
    </div>
  );
}
