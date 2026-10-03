/**
 * 로컬 디스크 파일 실시간 계층 구조 동기화 서비스
 * Vite 개발 서버의 /api/local-code 미들웨어와 통신
 * 다른 컴퓨터나 사용자 지정 경로로 변경 가능한 동적 베이스 디렉토리 지원
 */

const LOCAL_CODE_API_BASE = '/api/local-code';
export const STORAGE_KEY_BASE_DIR = 'codeguard_local_code_base_dir';
export const DEFAULT_LOCAL_CODE_BASE_DIR = 'C:\\Users\\user\\Documents\\code';

/**
 * 현재 브라우저에 저장된 로컬 코드 베이스 디렉토리 반환
 * @returns {string}
 */
export function getLocalCodeBaseDir() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_LOCAL_CODE_BASE_DIR;
  }
  return window.localStorage.getItem(STORAGE_KEY_BASE_DIR) || DEFAULT_LOCAL_CODE_BASE_DIR;
}

/**
 * API 요청 공통 헤더 (사용자 지정 baseDir 포함)
 */
function getSyncHeaders() {
  const currentDir = getLocalCodeBaseDir();
  return {
    'Content-Type': 'application/json',
    'x-local-code-dir': currentDir,
  };
}

/**
 * 로컬 동기화 기본 디렉토리 설정 조회
 */
export async function getLocalCodeConfig() {
  try {
    const res = await fetch(`${LOCAL_CODE_API_BASE}/config`, {
      headers: getSyncHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

/**
 * 로컬 동기화 기본 디렉토리 변경 및 저장
 * @param {string} newBaseDir - 새로운 로컬 소스코드 디렉토리 (예: D:\projects\code)
 */
export async function saveLocalCodeBaseDir(newBaseDir) {
  const trimmed = (newBaseDir || '').trim();
  if (!trimmed) return false;

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY_BASE_DIR, trimmed);
  }

  try {
    const res = await fetch(`${LOCAL_CODE_API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseDir: trimmed }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch (e) {
    console.warn('[LocalSync] 기본 경로 서버 저장 실패:', e.message);
    return true; // 로컬스토리지에는 저장되었으므로 true 유지
  }
}

/**
 * 로컬 동기화 API 상태 및 파일 목록 확인
 */
export async function checkLocalCodeStatus() {
  try {
    const res = await fetch(`${LOCAL_CODE_API_BASE}/status`, {
      headers: getSyncHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

/**
 * 로컬 소스코드 파일 내용 읽기
 * @param {string} projectId - 프로젝트명 (예: payments-api)
 * @param {string} fileName - 파일명 (예: users.ts)
 * @param {string} relativePath - 프로젝트 내 상대경로 (예: src/routes/users.ts)
 * @returns {Promise<{ lines: string[], filePath?: string } | null>}
 */
export async function readFromLocalCode(projectId, fileName, relativePath = '') {
  if (!fileName) return null;
  try {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (fileName) params.set('fileName', fileName);
    if (relativePath) params.set('relativePath', relativePath);
    params.set('baseDir', getLocalCodeBaseDir());

    const res = await fetch(`${LOCAL_CODE_API_BASE}/read?${params.toString()}`, {
      headers: getSyncHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success && Array.isArray(data.lines)
      ? { lines: data.lines, filePath: data.filePath }
      : null;
  } catch (e) {
    console.warn(`[LocalSync] 로컬 파일(${fileName}) 읽기 실패:`, e.message);
    return null;
  }
}

/**
 * 로컬 소스코드 파일에 코드 쓰기 (실시간 반영)
 * @param {string} projectId 
 * @param {string} fileName 
 * @param {string} relativePath 
 * @param {string[] | string} content 
 */
export async function writeToLocalCode(projectId, fileName, relativePath = '', content = '') {
  if (!fileName || content === undefined || content === null) return false;
  try {
    const res = await fetch(`${LOCAL_CODE_API_BASE}/write`, {
      method: 'POST',
      headers: getSyncHeaders(),
      body: JSON.stringify({
        projectId,
        fileName,
        relativePath,
        baseDir: getLocalCodeBaseDir(),
        content: Array.isArray(content) ? content.join('\n') : String(content),
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch (e) {
    console.warn(`[LocalSync] 로컬 파일(${fileName}) 저장 실패:`, e.message);
    return false;
  }
}

/**
 * 여러 파일의 코드를 프로젝트 계층 구조에 일괄 저장
 * @param {string} projectId 
 * @param {Object} fileCodesMap - { 'users.ts': [...], 'payments.ts': [...] }
 * @param {Object} filePathsMap - { 'users.ts': 'src/routes/users.ts', ... }
 */
export async function batchWriteToLocalCode(projectId, fileCodesMap, filePathsMap = {}) {
  if (!fileCodesMap || typeof fileCodesMap !== 'object') return;
  const promises = Object.keys(fileCodesMap).map((fileName) => {
    const relativePath = filePathsMap[fileName] || fileName;
    return writeToLocalCode(projectId, fileName, relativePath, fileCodesMap[fileName]);
  });
  await Promise.allSettled(promises);
}

/**
 * 로컬 소스코드 파일 또는 폴더 삭제
 * @param {string} projectId 
 * @param {string} fileName 
 * @param {string} relativePath 
 * @returns {Promise<boolean>}
 */
export async function deleteLocalCode(projectId, fileName, relativePath = '') {
  if (!fileName && !relativePath) return false;
  try {
    const res = await fetch(`${LOCAL_CODE_API_BASE}/delete`, {
      method: 'POST',
      headers: getSyncHeaders(),
      body: JSON.stringify({
        projectId,
        fileName,
        relativePath,
        baseDir: getLocalCodeBaseDir(),
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch (e) {
    console.warn(`[LocalSync] 로컬 파일(${fileName || relativePath}) 삭제 실패:`, e.message);
    return false;
  }
}

/**
 * 로컬 소스코드 파일 또는 폴더 이름 변경 / 이동
 * @param {string} projectId 
 * @param {string} oldPath 
 * @param {string} newPath 
 * @param {string} oldName 
 * @param {string} newName 
 * @returns {Promise<boolean>}
 */
export async function renameLocalCode(projectId, oldPath, newPath, oldName = '', newName = '') {
  if (!oldPath && !oldName) return false;
  try {
    const res = await fetch(`${LOCAL_CODE_API_BASE}/rename`, {
      method: 'POST',
      headers: getSyncHeaders(),
      body: JSON.stringify({
        projectId,
        oldPath,
        newPath,
        oldName,
        newName,
        baseDir: getLocalCodeBaseDir(),
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch (e) {
    console.warn(`[LocalSync] 로컬 파일(${oldName || oldPath}) 이름 변경 실패:`, e.message);
    return false;
  }
}
