/**
 * 홈 대시보드 통계 및 분석 결과 목록 REST API 모듈
 * 실제 Spring Boot 백엔드(/api/v1/analyses) 연동
 */
import apiClient from './client.js';
import { analysisApi } from './analysisApi.js';
import { findingApi } from './findingApi.js';
import { scopedKey, isAnalysisVisibleToCurrentAccount } from '../utils/accountScope.js';

const STORAGE_RESOLVED_ANALYSIS_IDS = 'codeguard_resolved_analysis_ids';

// 유형별 집계 조회 시 최대 몇 개의 분석까지 상세 조회할지 (요청 폭주 방지)
const MAX_TYPE_LOOKUPS = 30;
const typeCountCache = new Map();

const getStorageArray = (key) => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getResolvedAnalysisIds = () => {
  return getStorageArray(scopedKey(STORAGE_RESOLVED_ANALYSIS_IDS));
};

const normalizeList = (response) =>
  Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : response?.content || response?.data?.content || [];

// 백엔드 응답 필드명 차이(totalCount/totalFindings, criticalCount/severityCount.CRITICAL) 흡수
const getTotalCount = (item) => Number(item.totalCount ?? item.totalFindings ?? 0);
const getSeverityCount = (item, level) =>
  Number(item[`${level.toLowerCase()}Count`] ?? item.severityCount?.[level] ?? 0);

const addTypeCount = (map, type, count = 1) => {
  if (!type) return;
  map[type] = (map[type] || 0) + count;
};

/** 목록 응답에 이미 유형 정보가 있으면 바로 집계, 없으면 null */
const readTypeCountsFromItem = (item) => {
  const map = {};
  if (Array.isArray(item.typeCount) && item.typeCount.length > 0) {
    item.typeCount.forEach((t) => addTypeCount(map, t.type, Number(t.count || 0)));
    return map;
  }
  if (Array.isArray(item.vulnerabilities) && item.vulnerabilities.length > 0) {
    item.vulnerabilities.forEach((v) => addTypeCount(map, v.type || v.vulnerabilityType));
    return map;
  }
  return null;
};

/** 분석 상세(typeCount) → 취약점 목록 순으로 조회해 유형별 건수 계산 (분석ID별 캐시) */
const fetchTypeCounts = async (analysisId) => {
  const key = String(analysisId);
  if (typeCountCache.has(key)) return typeCountCache.get(key);

  let map = null;
  try {
    const detail = await analysisApi.getAnalysisDetail(analysisId);
    if (Array.isArray(detail?.typeCount) && detail.typeCount.length > 0) {
      map = {};
      detail.typeCount.forEach((t) => addTypeCount(map, t.type, Number(t.count || 0)));
    }
  } catch {
    // 상세 조회 실패 시 취약점 목록으로 대체
  }
  if (!map) {
    try {
      const findings = await findingApi.getFindings(analysisId);
      if (Array.isArray(findings) && findings.length > 0) {
        map = {};
        findings.forEach((f) => addTypeCount(map, f.vulnerabilityType || f.type));
      }
    } catch {
      // 유형 정보를 얻지 못하면 집계에서 제외
    }
  }
  if (map) typeCountCache.set(key, map);
  return map;
};

/**
 * 특정 분석의 해결 완료 여부 판별 (취약점 수정으로 0개가 되었는지 검사)
 */
const isAnalysisFullyResolved = (item, resolvedAnalysisIds) => {
  const aId = Number(item.analysisId || item.id);
  const totalCount = getTotalCount(item);

  // 1) 기본 검출 취약점이 0개이면 무조건 제외
  if (totalCount <= 0) return true;

  // 2) 명시적으로 해결 완료 등록된 분석이면 제외 (타입 안전)
  const resolvedIds = (resolvedAnalysisIds || []).map(Number);
  if (resolvedIds.includes(aId)) return true;

  // 3) localStorage에 저장된 해결 취약점 ID들의 집합(Set) 집계
  const resolvedFindingIdsSet = new Set();
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (
        k &&
        k.startsWith('codeguard_resolved_finding_ids_') &&
        (k.endsWith(`_${aId}`) || k.includes(`_${aId}_`))
      ) {
        const arr = getStorageArray(k);
        if (Array.isArray(arr)) {
          arr.forEach((id) => resolvedFindingIdsSet.add(String(id)));
        }
      }
    }
  }

  // 백엔드 vulnerabilities 목록의 모든 취약점이 해결되었는지 검사
  if (Array.isArray(item.vulnerabilities) && item.vulnerabilities.length > 0) {
    const isEveryVulnResolved = item.vulnerabilities.every((v) =>
      resolvedFindingIdsSet.has(String(v.id || v.findingId))
    );
    if (isEveryVulnResolved) return true;
  }

  // 남은 취약점 수(총 취약점 - 해결된 취약점 수)가 0개 이하면 해결된 것으로 판별
  if (totalCount - resolvedFindingIdsSet.size <= 0) {
    return true;
  }

  return false;
};

export const dashboardApi = {
  /**
   * 대시보드 통계 요약 조회
   */
  getDashboardSummary: async () => {
    const response = await apiClient.get('/analyses');
    // 현재 로그인 계정의 분석만 집계
    const rawList = normalizeList(response).filter(isAnalysisVisibleToCurrentAccount);

    const resolvedAnalysisIds = getResolvedAnalysisIds();

    let totalFindings = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    const vulnTypeMap = {
      SQL_INJECTION: 0,
      HARDCODED_SECRET: 0,
      XSS: 0,
    };

    // 취약점이 0개이거나 수정/해결된 분석은 대시보드 활성 목록에서도 제외
    const activeList = rawList.filter(
      (item) => !isAnalysisFullyResolved(item, resolvedAnalysisIds)
    );

    const needTypeLookup = [];
    activeList.forEach((item) => {
      totalFindings += getTotalCount(item);
      criticalCount += getSeverityCount(item, 'CRITICAL');
      highCount += getSeverityCount(item, 'HIGH');
      mediumCount += getSeverityCount(item, 'MEDIUM');
      lowCount += getSeverityCount(item, 'LOW');

      const typeMap = readTypeCountsFromItem(item);
      if (typeMap) {
        Object.entries(typeMap).forEach(([t, c]) => addTypeCount(vulnTypeMap, t, c));
      } else {
        needTypeLookup.push(item.analysisId || item.id);
      }
    });

    // 목록 응답에 유형 정보가 없는 분석은 상세/취약점 API로 실제 값을 조회
    const lookups = await Promise.all(
      needTypeLookup.slice(0, MAX_TYPE_LOOKUPS).map((id) => fetchTypeCounts(id))
    );
    lookups.forEach((typeMap) => {
      if (typeMap) Object.entries(typeMap).forEach(([t, c]) => addTypeCount(vulnTypeMap, t, c));
    });

    const recentProjects = activeList.slice(0, 5).map((item) => ({
      id: item.analysisId || item.id,
      name: item.title || `분석 #${item.analysisId}`,
      meta: `${item.language || 'Code'} · ${getTotalCount(item)}개 취약점 탐지`,
      risk:
        getSeverityCount(item, 'CRITICAL') > 0
          ? '치명적'
          : getSeverityCount(item, 'HIGH') > 0
            ? '높음'
            : getSeverityCount(item, 'MEDIUM') > 0
              ? '보통'
              : '안전',
      tone:
        getSeverityCount(item, 'CRITICAL') > 0
          ? 'danger'
          : getSeverityCount(item, 'HIGH') > 0
            ? 'warn'
            : getSeverityCount(item, 'MEDIUM') > 0
              ? 'moderate'
              : 'clean',
      updatedAt: item.createdAt ? String(item.createdAt).substring(0, 10) : '최근',
    }));

    return {
      totalAnalyses: activeList.length,
      totalFindings,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      vulnTypeMap,
      recentProjects,
      rawList,
    };
  },

  /**
   * 분석 결과 목록 조회 (AnalysisListPage)
   * 취약점 수정으로 0개가 되었거나, 원래 취약점이 0개인 분석은 목록에서 완전히 제거
   * @param {Object} params - { project, severity, search, sortBy }
   */
  getAnalyses: async (params = {}) => {
    const response = await apiClient.get('/analyses', { params });
    const rawList = normalizeList(response).filter(isAnalysisVisibleToCurrentAccount);

    const resolvedAnalysisIds = getResolvedAnalysisIds();

    // 0개의 취약점인 분석 및 해결 완료된 분석을 목록에서 완전 제거
    const filteredRaw = rawList.filter(
      (item) => !isAnalysisFullyResolved(item, resolvedAnalysisIds)
    );

    // 백엔드 AnalysisDTO.Response 형식을 AnalysisListPage UI 구조로 정규화
    let list = filteredRaw.map((item) => ({
      id: item.analysisId || item.id,
      analysisId: item.analysisId || item.id,
      project: item.title || `분석 #${item.analysisId}`,
      title: item.title || `분석 #${item.analysisId}`,
      vulnerability:
        (item.totalCount ?? item.totalFindings) !== undefined
          ? `${getTotalCount(item)}개 취약점 탐지 (${item.status || '완료'})`
          : '취약점 분석 완료',
      totalCount: getTotalCount(item),
      severity:
        getSeverityCount(item, 'CRITICAL') > 0
          ? 'CRITICAL'
          : getSeverityCount(item, 'HIGH') > 0
            ? 'HIGH'
            : getSeverityCount(item, 'MEDIUM') > 0
              ? 'MEDIUM'
              : getSeverityCount(item, 'LOW') > 0
                ? 'LOW'
                : 'LOW',
      date: item.createdAt
        ? String(item.createdAt).substring(0, 10)
        : new Date().toISOString().substring(0, 10),
      raw: item,
    }));

    // 프론트엔드 필터링 적용
    if (params.project) {
      const p = params.project.toLowerCase();
      list = list.filter((item) => item.project.toLowerCase().includes(p));
    }
    if (params.severity && params.severity !== 'ALL') {
      list = list.filter((item) => item.severity === params.severity);
    }
    if (params.search) {
      const query = params.search.toLowerCase();
      list = list.filter(
        (item) =>
          item.project.toLowerCase().includes(query) ||
          item.vulnerability.toLowerCase().includes(query)
      );
    }
    if (params.sortBy === 'severity') {
      const order = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
      list.sort((a, b) => (order[a.severity] || 99) - (order[b.severity] || 99));
    } else {
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return { success: true, data: list };
  },

  /**
   * 분석 결과 단건 삭제
   * @param {string|number} id
   */
  deleteAnalysis: async (id) => {
    try {
      const response = await apiClient.delete(`/analyses/${id}`);
      return { success: true, data: response, id };
    } catch {
      // 로컬 해결 목록에도 등록하여 확실히 제거
      const current = getResolvedAnalysisIds();
      window.localStorage?.setItem(
        scopedKey(STORAGE_RESOLVED_ANALYSIS_IDS),
        JSON.stringify([...new Set([...current, Number(id)])])
      );
      return { success: true, id };
    }
  },
};

export default dashboardApi;
