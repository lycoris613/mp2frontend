/**
 * 코드 뷰어 공통 컴포넌트
 * 라인 번호 렌더, 취약점 테두리 박스 및 하단 배지 칩 지원
 * image/코드입력.png 및 image/결과화면.png 와이어프레임 준수
 *
 * @param {string} fileName - 탭에 표시할 파일명
 * @param {string[]} codeLines - 코드 라인 배열
 * @param {number|number[]} vulnLineIndices - 취약점 표시할 0-indexed 라인 번호
 * @param {string} tagLabel - 취약점 태그 라벨 (예: 'SQL 삽입 가능성 · 치명적')
 * @param {string} className - 컨테이너 추가 클래스
 * @param {React.ReactNode} children - 에디터 위에 띄울 오버레이 요소 등
 */
export default function CodeViewer({
  fileName = 'users.ts',
  codeLines = [],
  vulnLineIndices = [],
  tagLabel = '',
  className = 'editor',
  children,
}) {
  const vulnIndices = Array.isArray(vulnLineIndices)
    ? vulnLineIndices
    : [vulnLineIndices];

  return (
    <section className={className}>
      <div className="tab">{fileName}</div>
      <div className="code-container">
        <div className="code">
          {codeLines.map((line, index) => {
            const isVuln = vulnIndices.includes(index);
            return (
              <div
                className={`code-line ${isVuln ? 'vuln-line-highlight' : ''}`}
                key={index}
              >
                <em>{index + 1}</em>
                <code>{line || ' '}</code>
              </div>
            );
          })}
          {tagLabel && (
            <div className="code-tag-row">
              <span className="vuln-tag-chip">{tagLabel}</span>
            </div>
          )}
        </div>

        {/* 오버레이나 플로팅 패널을 위한 슬롯 */}
        {children}
      </div>
    </section>
  );
}
