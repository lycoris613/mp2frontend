import React, { useState, useMemo } from 'react';

/**
 * 코드 뷰어 공통 컴포넌트
 * 라인 번호 렌더, 취약점 테두리 박스 및 하단 배지 칩 지원
 * 다중 취약점 선택(activeVulnIndices) 및 다중 라인 단일 블럭 하이라이트 지원
 *
 * @param {string} fileName - 탭에 표시할 파일명
 * @param {string[]} codeLines - 코드 라인 배열
 * @param {number|number[]} vulnLineIndices - 취약점 표시할 0-indexed 라인 번호
 * @param {number[][]} vulnBlocks - 취약점별 라인 인덱스 블럭 배열 (예: [[7, 8], [14], [25, 26]])
 * @param {number} activeVulnIndex - 현재 포커스된 취약점 라인 번호
 * @param {number[]} activeVulnIndices - 현재 포커스된 취약점의 모든 라인 번호 배열
 * @param {function} onLineClick - 라인 클릭 콜백
 * @param {string} tagLabel - 취약점 태그 라벨
 * @param {string} className - 컨테이너 추가 클래스
 * @param {React.ReactNode} children - 에디터 위에 띄울 오버레이 요소 등
 */
export default function CodeViewer({
  fileName = 'users.ts',
  codeLines = [],
  vulnLineIndices = [],
  vulnBlocks = null,
  activeVulnIndex = null,
  activeVulnIndices = null,
  onLineClick = null,
  tagLabel = '',
  className = 'editor',
  children,
}) {
  const [hoveredBlockIdx, setHoveredBlockIdx] = useState(null);

  const vulnIndices = Array.isArray(vulnLineIndices)
    ? vulnLineIndices
    : (vulnLineIndices !== null && vulnLineIndices !== undefined ? [vulnLineIndices] : []);

  const activeIndices = Array.isArray(activeVulnIndices)
    ? activeVulnIndices
    : (activeVulnIndex !== null && activeVulnIndex !== undefined ? [activeVulnIndex] : []);

  // 취약점 라인 블럭 계산 (명시적 vulnBlocks 우선, 없으면 연속 인덱스 자동 그룹화)
  const effectiveBlocks = useMemo(() => {
    if (Array.isArray(vulnBlocks) && vulnBlocks.length > 0) {
      return vulnBlocks;
    }
    if (vulnIndices.length === 0) return [];

    const sorted = [...new Set(vulnIndices)].sort((a, b) => a - b);
    const groups = [];
    let currentGroup = [];
    sorted.forEach((idx) => {
      if (currentGroup.length === 0) {
        currentGroup.push(idx);
      } else if (idx === currentGroup[currentGroup.length - 1] + 1) {
        currentGroup.push(idx);
      } else {
        groups.push(currentGroup);
        currentGroup = [idx];
      }
    });
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    return groups;
  }, [vulnBlocks, vulnIndices]);

  return (
    <section className={className}>
      <div className="tab">{fileName}</div>
      <div className="code-container">
        <div className="code">
          {codeLines.map((line, index) => {
            const lineNum = index + 1;
            const isVuln = vulnIndices.includes(index);
            const isActiveVuln = isVuln && activeIndices.includes(index);

            // 블럭 내 위치 판별 (single, start, middle, end) 및 호버 블럭 판별
            let blockClass = '';
            let blockIndex = -1;
            if (isVuln) {
              blockIndex = effectiveBlocks.findIndex((b) => b.includes(index));
              if (blockIndex !== -1) {
                const block = effectiveBlocks[blockIndex];
                const len = block.length;
                const pos = block.indexOf(index);
                if (len === 1) {
                  blockClass = 'vuln-block-single';
                } else if (pos === 0) {
                  blockClass = 'vuln-block-start';
                } else if (pos === len - 1) {
                  blockClass = 'vuln-block-end';
                } else {
                  blockClass = 'vuln-block-middle';
                }
              } else {
                blockClass = 'vuln-block-single';
              }
            }

            const isBlockHovered = isVuln && !isActiveVuln && hoveredBlockIdx !== null && hoveredBlockIdx === blockIndex;

            return (
              <div
                className={`code-line ${isVuln ? 'vuln-line-highlight' : ''} ${isActiveVuln ? 'vuln-active-highlight' : ''} ${blockClass} ${isBlockHovered ? 'vuln-block-hovered' : ''}`}
                key={index}
                onClick={() => onLineClick?.(index)}
                onMouseEnter={() => isVuln && blockIndex !== -1 && setHoveredBlockIdx(blockIndex)}
                onMouseLeave={() => setHoveredBlockIdx(null)}
                style={onLineClick && isVuln ? { cursor: 'pointer' } : undefined}
                title={isVuln ? `라인 ${lineNum}: 취약점 탐지 위치 (클릭하여 선택)` : undefined}
              >
                <em>{lineNum}</em>
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
