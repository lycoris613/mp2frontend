import { useState } from 'react';
import { defaultAnalysisConfig } from '../../../data/analysisData';

/**
 * 분석 범위 및 설정 패널
 * image/코드입력.png 와이어프레임 준수
 *
 * @param {function} onStartAnalysis - 분석 시작 콜백
 */
export default function AnalysisSettingsPanel({ onStartAnalysis }) {
  const [title, setTitle] = useState(defaultAnalysisConfig.title);
  const [scope, setScope] = useState(defaultAnalysisConfig.scope);
  const [rules, setRules] = useState(defaultAnalysisConfig.rules);

  const handleToggleRule = (id) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, checked: !rule.checked } : rule
      )
    );
  };

  const isAnyRuleChecked = rules.some((r) => r.checked);

  return (
    <aside className="settings">
      <h3>분석 범위 및 설정</h3>

      {/* 분석 제목 */}
      <div className="form-group">
        <label>
          분석 제목 <span className="req">*</span>
        </label>
        <input
          type="text"
          className="text-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="분석 프로젝트명을 입력하세요"
        />
      </div>

      {/* 감지된 언어 */}
      <div className="form-group">
        <label>감지된 언어</label>
        <div className="select-badge-box">
          <span className="lang-tag">TS</span>
          <span>{defaultAnalysisConfig.detectedLanguage}</span>
        </div>
      </div>

      {/* 분석 범위 */}
      <div className="form-group">
        <label>분석 범위</label>
        <select
          className="select-input"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          {defaultAnalysisConfig.scopeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* 탐지 룰 */}
      <div className="form-group">
        <label>
          탐지 룰 <span className="req">*</span>
        </label>
        <div className="checkbox-group">
          {rules.map((rule) => (
            <label className="checkbox-label" key={rule.id}>
              <input
                type="checkbox"
                checked={rule.checked}
                onChange={() => handleToggleRule(rule.id)}
              />
              <span>{rule.label}</span>
            </label>
          ))}
        </div>
        <small className="help-text">1개 이상 선택하세요</small>
      </div>

      {/* 예상 분석 시간 */}
      <div className="estimate-card">
        <span className="estimate-label">예상 분석 시간</span>
        <b className="estimate-value">{defaultAnalysisConfig.estimatedTime}</b>
        <small className="estimate-meta">{defaultAnalysisConfig.estimatedMeta}</small>
      </div>

      {/* 취약점 분석 시작 버튼 */}
      <button
        className="dark-btn wide"
        onClick={() => onStartAnalysis?.({ title, scope, rules })}
        disabled={!isAnyRuleChecked}
      >
        취약점 분석 시작
      </button>
    </aside>
  );
}
