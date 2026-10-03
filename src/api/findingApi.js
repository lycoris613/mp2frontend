/**
 * 취약점 관련 REST API 호출 모듈 (실제 Spring Boot 연동)
 */
import apiClient from './client.js';

const unwrap = (res) => (res && res.data !== undefined ? res.data : res);

export const normalizeFindingDetail = (detail) => {
  if (!detail) return null;
  // 이미 프론트엔드 UI 호환 형태인 경우
  if (detail.detectionSource && detail.description && detail.tagLabel) return detail;

  const findingId = detail.findingId || detail.id;
  const cwe = detail.cweId || 'CWE-89';
  const severity = detail.severity || 'HIGH';
  const typeDisplayName = detail.displayName || detail.vulnerabilityType || '보안 취약점';
  const fileName = detail.file?.fileName || detail.file?.relativePath || detail.fileName || 'source_code';

  return {
    id: findingId,
    findingId: findingId,
    file: fileName,
    fileName: fileName,
    vulnerabilityType: detail.vulnerabilityType,
    title: `${typeDisplayName} (${detail.vulnerabilityType || ''})`,
    severity,
    severityBadge: `${cwe} · ${severity === 'CRITICAL' ? '치명적' : severity === 'HIGH' ? '높음' : '보통'}`,
    cwe,
    confidence: detail.llmAnalysis?.confidence ? `${detail.llmAnalysis.confidence}%` : '95%',
    status: detail.status || 'OPEN',
    line: detail.startLine || 1,
    startLine: detail.startLine || 1,
    endLine: detail.endLine || detail.startLine || 1,
    vulnLineIndices: [detail.startLine ? detail.startLine - 1 : 0],
    tagLabel: `${typeDisplayName} 탐지`,
    description:
      detail.llmAnalysis?.explanation ||
      detail.llmAnalysis?.reasoning ||
      detail.llmAnalysis?.summary ||
      detail.detection?.ruleDescription ||
      `${typeDisplayName} 취약점이 탐지되었습니다.`,
    recommendation:
      detail.llmAnalysis?.remediation ||
      detail.llmAnalysis?.remediationGuide ||
      '안전한 매개변수화(Prepared Statement) 또는 입력 유효성 검증 방식을 적용하세요.',
    detectionSource: {
      title: '탐지 근거 · 규칙 기반 (Rule-based)',
      ruleId: detail.detection?.ruleId || detail.ruleId || 'SEC-SCAN',
      ruleTitle: detail.detection?.ruleTitle || detail.ruleTitle || typeDisplayName,
      matchedCode: detail.beforeCode?.lines
        ? detail.beforeCode.lines.join('\n')
        : detail.detection?.matchedText || detail.codeSnippet || '',
    },
    diff:
      detail.beforeCode && detail.afterCode
        ? {
            beforeStartLine: detail.beforeCode.startLine || 1,
            beforeLines: detail.beforeCode.lines || [],
            afterStartLine: detail.afterCode.startLine || 1,
            afterLines: detail.afterCode.lines || [],
          }
        : null,
    beforeCode: detail.beforeCode,
    afterCode: detail.afterCode,
    llmAnalysis: detail.llmAnalysis,
    rawBackend: detail,
  };
};

export const findingApi = {
  /**
   * 취약점 목록 조회 (GET /analyses/{analysisId}/findings)
   */
  getFindings: async (analysisId, params = {}) => {
    const response = await apiClient.get(`/analyses/${analysisId}/findings`, { params });
    const data = unwrap(response);
    if (data && Array.isArray(data.content)) {
      return data.content.map((item) => ({
        ...item,
        id: item.findingId || item.id,
        title: item.displayName || item.ruleTitle || item.vulnerabilityType,
        line: item.startLine || 1,
      }));
    }
    if (Array.isArray(data)) {
      return data;
    }
    return data?.content || [];
  },

  /**
   * 취약점 상세 조회 (GET /findings/{findingId})
   */
  getFindingDetail: async (findingId) => {
    const response = await apiClient.get(`/findings/${findingId}`);
    const data = unwrap(response);
    return normalizeFindingDetail(data);
  },

  /**
   * 취약점 처리 상태 변경 (PATCH /findings/{findingId}/status)
   */
  updateFindingStatus: async (findingId, status) => {
    const response = await apiClient.patch(`/findings/${findingId}/status`, { status });
    return unwrap(response);
  },
};

export default findingApi;
