import { trendChartBars } from '../../../data/dashboardData';

/**
 * 30일간 위험 추세 및 심각도 막대 차트 패널
 * 05 React 컴포넌트 설계서 표 3-1 준수
 *
 * @param {number[]} chartBars - 차트 막대 높이 배열
 */
export default function SeverityTrendChart({ chartBars = trendChartBars }) {
  return (
    <section className="panel severity">
      <div className="panel-head">
        <b>위험 추세 · 심각도</b>
        <small>최근 30일</small>
      </div>
      <div className="bars">
        {chartBars.map((height, index) => (
          <i key={index} style={{ height: `${height}px` }}></i>
        ))}
      </div>
      <div className="legend">● 치명적　● 높음　● 중간　● 낮음</div>
    </section>
  );
}
