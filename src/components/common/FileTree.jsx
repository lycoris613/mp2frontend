import { useState, useRef, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FilePlus,
  Edit2,
  Trash2,
  X,
  Upload,
  AlertTriangle,
} from 'lucide-react';

/**
 * 파일 탐색기 트리 공통 컴포넌트
 * 계층형 디렉토리/파일 구조, 취약점 표시 점(●), 확장자 배지
 * 마우스 우클릭 시 계층 폴더(파일 추가, 이름 수정, 삭제) 및 코드 파일(이름 수정, 삭제) 기능 지원
 * 마우스 드래그 앤 드롭을 통한 파일 계층(폴더 이동) 변경 지원
 *
 * @param {Array} items - 트리 데이터
 * @param {string} activeFile - 현재 선택된 파일명
 * @param {function} onSelect - 파일 선택 콜백
 * @param {boolean} showFindingDot - 취약점 점(●) 표시 여부
 * @param {boolean} enableContextMenu - 우클릭 컨텍스트 메뉴(파일 추가, 수정, 삭제) 활성화 여부
 * @param {function} onAddFile - 파일 추가 콜백 ({ name, content, ext, relativePath, targetFolder })
 * @param {function} onRenameFile - 파일/폴더 이름 변경 콜백 ({ oldName, newName, oldRelPath, newRelPath, isDir })
 * @param {function} onDeleteFile - 파일/폴더 삭제 콜백 ({ name, relativePath, isDir })
 * @param {function} onMoveFile - 파일/폴더 계층 이동 콜백 ({ name, oldRelPath, newRelPath, targetFolder, isDir })
 * @param {string} rootLabel - 상단 라벨
 * @param {string} className - 컨테이너 추가 클래스
 */
export default function FileTree({
  items,
  activeFile = 'users.ts',
  onSelect,
  showFindingDot = false,
  enableContextMenu = false,
  onAddFile,
  onRenameFile,
  onDeleteFile,
  onMoveFile,
  rootLabel = '탐색기 · PAYMENTS-API',
  className = 'filetree',
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(false);
  const [openFolders, setOpenFolders] = useState({});

  // 드래그 앤 드롭 계층 이동 상태
  const [draggedItem, setDraggedItem] = useState(null); // { name, nodeKey, isDir }
  const [dragOverFolder, setDragOverFolder] = useState(''); // 대상 폴더의 nodeKey

  // 우클릭 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    node: null,
    nodeKey: '',
    isDir: false,
  });

  // 모달 상태
  const [addModal, setAddModal] = useState({ open: false, targetFolder: '' });
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');

  const [renameModal, setRenameModal] = useState({
    open: false,
    node: null,
    nodeKey: '',
    isDir: false,
  });
  const [renameValue, setRenameValue] = useState('');

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    node: null,
    nodeKey: '',
    isDir: false,
  });

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : uncontrolledCollapsed;

  // 컨텍스트 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    const handleOutsideClick = () => {
      if (contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('scroll', handleOutsideClick, true);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('scroll', handleOutsideClick, true);
    };
  }, [contextMenu.visible]);

  const handleToggleCollapse = (nextState) => {
    const nextVal = typeof nextState === 'boolean' ? nextState : !isCollapsed;
    if (onToggleCollapse) {
      onToggleCollapse(nextVal);
    } else {
      setUncontrolledCollapsed(nextVal);
    }
  };

  // 폴더 열림/닫힘 상태 판별
  const isFolderOpen = (node, nodeKey) => {
    if (openFolders[nodeKey] !== undefined) {
      return openFolders[nodeKey];
    }
    if (node.isOpen !== undefined) {
      return node.isOpen;
    }
    return true;
  };

  const toggleFolder = (node, nodeKey) => {
    const currentOpen = isFolderOpen(node, nodeKey);
    setOpenFolders((prev) => ({
      ...prev,
      [nodeKey]: !currentOpen,
    }));
  };

  // 우클릭 컨텍스트 메뉴 트리거
  const handleNodeContextMenu = (e, node, nodeKey) => {
    if (!enableContextMenu) return;
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 160;
    const menuHeight = node.isDir ? 120 : 80;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);

    setContextMenu({
      visible: true,
      x,
      y,
      node,
      nodeKey,
      isDir: Boolean(node.isDir),
    });
  };

  // 파일 업로드 인풋 변경 시
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      setNewFileName(file.name);
      setNewFileContent(content);
    };
    reader.readAsText(file);
  };

  // 1. 파일 추가 실행 (계층 폴더만 가능)
  const submitAddFile = () => {
    const trimmed = newFileName.trim();
    if (!trimmed) return;

    const targetFolder = addModal.targetFolder;
    const relativePath = targetFolder ? `${targetFolder}/${trimmed}` : trimmed;
    const ext = trimmed.split('.').pop()?.toUpperCase() || 'FILE';
    const content = newFileContent || `// ${trimmed}\n`;

    onAddFile?.({
      name: trimmed,
      content,
      ext,
      relativePath,
      targetFolder,
    });

    setAddModal({ open: false, targetFolder: '' });
    setNewFileName('');
    setNewFileContent('');
  };

  // 2. 이름 변경 실행
  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (!trimmed || !renameModal.node) return;
    if (trimmed === renameModal.node.name) {
      setRenameModal({ open: false, node: null, nodeKey: '', isDir: false });
      return;
    }

    const oldName = renameModal.node.name;
    const oldRelPath = renameModal.nodeKey;
    const parts = oldRelPath.split('/');
    parts[parts.length - 1] = trimmed;
    const newRelPath = parts.join('/');

    onRenameFile?.({
      oldName,
      newName: trimmed,
      oldRelPath,
      newRelPath,
      isDir: renameModal.isDir,
    });

    setRenameModal({ open: false, node: null, nodeKey: '', isDir: false });
    setRenameValue('');
  };

  // 3. 삭제 실행
  const submitDelete = () => {
    if (!deleteModal.node) return;
    const target = deleteModal.node;
    const relPath = deleteModal.nodeKey;

    onDeleteFile?.({
      name: target.name,
      relativePath: relPath,
      isDir: deleteModal.isDir,
    });

    setDeleteModal({ open: false, node: null, nodeKey: '', isDir: false });
  };

  // 외부 파일 드래그 오버
  const handleDragOver = (e) => {
    if (!draggedItem) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    if (!draggedItem) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    if (!draggedItem) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    }
  };

  // 루트 영역으로 드롭 시 처리 (빈 공간에 드롭하면 루트 계층으로 이동)
  const handleRootDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder('');

    let item = draggedItem;
    if (!item) {
      try {
        const raw = e.dataTransfer?.getData('text/plain');
        if (raw) item = JSON.parse(raw);
      } catch (err) {}
    }
    if (!item || !item.name) return;

    const sourceName = item.name;
    const sourceRelPath = item.nodeKey;
    const targetFolder = '';
    const newRelPath = sourceName;

    if (sourceRelPath !== newRelPath) {
      onMoveFile?.({
        name: sourceName,
        oldRelPath: sourceRelPath,
        newRelPath,
        targetFolder,
        isDir: item.isDir,
      });
    }
    setDraggedItem(null);
  };

  // 트리 노드 렌더링
  const renderTreeNodes = (nodes, depth = 0, parentKey = '') => {
    return nodes.map((node, index) => {
      const nodeKey = parentKey ? `${parentKey}/${node.name}` : node.name;
      const isSelected = !node.isDir && node.name === activeFile;
      const paddingLeft = depth === 0 ? '6px' : `${depth * 14 + 6}px`;
      const isTopmostTree = depth === 0 && index === 0 && node.isDir;

      // 폴더 노드인 경우
      if (node.isDir) {
        const isOpen = isFolderOpen(node, nodeKey);
        const isFolderDragTarget = dragOverFolder === nodeKey;

        return (
          <div key={nodeKey} className="tree-node-group">
            <div
              className={`tree-row is-dir ${isTopmostTree ? 'is-topmost-dir' : ''} ${isFolderDragTarget ? 'is-drag-target' : ''}`}
              style={{
                paddingLeft,
                ...(isFolderDragTarget
                  ? {
                      background: 'rgba(56, 189, 248, 0.22)',
                      outline: '1px dashed #38bdf8',
                      borderRadius: '4px',
                      color: '#38bdf8',
                    }
                  : {}),
              }}
              onClick={() => toggleFolder(node, nodeKey)}
              onContextMenu={(e) => handleNodeContextMenu(e, node, nodeKey)}
              // 폴더에 드래그 오버 & 드롭 (계층 이동 수신)
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer) {
                  e.dataTransfer.dropEffect = 'move';
                }
                if (dragOverFolder !== nodeKey) {
                  setDragOverFolder(nodeKey);
                }
              }}
              onDragLeave={(e) => {
                e.stopPropagation();
                if (dragOverFolder === nodeKey) {
                  setDragOverFolder('');
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverFolder('');

                let item = draggedItem;
                if (!item) {
                  try {
                    const raw = e.dataTransfer?.getData('text/plain');
                    if (raw) item = JSON.parse(raw);
                  } catch (err) {}
                }
                if (!item || !item.name) return;

                const sourceName = item.name;
                const sourceRelPath = item.nodeKey;
                const targetFolder = nodeKey;
                const newRelPath = `${targetFolder}/${sourceName}`;

                // 이전 위치와 동일한 위치면 무시
                if (sourceRelPath === newRelPath) {
                  setDraggedItem(null);
                  return;
                }

                // 대상 폴더를 열린 상태로 전환
                setOpenFolders((prev) => ({ ...prev, [nodeKey]: true }));

                onMoveFile?.({
                  name: sourceName,
                  oldRelPath: sourceRelPath,
                  newRelPath,
                  targetFolder,
                  isDir: item.isDir,
                });

                setDraggedItem(null);
              }}
              role="button"
              tabIndex={0}
              title={
                enableContextMenu
                  ? `${node.name} (클릭: 접기/펼치기, 우클릭: 파일 추가/수정/삭제, 파일 드롭: 이 폴더로 이동)`
                  : isOpen ? `${node.name} 폴더 접기` : `${node.name} 폴더 펼치기`
              }
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
            </div>
            {isOpen && node.children && node.children.length > 0 && (
              <div className="tree-children">
                {renderTreeNodes(node.children, depth + 1, nodeKey)}
              </div>
            )}
          </div>
        );
      }

      // 파일 노드인 경우 (드래그 가능: draggable={true})
      const isBeingDragged = draggedItem?.nodeKey === nodeKey;

      return (
        <div
          key={nodeKey}
          className={`tree-row is-file ${isSelected ? 'selected' : ''}`}
          style={{
            paddingLeft,
            cursor: 'grab',
            opacity: isBeingDragged ? 0.35 : 1,
            transition: 'opacity 0.15s ease',
          }}
          draggable={true}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData(
              'text/plain',
              JSON.stringify({ name: node.name, nodeKey, isDir: false })
            );
            e.dataTransfer.effectAllowed = 'move';
            setDraggedItem({ name: node.name, nodeKey, isDir: false });
          }}
          onDragEnd={() => {
            setDraggedItem(null);
            setDragOverFolder('');
          }}
          onClick={() => onSelect?.(node.name)}
          onContextMenu={(e) => handleNodeContextMenu(e, node, nodeKey)}
          title={
            enableContextMenu
              ? `${node.name} (드래그하여 다른 폴더로 이동, 우클릭: 이름 수정/삭제)`
              : `${node.name} (드래그하여 다른 폴더로 이동)`
          }
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

  const treeData = items || [];

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
        style={{ display: 'none' }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {enableContextMenu && (
                <button
                  type="button"
                  className="tree-collapse-btn"
                  title="파일 추가"
                  aria-label="파일 추가"
                  onClick={() => {
                    setAddModal({ open: true, targetFolder: '' });
                    setNewFileName('');
                    setNewFileContent('');
                  }}
                >
                  <FilePlus size={13} />
                </button>
              )}
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
          </div>
          <div
            className="tree-body"
            onDragOver={(e) => {
              if (draggedItem) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={handleRootDrop}
            onContextMenu={(e) => {
              if (enableContextMenu && (!treeData || treeData.length === 0)) {
                e.preventDefault();
                setContextMenu({
                  visible: true,
                  x: Math.min(e.clientX, window.innerWidth - 180),
                  y: Math.min(e.clientY, window.innerHeight - 150),
                  node: { isDir: true, name: '' },
                  nodeKey: 'root',
                  isDir: true,
                });
              }
            }}
          >
            {treeData && treeData.length > 0 ? (
              renderTreeNodes(treeData)
            ) : (
              <div
                style={{
                  padding: '30px 14px',
                  textAlign: 'center',
                  color: 'var(--text-3, #64748b)',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div>프로젝트에 등록된 파일이 없습니다.</div>
                <button
                  type="button"
                  onClick={() => {
                    setAddModal({ open: true, targetFolder: '' });
                    setNewFileName('');
                    setNewFileContent('');
                  }}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    borderRadius: '6px',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 500,
                  }}
                >
                  <FilePlus size={13} />
                  <span>+ 첫 파일 추가하기</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* 마우스 우클릭 커스텀 컨텍스트 메뉴 */}
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            background: '#1a1e27',
            border: '1px solid #2e3646',
            borderRadius: '6px',
            padding: '4px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            zIndex: 9999,
            minWidth: '140px',
            fontSize: '14px',
            color: '#e2e8f0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 계층 폴더인 경우: 파일 추가 가능 */}
          {contextMenu.isDir && (
            <button
              type="button"
              onClick={() => {
                setContextMenu((prev) => ({ ...prev, visible: false }));
                setAddModal({ open: true, targetFolder: contextMenu.nodeKey });
                setNewFileName('');
                setNewFileContent('');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                borderRadius: '4px',
                textAlign: 'left',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#252c3a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <FilePlus size={14} />
              <span>파일 추가</span>
            </button>
          )}

          {/* 공통: 이름 수정 */}
          <button
            type="button"
            onClick={() => {
              const node = contextMenu.node;
              const nodeKey = contextMenu.nodeKey;
              const isDir = contextMenu.isDir;
              setContextMenu((prev) => ({ ...prev, visible: false }));
              setRenameModal({ open: true, node, nodeKey, isDir });
              setRenameValue(node?.name || '');
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              background: 'transparent',
              border: 'none',
              color: '#e2e8f0',
              cursor: 'pointer',
              borderRadius: '4px',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#252c3a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Edit2 size={13} color="#94a3b8" />
            <span>이름 수정</span>
          </button>

          {/* 공통: 삭제 (코드파일: 파일 삭제, 폴더: 폴더 삭제) */}
          <button
            type="button"
            onClick={() => {
              const node = contextMenu.node;
              const nodeKey = contextMenu.nodeKey;
              const isDir = contextMenu.isDir;
              setContextMenu((prev) => ({ ...prev, visible: false }));
              setDeleteModal({ open: true, node, nodeKey, isDir });
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              background: 'transparent',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
              borderRadius: '4px',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#382226')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Trash2 size={13} color="#f87171" />
            <span>{contextMenu.isDir ? '폴더 삭제' : '파일 삭제'}</span>
          </button>
        </div>
      )}

      {/* 1. 파일 추가 모달 (계층 폴더만 가능) */}
      {addModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(2px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setAddModal({ open: false, targetFolder: '' })}
        >
          <div
            style={{
              background: '#161920',
              border: '1px solid #2a3140',
              borderRadius: '8px',
              width: '400px',
              padding: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              color: '#e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FilePlus size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>새 파일 추가</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddModal({ open: false, targetFolder: '' })}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '12px' }}>
              대상 폴더: <span style={{ color: '#38bdf8', fontWeight: 500 }}>{addModal.targetFolder}</span>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#cbd5e1' }}>
                파일 이름 (확장자 포함)
              </label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="예: paymentService.ts"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitAddFile();
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#0f1217',
                  border: '1px solid #333d4e',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px dashed #38bdf8',
                  borderRadius: '6px',
                  color: '#38bdf8',
                  fontSize: '14px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                <Upload size={13} />
                <span>내 PC 파일 선택하여 가져오기 (선택 사항)</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setAddModal({ open: false, targetFolder: '' })}
                style={{
                  padding: '6px 14px',
                  background: 'transparent',
                  border: '1px solid #333d4e',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitAddFile}
                disabled={!newFileName.trim()}
                style={{
                  padding: '6px 16px',
                  background: newFileName.trim() ? '#0284c7' : '#1e293b',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: newFileName.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                파일 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. 이름 수정 모달 */}
      {renameModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(2px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setRenameModal({ open: false, node: null, nodeKey: '', isDir: false })}
        >
          <div
            style={{
              background: '#161920',
              border: '1px solid #2a3140',
              borderRadius: '8px',
              width: '380px',
              padding: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              color: '#e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={16} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
                  {renameModal.isDir ? '폴더 이름 수정' : '파일 이름 수정'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRenameModal({ open: false, node: null, nodeKey: '', isDir: false })}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#cbd5e1' }}>
                새 이름
              </label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename();
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#0f1217',
                  border: '1px solid #333d4e',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setRenameModal({ open: false, node: null, nodeKey: '', isDir: false })}
                style={{
                  padding: '6px 14px',
                  background: 'transparent',
                  border: '1px solid #333d4e',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitRename}
                disabled={!renameValue.trim()}
                style={{
                  padding: '6px 16px',
                  background: renameValue.trim() ? '#0284c7' : '#1e293b',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: renameValue.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                수정 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. 삭제 확인 모달 */}
      {deleteModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(2px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setDeleteModal({ open: false, node: null, nodeKey: '', isDir: false })}
        >
          <div
            style={{
              background: '#161920',
              border: '1px solid #3a2528',
              borderRadius: '8px',
              width: '380px',
              padding: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              color: '#e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <AlertTriangle size={20} color="#f87171" />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#fca5a5' }}>
                {deleteModal.isDir ? '폴더 삭제 확인' : '파일 삭제 확인'}
              </h3>
            </div>

            <p style={{ fontSize: '15px', lineHeight: '1.5', color: '#cbd5e1', margin: '0 0 16px 0' }}>
              정말 <strong style={{ color: '#ffffff' }}>'{deleteModal.node?.name}'</strong>{' '}
              {deleteModal.isDir ? '폴더를' : '파일을'} 삭제하시겠습니까?
              <br />
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                내 컴퓨터(C:\Users\user\Documents\code)의 실제 파일 시스템에서도 영구 삭제됩니다.
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteModal({ open: false, node: null, nodeKey: '', isDir: false })}
                style={{
                  padding: '6px 14px',
                  background: 'transparent',
                  border: '1px solid #333d4e',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitDelete}
                style={{
                  padding: '6px 16px',
                  background: '#dc2626',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
