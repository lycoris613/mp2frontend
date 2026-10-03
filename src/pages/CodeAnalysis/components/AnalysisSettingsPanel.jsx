import { useMemo, useState } from 'react';
import { defaultAnalysisConfig, detectLanguage } from '../../../data/analysisData';
import { estimateAnalysis } from '../../../utils/analysisEstimate';

/**
 * 분석 범위 및 설정 패널
 * image/코드입력.png 와이어프레임 준수
 *
 * @param {function} onStartAnalysis - 분석 시작 콜백
 * @param {string} selectedFile - 현재 선택된 파일명
 * @param {Array|string} codeContent - 현재 선택된 파일 코드 내용
 * @param {Object} fileContents - 분석 요청에 담기는 전체 파일 내용 (예상 분석 시간 계산용)
 */
export default function AnalysisSettingsPanel({
  onStartAnalysis,
  selectedFile = 'users.ts',
  codeContent = [],
  fileContents = {},
}) {
  const [title, setTitle] = useState(defaultAnalysisConfig.title);
  const [scope, setScope] = useState(defaultAnalysisConfig.scope);
  const [rules, setRules] = useState(defaultAnalysisConfig.rules);

  const langInfo = detectLanguage(selectedFile, codeContent);

  const handleToggleRule = (id) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, checked: !rule.checked } : rule
      )
    );
  };

  const estimate = useMemo(() => estimateAnalysis(fileContents), [fileContents]);

  const isAnyRuleChecked = rules.some((r) => r.checked);
  const canStart = isAnyRuleChecked && langInfo.isSupported;

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

      {/* 감지된 언어 (지원 언어: Java, TS, JS, Python, HTML / 알 수 없으면 확인실패) */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ margin: 0 }}>감지된 언어</label>
          <span style={{ fontSize: '11px', color: langInfo.isSupported ? '#10b981' : '#ef4444', fontWeight: 600 }}>
            {langInfo.isSupported ? '✓ 분석 지원' : '✗ 확인실패'}
          </span>
        </div>
        <div
          className="select-badge-box"
          style={
            !langInfo.isSupported
              ? { borderColor: '#fca5a5', backgroundColor: '#fef2f2' }
              : { borderColor: '#e2e8f0', backgroundColor: '#ffffff' }
          }
        >
          <span
            className="lang-tag"
            style={
              !langInfo.isSupported
                ? { backgroundColor: '#ef4444', color: '#ffffff' }
                : { backgroundColor: '#1e293b', color: '#ffffff' }
            }
          >
            {langInfo.tag}
          </span>
          <span
            style={
              !langInfo.isSupported
                ? { color: '#dc2626', fontWeight: 600 }
                : { color: '#1e293b', fontWeight: 500 }
            }
          >
            {langInfo.displayName}
          </span>
        </div>
        {!langInfo.isSupported && (
          <small
            className="help-text"
            style={{ color: '#dc2626', marginTop: '5px', display: 'block', fontWeight: 500 }}
          >
            ⚠️ {langInfo.message} (확인실패로 분석이 불가능합니다)
          </small>
        )}
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
        <b className="estimate-value">{estimate.time}</b>
        <small className="estimate-meta">{estimate.meta}</small>
      </div>

      {/* 취약점 분석 시작 버튼 */}
      <button
        className="dark-btn wide"
        onClick={() => onStartAnalysis?.({ title, scope, rules, language: langInfo.language })}
        disabled={!canStart}
        style={!canStart ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#94a3b8' } : {}}
      >
        {!langInfo.isSupported ? '지원하지 않는 언어 (확인실패)' : '취약점 분석 시작'}
      </button>
    </aside>
  );
}
