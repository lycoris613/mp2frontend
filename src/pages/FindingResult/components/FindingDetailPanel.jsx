import { useState, useEffect } from 'react';
import { currentFinding } from '../../../data/findingData';

/**
 * 취약점 상세 정보 및 AI 분석 패널
 * image/결과화면.png 와이어프레임 최신본 준수
 *
 * @param {object} finding - 취약점 상세 데이터
 * @param {function} onResolve - 해결 처리 콜백
 * @param {function} onIgnore - 무시 처리 콜백
 * @param {function} onScopeChange - 코드 표시 범위 변경 콜백
 */
export default function FindingDetailPanel({
  finding = currentFinding,
  scope: controlledScope,
  onResolve,
  onIgnore,
  onScopeChange,
}) {
  const [internalScope, setInternalScope] = useState('finding'); // 'finding' | 'full'
  const scope = controlledScope !== undefined ? controlledScope : internalScope;
  const [status, setStatus] = useState('OPEN'); // 'OPEN' | 'RESOLVED' | 'IGNORED'
  const findingId = finding?.id || finding?.findingId;

  useEffect(() => {
    if (finding) {
      setStatus(finding.status || 'OPEN');
    }
  }, [finding]);

  const handleResolve = () => {
    setStatus('RESOLVED');
    onResolve?.(findingId, scope);
  };

  const handleIgnore = () => {
    setStatus('IGNORED');
    onIgnore?.(findingId);
  };

  const handleScopeSelect = (newScope) => {
    setInternalScope(newScope);
    onScopeChange?.(newScope);
  };

  if (!finding) {
    return (
      <aside className="finding">
        <p className="empty-finding-text">취약점을 선택해 주세요.</p>
      </aside>
    );
  }

  return (
    <aside className="finding">
      {/* 상단 심각도 배지 */}
      <div className="finding-header-badge-row">
        <span className="severity-dark-badge">
          {finding.severityBadge || `${finding.cwe} · 치명적`}
        </span>
      </div>

      {/* 취약점 타이틀 */}
      <h3 className="finding-main-title">{finding.title}</h3>

      {/* 탐지 근거 · 룰 기반 박스 */}
      {finding.detectionSource && (
        <div className="rule-detection-box">
          <div className="rule-box-header">
            {finding.detectionSource.title}
          </div>
          <div className="rule-box-content">
            <div className="rule-row">
              <span className="rule-label">룰 ID</span>
              <span className="rule-value">{finding.detectionSource.ruleId}</span>
            </div>
            <div className="rule-row">
              <span className="rule-label">룰 제목</span>
              <span className="rule-value">{finding.detectionSource.ruleTitle}</span>
            </div>
            <div className="rule-row">
              <span className="rule-label">매칭 코드</span>
              <code className="rule-code-snippet">
                {finding.detectionSource.matchedCode}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* AI 분석 섹션 */}
      <div className="ai-analysis-section">
        <div className="ai-section-header">
          <span className="ai-title">AI 분석</span>
          <span className="ai-confidence">
            AI 신뢰도 {finding.confidence}
          </span>
        </div>

        <div className="ai-field">
          <label>설명</label>
          <p>{finding.description}</p>
        </div>

        <div className="ai-field">
          <label>권장 조치</label>
          <p>{finding.recommendation}</p>
        </div>
      </div>

      {/* 해결 / 무시 액션 버튼 */}
      <div className="finding-action-buttons">
        <button
          className={`action-btn resolve-btn ${status === 'RESOLVED' ? 'completed' : ''}`}
          onClick={handleResolve}
        >
          {status === 'RESOLVED' ? '✓ 해결 완료' : '해결'}
        </button>
        <button
          className={`action-btn ignore-btn ${status === 'IGNORED' ? 'completed' : ''}`}
          onClick={handleIgnore}
        >
          {status === 'IGNORED' ? '무시됨' : '무시'}
        </button>
      </div>

      {/* 이 취약점만 / 전체 코드 토글 버튼 */}
      <div className="scope-toggle-group">
        <button
          className={`toggle-option ${scope === 'finding' ? 'active' : ''}`}
          onClick={() => handleScopeSelect('finding')}
        >
          이 취약점만
        </button>
        <button
          className={`toggle-option ${scope === 'full' ? 'active' : ''}`}
          onClick={() => handleScopeSelect('full')}
        >
          전체 코드
        </button>
      </div>
    </aside>
  );
}
