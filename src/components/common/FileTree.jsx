import { useState, useRef } from 'react';
import { Plus, ChevronRight, ChevronDown } from 'lucide-react';

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
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(false);
  const [openFolders, setOpenFolders] = useState({});

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : uncontrolledCollapsed;

  const handleToggleCollapse = (nextState) => {
    const nextVal = typeof nextState === 'boolean' ? nextState : !isCollapsed;
    if (onToggleCollapse) {
      onToggleCollapse(nextVal);
    } else {
      setUncontrolledCollapsed(nextVal);
    }
  };

  // 폴더 열림/닫힘 상태 판별 (지정된 상태 우선, 없으면 데이터의 isOpen 혹은 기본 true)
  const isFolderOpen = (node, nodeKey) => {
    if (openFolders[nodeKey] !== undefined) {
      return openFolders[nodeKey];
    }
    if (node.isOpen !== undefined) {
      return node.isOpen;
    }
    return true;
  };

  // 폴더 열림/닫힘 토글
  const toggleFolder = (node, nodeKey) => {
    const currentOpen = isFolderOpen(node, nodeKey);
    setOpenFolders((prev) => ({
      ...prev,
      [nodeKey]: !currentOpen,
    }));
  };

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
    handleToggleCollapse(false);
    processFiles(e.dataTransfer?.files);
  };

  const renderTreeNodes = (nodes, depth = 0, parentKey = '') => {
    return nodes.map((node, index) => {
      const nodeKey = parentKey ? `${parentKey}/${node.name}` : node.name;
      const isSelected = !node.isDir && node.name === activeFile;
      const paddingLeft = depth === 0 ? '6px' : `${depth * 14 + 6}px`;

      // 폴더 트리의 가장 상위 트리 (depth 0의 첫 번째 디렉토리 노드, e.g. 'src')
      const isTopmostTree = depth === 0 && index === 0 && node.isDir;

      if (node.isDir) {
        const isOpen = isFolderOpen(node, nodeKey);
        return (
          <div key={nodeKey} className="tree-node-group">
            <div
              className={`tree-row is-dir ${isTopmostTree ? 'is-topmost-dir' : ''}`}
              style={{ paddingLeft }}
              onClick={() => toggleFolder(node, nodeKey)}
              role="button"
              tabIndex={0}
              title={isOpen ? `${node.name} 폴더 접기` : `${node.name} 폴더 펼치기`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleFolder(node, nodeKey);
                }
              }}
            >
              <span className="folder-toggle-icon">
                {isOpen ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </span>
              <span className="folder-name">{node.name}</span>

              {/* 폴더 트리의 가장 상위 트리 맨 오른쪽에 + 버튼 배치 */}
              {isTopmostTree && showAddButton && (
                <button
                  type="button"
                  className="tree-node-add-btn"
                  title="컴퓨터에서 파일 추가"
                  aria-label="컴퓨터에서 파일 추가"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isOpen) {
                      toggleFolder(node, nodeKey);
                    }
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Plus size={11} />
                </button>
              )}
            </div>
            {isOpen && node.children && node.children.length > 0 && (
              <div className="tree-children">
                {renderTreeNodes(node.children, depth + 1, nodeKey)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          key={nodeKey}
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
      className={`${className} ${isDragOver ? 'drag-over' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="tree-file-input"
        aria-label="파일 업로드 입력창"
        onChange={handleFileInputChange}
      />
      {isCollapsed ? (
        <div
          className="tree-collapsed-strip"
          onClick={() => handleToggleCollapse(false)}
          title="탐색기 펼치기"
        >
          <button
            type="button"
            className="tree-collapse-btn"
            title="탐색기 펼치기"
            aria-label="탐색기 펼치기"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleCollapse(false);
            }}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      ) : (
        <>
          <div className="tree-header">
            <div className="tree-header-left">
              <small>{rootLabel}</small>
            </div>
            <button
              type="button"
              className="tree-collapse-btn"
              title="탐색기 축소 (닫기)"
              aria-label="탐색기 축소 (닫기)"
              onClick={() => handleToggleCollapse(true)}
            >
              <ChevronRight size={13} />
            </button>
          </div>
          <div className="tree-body">
            {renderTreeNodes(treeData)}
          </div>
        </>
      )}
    </aside>
  );
}
