import { sampleDiff } from '../../../data/findingData';

/**
 * 취약점 개선 전/후 비교 패널 (BEFORE / AFTER)
 * image/결과화면.png 와이어프레임 최신본 준수
 *
 * @param {string} fileName - 파일명
 * @param {number} startLine - 시작 라인 번호
 * @param {string[]} beforeLines - 수정 전 취약 코드 라인
 * @param {string[]} afterLines - 수정 후 안전한 권장 코드 라인
 */
export default function CodeDiffPanel({
  fileName = sampleDiff.fileName,
  startLine = sampleDiff.startLine,
  beforeLines = sampleDiff.beforeLines,
  afterLines = sampleDiff.afterLines,
}) {
  return (
    <div className="diff-card-grid">
      {/* BEFORE 패널 */}
      <section className="diff-panel before-panel">
        <div className="diff-panel-header">
          <span className="diff-tag before-tag">BEFORE</span>
          <span className="diff-filename">{fileName}</span>
        </div>
        <div className="diff-lines">
          {beforeLines.map((line, index) => (
            <div className="diff-row bad-line" key={index}>
              <span className="line-num">{startLine + index}</span>
              <code className="line-code">{line}</code>
            </div>
          ))}
        </div>
      </section>

      {/* AFTER 패널 */}
      <section className="diff-panel after-panel">
        <div className="diff-panel-header">
          <span className="diff-tag after-tag">AFTER</span>
          <span className="diff-filename">{fileName}</span>
        </div>
        <div className="diff-lines">
          {afterLines.map((line, index) => (
            <div className="diff-row good-line" key={index}>
              <span className="line-num">{startLine + index}</span>
              <code className="line-code">{line}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
