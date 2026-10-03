/**
 * 계정별 데이터 분리 유틸
 * 로그인한 사용자(codeguard_current_user)의 id를 localStorage 키 접미사로 붙여
 * 프로젝트/즐겨찾기/분석 소유 정보가 계정끼리 섞이지 않도록 한다.
 */

const CURRENT_USER_KEY = 'codeguard_current_user';
const GUEST_SCOPE = 'guest';

export const ANALYSIS_OWNERS_KEY = 'codeguard_analysis_owners';

/** 현재 로그인 계정 식별자 (미로그인이면 'guest') */
export function getAccountId() {
  try {
    const raw = window.localStorage.getItem(CURRENT_USER_KEY);
    const user = raw ? JSON.parse(raw) : null;
    const id = user?.id ?? user?.email;
    return id !== undefined && id !== null && id !== '' ? String(id) : GUEST_SCOPE;
  } catch {
    return GUEST_SCOPE;
  }
}

/** 계정별로 분리된 localStorage 키 */
export function scopedKey(baseKey) {
  return `${baseKey}::${getAccountId()}`;
}

const readOwners = () => {
  try {
    const raw = window.localStorage.getItem(ANALYSIS_OWNERS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

/** 분석 생성 시 소유 계정 기록 (백엔드가 소유자 정보를 내려주지 않는 경우 대비) */
export function registerAnalysisOwner(analysisId) {
  if (analysisId === undefined || analysisId === null) return;
  try {
    const owners = readOwners();
    owners[String(analysisId)] = getAccountId();
    window.localStorage.setItem(ANALYSIS_OWNERS_KEY, JSON.stringify(owners));
  } catch (e) {
    console.warn('Failed to register analysis owner', e);
  }
}

/**
 * 현재 계정이 볼 수 있는 분석인지 판별
 * - 백엔드가 userId/ownerId를 내려주면 그 값을 우선 사용
 * - 프론트에서 소유자가 기록된 분석은 소유 계정에게만 노출
 * - 소유자 기록이 없는(이전에 생성된) 분석은 기존 동작 유지를 위해 노출
 */
export function isAnalysisVisibleToCurrentAccount(item) {
  const me = getAccountId();
  const backendOwner = item?.userId ?? item?.ownerId ?? item?.user?.id;
  if (backendOwner !== undefined && backendOwner !== null && me !== GUEST_SCOPE) {
    return String(backendOwner) === me;
  }
  const owner = readOwners()[String(item?.analysisId ?? item?.id)];
  return !owner || owner === me;
}
