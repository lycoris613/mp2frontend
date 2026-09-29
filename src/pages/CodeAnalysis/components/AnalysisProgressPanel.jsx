/**
 * 분석 진행 오버레이 패널 컴포넌트
 * 복잡한 실시간 로그 추적을 제외하고 심플한 진행 상태 및 프로그레스바로 간소화
 *
 * @param {boolean} visible - 표시 여부
 * @param {number} percent - 진행률 (0 ~ 100)
 */
export default function AnalysisProgressPanel({
  visible = true,
  percent = 64,
}) {
  if (!visible) return null;

  return (
    <div className="analysis-overlay-card compact">
      <div className="overlay-header">
        <div className="overlay-title">
          <span className="pulsing-dot">●</span>
          <b>분석 실행 중</b>
        </div>
        <span className="percent-text">{percent}%</span>
      </div>

      <div className="progress-row">
        <div className="custom-progress-track">
          <div
            className="custom-progress-bar"
            style={{ width: `${percent}%` }}
          ></div>
        </div>
      </div>

      <p className="simple-status-msg">
        취약점 패턴 및 보안 규칙을 분석하고 있습니다...
      </p>
    </div>
  );
}
