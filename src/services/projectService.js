import { PROJECTS_DATA } from '../data/findingData';
import { getLocalCodeBaseDir, writeToLocalCode } from './localCodeSyncService';
import { scopedKey } from '../utils/accountScope';

export const CUSTOM_PROJECTS_KEY = 'codeguard_custom_projects';
export const PROJECT_TREE_STORAGE_PREFIX = 'codeguard_tree_';
export const DELETED_PROJECTS_KEY = 'codeguard_deleted_projects';
export const RENAMED_PROJECTS_KEY = 'codeguard_renamed_projects';
export const FAVORITE_PROJECTS_KEY = 'codeguard_favorite_projects';

export const BASE_PROJECTS = [
  { id: 'payments-api', name: 'payments-api', description: '결제 트랜잭션 및 금융 API 서비스' },
  { id: 'auth-service', name: 'auth-service', description: '인증 및 세션 관리 마이크로서비스' },
  { id: 'admin-console', name: 'admin-console', description: '관리자 운영 콘솔 대시보드' },
];

/**
 * 삭제된 프로젝트 ID 목록 가져오기
 */
export function getDeletedProjectIds() {
  try {
    const saved = localStorage.getItem(scopedKey(DELETED_PROJECTS_KEY));
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

/**
 * 이름 변경된 프로젝트 맵 가져오기 ({ oldId: { id, name } })
 */
export function getRenamedProjectsMap() {
  try {
    const saved = localStorage.getItem(scopedKey(RENAMED_PROJECTS_KEY));
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
}

/**
 * 저장된 모든 커스텀 프로젝트 목록 가져오기
 */
export function getCustomProjects() {
  try {
    const saved = localStorage.getItem(scopedKey(CUSTOM_PROJECTS_KEY));
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to parse custom projects from localStorage', e);
  }
  return [];
}

/**
 * 기본 프로젝트 + 커스텀 프로젝트 전체 목록 가져오기 (삭제된 프로젝트 제외 및 이름 변경 반영)
 */
export function getAllProjects() {
  const deletedIds = getDeletedProjectIds();
  const renamedMap = getRenamedProjectsMap();
  const custom = getCustomProjects();

  const combined = [];

  // 기본 프로젝트 추가 (삭제되지 않은 것만)
  BASE_PROJECTS.forEach((bp) => {
    if (!deletedIds.includes(bp.id)) {
      if (renamedMap[bp.id]) {
        combined.push({
          ...bp,
          id: renamedMap[bp.id].id,
          name: renamedMap[bp.id].name,
          originalId: bp.id,
        });
      } else {
        combined.push({ ...bp });
      }
    }
  });

  // 커스텀 프로젝트 추가 (삭제되지 않은 것만)
  custom.forEach((cp) => {
    if (!deletedIds.includes(cp.id) && !combined.some((p) => p.id === cp.id)) {
      combined.push(cp);
    }
  });

  return combined;
}

/**
 * 특정 프로젝트의 커스텀 트리 데이터 저장
 */
export function saveCustomProjectTree(projectId, treeData) {
  try {
    localStorage.setItem(scopedKey(`${PROJECT_TREE_STORAGE_PREFIX}${projectId}`),
      JSON.stringify(treeData)
    );
  } catch (e) {
    console.warn('Failed to save project tree', e);
  }
}

/**
 * 특정 프로젝트의 커스텀 트리 데이터 가져오기
 */
export function getCustomProjectTree(projectId) {
  try {
    const saved = localStorage.getItem(scopedKey(`${PROJECT_TREE_STORAGE_PREFIX}${projectId}`));
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to get project tree', e);
  }
  return null;
}

/**
 * 새 빈 프로젝트 생성
 * @param {object} params
 * @param {string} params.name - 프로젝트 이름
 * @param {string} params.description - 프로젝트 설명
 * @param {boolean} params.createSrcFolder - src 폴더 자동 생성 여부
 */
export async function createNewEmptyProject({ name, description = '', createSrcFolder = true }) {
  const cleanId = String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');

  if (!cleanId) {
    throw new Error('올바른 프로젝트 이름을 입력해주세요.');
  }

  const existing = getAllProjects();
  if (existing.some((p) => p.id === cleanId)) {
    throw new Error(`이미 존재하는 프로젝트 이름입니다: '${cleanId}'`);
  }

  const newProject = {
    id: cleanId,
    name: cleanId,
    description: description.trim() || '사용자 생성 빈 프로젝트',
    createdAt: new Date().toISOString(),
    isCustom: true,
  };

  // 빈 프로젝트 트리 구성
  const initialTree = createSrcFolder
    ? [
        {
          name: 'src',
          isDir: true,
          isOpen: true,
          children: [],
        },
      ]
    : [];

  // 1. PROJECTS_DATA 런타임 캐시에 등록
  PROJECTS_DATA[cleanId] = {
    id: cleanId,
    name: cleanId,
    defaultFile: null,
    filePaths: {},
    treeData: initialTree,
    fileFindingData: {},
  };

  // 2. localStorage에 커스텀 프로젝트 목록 및 트리 저장
  const customList = getCustomProjects();
  customList.push(newProject);
  localStorage.setItem(scopedKey(CUSTOM_PROJECTS_KEY), JSON.stringify(customList));
  saveCustomProjectTree(cleanId, initialTree);

  // 3. 로컬 파일 시스템에 프로젝트 기본 폴더/파일 생성 (Vite 미들웨어 연동)
  try {
    if (createSrcFolder) {
      await writeToLocalCode(
        cleanId,
        'src/README.md',
        `# ${cleanId}\n\n새로운 빈 프로젝트가 생성되었습니다.\n이곳에 소스코드 파일을 추가해 분석을 시작하세요.\n`
      );
    } else {
      await writeToLocalCode(
        cleanId,
        'README.md',
        `# ${cleanId}\n\n새로운 빈 프로젝트가 생성되었습니다.\n`
      );
    }
  } catch (e) {
    console.warn('로컬 파일 생성 시도 중 경고 (서버 미구동 또는 권한):', e);
  }

  // 4. 전역 변경 알림 이벤트 발행
  window.dispatchEvent(new Event('codeguard_projects_changed'));

  return newProject;
}

// 현재 계정의 커스텀 프로젝트로 PROJECTS_DATA에 등록해 둔 ID들
const registeredCustomIds = new Set();

/**
 * 커스텀 프로젝트를 PROJECTS_DATA 메모리에 초기 등록 (앱 시작 시 호출)
 */
export function initCustomProjectsInMemory() {
  const custom = getCustomProjects();
  const customIds = new Set(custom.map((p) => p.id));

  // 이전에 로그인했던 계정의 커스텀 프로젝트가 메모리에 남지 않도록 정리
  registeredCustomIds.forEach((id) => {
    if (!customIds.has(id)) delete PROJECTS_DATA[id];
  });
  registeredCustomIds.clear();

  custom.forEach((p) => {
    registeredCustomIds.add(p.id);
    if (!PROJECTS_DATA[p.id]) {
      const savedTree = getCustomProjectTree(p.id) || [];
      PROJECTS_DATA[p.id] = {
        id: p.id,
        name: p.name,
        defaultFile: null,
        filePaths: {},
        treeData: savedTree,
        fileFindingData: {},
      };
    }
  });
}

/**
 * 프로젝트 이름 수정
 * @param {string} oldProjectId - 기존 프로젝트 ID
 * @param {string} newName - 새 프로젝트 이름
 */
export async function renameProject(oldProjectId, newName) {
  const cleanNewId = String(newName)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');

  if (!cleanNewId) {
    throw new Error('올바른 프로젝트 이름을 입력해주세요.');
  }

  const allList = getAllProjects();
  if (cleanNewId !== oldProjectId && allList.some((p) => p.id === cleanNewId)) {
    throw new Error(`이미 존재하는 프로젝트 이름입니다: '${cleanNewId}'`);
  }

  // 1. 커스텀 프로젝트 목록 갱신
  const customList = getCustomProjects();
  const customIdx = customList.findIndex((p) => p.id === oldProjectId);
  if (customIdx >= 0) {
    customList[customIdx].id = cleanNewId;
    customList[customIdx].name = cleanNewId;
    localStorage.setItem(scopedKey(CUSTOM_PROJECTS_KEY), JSON.stringify(customList));
  } else {
    // 기본 프로젝트 이름 변경 기록
    const renamedMap = getRenamedProjectsMap();
    renamedMap[oldProjectId] = { id: cleanNewId, name: cleanNewId };
    localStorage.setItem(scopedKey(RENAMED_PROJECTS_KEY), JSON.stringify(renamedMap));
  }

  // 2. 트리 데이터 스토리지 마이그레이션
  const oldTree =
    getCustomProjectTree(oldProjectId) ||
    PROJECTS_DATA[oldProjectId]?.treeData ||
    [];
  saveCustomProjectTree(cleanNewId, oldTree);
  if (cleanNewId !== oldProjectId) {
    localStorage.removeItem(scopedKey(`${PROJECT_TREE_STORAGE_PREFIX}${oldProjectId}`));
  }

  // 3. PROJECTS_DATA 메모리 캐시 갱신
  if (PROJECTS_DATA[oldProjectId]) {
    PROJECTS_DATA[cleanNewId] = {
      ...PROJECTS_DATA[oldProjectId],
      id: cleanNewId,
      name: cleanNewId,
    };
    if (cleanNewId !== oldProjectId) {
      delete PROJECTS_DATA[oldProjectId];
    }
  } else {
    PROJECTS_DATA[cleanNewId] = {
      id: cleanNewId,
      name: cleanNewId,
      defaultFile: null,
      filePaths: {},
      treeData: oldTree,
      fileFindingData: {},
    };
  }

  // 4. 즐겨찾기 목록 동기화
  try {
    const favSaved = localStorage.getItem(scopedKey(FAVORITE_PROJECTS_KEY));
    if (favSaved) {
      const favs = JSON.parse(favSaved);
      if (favs.includes(oldProjectId)) {
        const nextFavs = favs.map((id) => (id === oldProjectId ? cleanNewId : id));
        localStorage.setItem(scopedKey(FAVORITE_PROJECTS_KEY), JSON.stringify(nextFavs));
        window.dispatchEvent(new Event('codeguard_favorites_changed'));
      }
    }
  } catch (e) {
    console.warn(e);
  }

  // 5. 전역 이벤트 발행
  window.dispatchEvent(new Event('codeguard_projects_changed'));

  return { oldId: oldProjectId, newId: cleanNewId, name: cleanNewId };
}

/**
 * 프로젝트 삭제
 * @param {string} projectId - 삭제할 프로젝트 ID
 */
export async function deleteProject(projectId) {
  if (!projectId) return;

  // 1. 커스텀 프로젝트 목록에서 제거
  const customList = getCustomProjects();
  const nextCustom = customList.filter((p) => p.id !== projectId);
  localStorage.setItem(scopedKey(CUSTOM_PROJECTS_KEY), JSON.stringify(nextCustom));

  // 2. 삭제 목록에 추가 (기본 프로젝트도 삭제/숨김 지원)
  const deletedIds = getDeletedProjectIds();
  if (!deletedIds.includes(projectId)) {
    deletedIds.push(projectId);
    localStorage.setItem(scopedKey(DELETED_PROJECTS_KEY), JSON.stringify(deletedIds));
  }

  // 3. 트리 및 캐시 정리
  localStorage.removeItem(scopedKey(`${PROJECT_TREE_STORAGE_PREFIX}${projectId}`));
  delete PROJECTS_DATA[projectId];

  // 4. 즐겨찾기 목록에서 제거
  try {
    const favSaved = localStorage.getItem(scopedKey(FAVORITE_PROJECTS_KEY));
    if (favSaved) {
      const favs = JSON.parse(favSaved);
      const nextFavs = favs.filter((id) => id !== projectId);
      localStorage.setItem(scopedKey(FAVORITE_PROJECTS_KEY), JSON.stringify(nextFavs));
      window.dispatchEvent(new Event('codeguard_favorites_changed'));
    }
  } catch (e) {
    console.warn(e);
  }

  // 5. 전역 이벤트 발행
  window.dispatchEvent(new Event('codeguard_projects_changed'));

  return { success: true, deletedId: projectId };
}
