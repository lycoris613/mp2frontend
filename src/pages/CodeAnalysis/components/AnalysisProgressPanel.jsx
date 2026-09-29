import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { analysisProgressInfo } from '../../../data/analysisData';

/**
 * 분석 진행 오버레이 패널 컴포넌트
 * image/코드입력.png 와이어프레임 최신본 준수
 * 에디터 중앙에 플로팅되는 다크 테마 카드
 *
 * @param {boolean} visible - 표시 여부
 * @param {number} percent - 진행률 (0 ~ 100)
 * @param {function} onClose - 닫기 콜백
 */
export default function AnalysisProgressPanel({
  visible = true,
  percent = analysisProgressInfo.percent,
  onClose,
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (!visible) return null;

  return (
    <div className="analysis-overlay-card">
      <div className="overlay-header">
        <div className="overlay-title">
          <span className="pulsing-dot">●</span>
          <b>분석 실행 중</b>
        </div>
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? '펼치기' : '접기'}
        >
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="overlay-body">
          <div className="progress-row">
            <div className="custom-progress-track">
              <div
                className="custom-progress-bar"
                style={{ width: `${percent}%` }}
              ></div>
            </div>
            <span className="percent-text">{percent}%</span>
          </div>

          <div className="console-logs">
            <p className="log-target">
              처리 중　<span>{analysisProgressInfo.currentFile}</span>
            </p>
            {analysisProgressInfo.logs.map((log, index) => (
              <p className="log-line" key={index}>
                {log}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
