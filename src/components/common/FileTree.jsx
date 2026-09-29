import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';

/**
 * 파일 탐색기 트리 공통 컴포넌트
 * 계층형 디렉토리/파일 구조, 취약점 표시 점(●), 확장자 배지 및 로컬 파일 추가(+) 지원
 *
 * @param {Array} items - 트리 데이터
 * @param {string} activeFile - 현재 선택된 파일명
 * @param {function} onSelect - 파일 선택 콜백
 * @param {boolean} showFindingDot - 취약점 점(●) 표시 여부
 * @param {boolean} showAddButton - 상단 '+' 파일 추가 버튼 표시 여부
 * @param {function} onAddFile - 파일 추가 콜백 ({ name, content, ext })
 * @param {string} rootLabel - 상단 라벨
 * @param {string} className - 컨테이너 추가 클래스
 */
export default function FileTree({
  items,
  activeFile = 'users.ts',
  onSelect,
  showFindingDot = false,
  showAddButton = false,
  onAddFile,
  rootLabel = '탐색기 · PAYMENTS-API',
  className = 'filetree',
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // 기본 트리 데이터
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

  // 로컬 파일 읽기 공통 처리 함수
  const processFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;

    Array.from(fileList).forEach((file) => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      const reader = new FileReader();

      reader.onload = (event) => {
        const content = event.target?.result || '';
        onAddFile?.({
          name: file.name,
          content: String(content),
          ext,
        });
      };

      reader.readAsText(file);
    });
  };

  // 탐색기 창에서 파일 선택 시 처리
  const handleFileInputChange = (e) => {
    processFiles(e.target.files);
  };

  // 드래그 앤 드롭 지원
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    processFiles(e.dataTransfer?.files);
  };

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
    <aside
      className={`${className} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="tree-header">
        <small>{rootLabel}</small>
        {showAddButton && (
          <>
            <button
              type="button"
              className="tree-add-btn"
              title="컴퓨터에서 파일 추가"
              aria-label="컴퓨터에서 파일 추가"
              onClick={(e) => {
                e.stopPropagation();
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }}
            >
              <Plus size={13} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="tree-file-input"
              aria-label="파일 업로드 입력창"
              onChange={handleFileInputChange}
            />
          </>
        )}
      </div>
      <div className="tree-body">
        {renderTreeNodes(treeData)}
      </div>
    </aside>
  );
}
