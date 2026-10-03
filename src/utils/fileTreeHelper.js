/**
 * 파일 트리 계층 구조 조작 및 동기화 유틸리티
 */

/**
 * 파일 트리 노드 계층 삽입 헬퍼 함수
 * @param {Array} treeNodes - 기존 트리 노드 배열
 * @param {string} relativePath - 파일의 상대 경로 (예: "src/routes/new_controller.ts" 또는 "test.ts")
 * @param {Object} newNode - 삽입할 파일 노드 { name, isDir: false, ext, hasFinding: false }
 * @returns {Array} 새로운 트리 노드 배열
 */
export function insertNodeIntoTreeHierarchy(treeNodes, relativePath, newNode) {
  if (!treeNodes || !Array.isArray(treeNodes)) {
    return [newNode];
  }

  // 경로 정규화 (역슬래시 -> 슬래시, 빈 세그먼트 제거)
  const normalizedPath = (relativePath || newNode.name || '').replace(/\\/g, '/');
  const parts = normalizedPath.split('/').filter(Boolean);

  if (parts.length <= 1) {
    // 루트 레벨 파일
    const fileName = parts[0] || newNode.name;
    const finalNode = { ...newNode, name: fileName };
    const existingIdx = treeNodes.findIndex((n) => !n.isDir && n.name === fileName);
    if (existingIdx >= 0) {
      const copy = [...treeNodes];
      copy[existingIdx] = { ...copy[existingIdx], ...finalNode };
      return copy;
    }
    return [...treeNodes, finalNode];
  }

  const dirNames = parts.slice(0, -1);
  const fileName = parts[parts.length - 1];
  const finalNode = { ...newNode, name: fileName };

  function insertIntoDirList(nodes, currentDirIndex) {
    const targetDirName = dirNames[currentDirIndex];
    const isLastDir = currentDirIndex === dirNames.length - 1;

    let dirNode = nodes.find((n) => n.isDir && n.name === targetDirName);
    let newNodes = [...nodes];

    if (!dirNode) {
      dirNode = { name: targetDirName, isDir: true, children: [], isOpen: true };
      newNodes.push(dirNode);
    }

    if (isLastDir) {
      const children = dirNode.children ? [...dirNode.children] : [];
      const fileIdx = children.findIndex((n) => !n.isDir && n.name === fileName);
      if (fileIdx >= 0) {
        children[fileIdx] = { ...children[fileIdx], ...finalNode };
      } else {
        children.push(finalNode);
      }
      return newNodes.map((n) =>
        n === dirNode || (n.isDir && n.name === targetDirName)
          ? { ...n, children, isOpen: true }
          : n
      );
    } else {
      const updatedChildren = insertIntoDirList(dirNode.children || [], currentDirIndex + 1);
      return newNodes.map((n) =>
        n === dirNode || (n.isDir && n.name === targetDirName)
          ? { ...n, children: updatedChildren, isOpen: true }
          : n
      );
    }
  }

  return insertIntoDirList(treeNodes, 0);
}

/**
 * 파일 트리에서 노드(파일 또는 폴더) 삭제 헬퍼 함수
 * @param {Array} treeNodes - 기존 트리 노드 배열
 * @param {string} targetName - 삭제할 파일/폴더 이름
 * @param {string} [targetRelPath] - 삭제할 파일/폴더 상대 경로
 * @returns {Array} 갱신된 새로운 트리 노드 배열
 */
export function removeNodeFromTreeHierarchy(treeNodes, targetName, targetRelPath = '') {
  if (!treeNodes || !Array.isArray(treeNodes)) return [];

  return treeNodes
    .filter((node) => {
      if (node.name === targetName) {
        return false;
      }
      return true;
    })
    .map((node) => {
      if (node.isDir && Array.isArray(node.children)) {
        return {
          ...node,
          children: removeNodeFromTreeHierarchy(node.children, targetName, targetRelPath),
        };
      }
      return node;
    });
}

/**
 * 파일 트리에서 노드(파일 또는 폴더) 이름 변경 헬퍼 함수
 * @param {Array} treeNodes - 기존 트리 노드 배열
 * @param {string} oldName - 기존 이름
 * @param {string} newName - 새 이름
 * @returns {Array} 갱신된 새로운 트리 노드 배열
 */
export function renameNodeInTreeHierarchy(treeNodes, oldName, newName) {
  if (!treeNodes || !Array.isArray(treeNodes)) return [];

  return treeNodes.map((node) => {
    if (node.name === oldName) {
      const ext = !node.isDir ? (newName.split('.').pop()?.toUpperCase() || 'FILE') : undefined;
      return {
        ...node,
        name: newName,
        ...(ext ? { ext } : {}),
      };
    }
    if (node.isDir && Array.isArray(node.children)) {
      return {
        ...node,
        children: renameNodeInTreeHierarchy(node.children, oldName, newName),
      };
    }
    return node;
  });
}

/**
 * 파일 트리에서 노드 찾기 헬퍼 함수
 * @param {Array} nodes 
 * @param {string} name 
 * @returns {Object|null}
 */
export function findNodeInTree(nodes, name) {
  if (!nodes || !Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (node.name === name) return node;
    if (node.isDir && node.children) {
      const found = findNodeInTree(node.children, name);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 파일 트리에서 노드(파일/폴더)를 다른 계층 폴더로 이동시키는 헬퍼 함수
 * @param {Array} treeNodes - 기존 트리 노드 배열
 * @param {string} sourceName - 이동할 파일/폴더 이름
 * @param {string} sourceRelPath - 이동할 파일/폴더 이전 상대 경로
 * @param {string} targetFolder - 이동할 대상 폴더 경로 (빈 문자열이면 루트)
 * @returns {Array} 갱신된 새로운 트리 노드 배열
 */
export function moveNodeInTreeHierarchy(treeNodes, sourceName, sourceRelPath, targetFolder) {
  if (!treeNodes || !Array.isArray(treeNodes)) return [];

  const existingNode = findNodeInTree(treeNodes, sourceName) || {
    name: sourceName,
    isDir: false,
    ext: sourceName.split('.').pop()?.toUpperCase() || 'FILE',
  };

  // 1) 이전 위치에서 제거
  const treeWithoutSource = removeNodeFromTreeHierarchy(treeNodes, sourceName, sourceRelPath);

  // 2) 대상 폴더 경로로 삽입
  const newRelPath = targetFolder ? `${targetFolder}/${sourceName}` : sourceName;
  return insertNodeIntoTreeHierarchy(treeWithoutSource, newRelPath, existingNode);
}


