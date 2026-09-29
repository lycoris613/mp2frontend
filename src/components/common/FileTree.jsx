/**
 * 파일 탐색기 트리 공통 컴포넌트
 * 계층형 디렉토리/파일 구조 및 취약점 표시 점(●), 확장자 배지 지원
 * image/코드입력.png 및 image/결과화면.png 와이어프레임 준수
 */
export default function FileTree({
  items,
  activeFile = 'users.ts',
  onSelect,
  showFindingDot = false,
  rootLabel = '탐색기 · PAYMENTS-API',
  className = 'filetree',
}) {
  // 계층형 트리가 전달되지 않았을 경우 기본 트리 사용
  const defaultTree = [
    {
      name: 'src',
      isDir: true,
      children: [
        {
          name: 'routes',
          isDir: true,
          children: [
            { name: 'users.ts', isDir: false, ext: 'TS', hasFinding: true },
            { name: 'payments.ts', isDir: false, ext: 'TS', hasFinding: true },
          ],
        },
        { name: 'database.ts', isDir: false, ext: 'TS', hasFinding: false },
        { name: 'middleware.ts', isDir: false, ext: 'TS', hasFinding: false },
      ],
    },
    ...(showFindingDot
      ? [
          { name: 'config.ts', isDir: false, ext: 'TS', hasFinding: true },
          { name: 'auth.ts', isDir: false, ext: 'TS', hasFinding: true },
        ]
      : [
          { name: 'tests', isDir: true, children: [] },
          { name: 'package.json', isDir: false, ext: 'JSON', hasFinding: false },
        ]),
  ];

  const renderTreeNodes = (nodes, depth = 0) => {
    return nodes.map((node) => {
      const isSelected = !node.isDir && node.name === activeFile;
      const paddingLeft = depth === 0 ? '8px' : `${depth * 14 + 8}px`;

      if (node.isDir) {
        return (
          <div key={node.name} className="tree-node-group">
            <div
              className="tree-row is-dir"
              style={{ paddingLeft }}
            >
              <span className="folder-name">{node.name}</span>
            </div>
            {node.children && node.children.length > 0 && (
              <div className="tree-children">
                {renderTreeNodes(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          key={node.name}
          className={`tree-row is-file ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft }}
          onClick={() => onSelect?.(node.name)}
        >
          <span className="ext-badge">{node.ext || 'TS'}</span>
          <span className="file-name">{node.name}</span>
          {showFindingDot && node.hasFinding && (
            <span className="finding-dot">●</span>
          )}
        </div>
      );
    });
  };

  const treeData = items || defaultTree;

  return (
    <aside className={className}>
      <div className="tree-header">
        <small>{rootLabel}</small>
      </div>
      <div className="tree-body">
        {renderTreeNodes(treeData)}
      </div>
    </aside>
  );
}
