/**
 * 분석 및 취약점 결과 상태 스토어 (05 React 컴포넌트 설계서 표 7-2 준수)
 */
import { create } from 'zustand';
import { analysisApi } from '../api/analysisApi.js';
import { findingApi } from '../api/findingApi.js';

let pollingTimer = null;

export const useAnalysisStore = create((set, get) => ({
  // 상태 (State)
  analyses: [],
  listLoading: false,
  currentAnalysis: null,
  files: [],
  fileContent: null,
  findings: [],
  selectedFinding: null,
  detailLoading: false,
  progress: null,
  error: null,

  // 액션 (Actions)

  /**
   * 1. 분석 목록 조회
   */
  fetchAnalyses: async (params = {}) => {
    set({ listLoading: true, error: null });
    try {
      const data = await analysisApi.getAnalyses(params);
      const list = Array.isArray(data) ? data : data.content || [];
      set({ analyses: list, listLoading: false });
      return list;
    } catch (err) {
      set({ error: err.message || '분석 목록을 불러오지 못했습니다.', listLoading: false });
      throw err;
    }
  },

  /**
   * 2. 분석 요청 생성
   */
  createAnalysis: async (title, files = [], scanOptions = {}) => {
    set({ error: null });
    try {
      const payload = {
        title,
        files: files.map((f) => ({
          relativePath: f.relativePath || f.name,
          content: f.content || '',
        })),
        scanOptions: {
          detectSqlInjection: true,
          detectHardcodedSecret: true,
          detectXss: true,
          ...scanOptions,
        },
      };

      const result = await analysisApi.createAnalysis(payload);
      const analysisId = result.analysisId;

      // 목록 비동기 새로고침 대기
      await get().fetchAnalyses();

      return analysisId;
    } catch (err) {
      set({ error: err.message || '분석 생성에 실패했습니다.' });
      throw err;
    }
  },

  /**
   * 3. 2초 주기 폴링 시작
   */
  startPolling: (analysisId, onFinish) => {
    get().stopPolling();

    const poll = async () => {
      try {
        const progressData = await analysisApi.getAnalysisStatus(analysisId);
        set({ progress: progressData });

        if (progressData.status === 'COMPLETED' || progressData.status === 'FAILED') {
          get().stopPolling();
          if (progressData.status === 'COMPLETED') {
            await get().fetchAnalyses();
            if (typeof onFinish === 'function') {
              onFinish(progressData);
            }
          }
        }
      } catch (err) {
        console.error('분석 폴링 에러:', err);
      }
    };

    // 즉시 1회 실행 후 2초 간격 폴링
    poll();
    pollingTimer = setInterval(poll, 2000);
  },

  /**
   * 4. 폴링 중단
   */
  stopPolling: () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  },

  /**
   * 5. 분석 결과 전체 조회 (요약 + 파일 목록 + 취약점 목록 병렬 조회)
   */
  fetchResult: async (analysisId) => {
    set({ detailLoading: true, error: null });
    try {
      const [summary, files, findingsData] = await Promise.all([
        analysisApi.getAnalysisDetail(analysisId),
        analysisApi.getAnalysisFiles(analysisId),
        findingApi.getFindings(analysisId),
      ]);

      const findingsList = Array.isArray(findingsData) ? findingsData : findingsData.content || [];

      set({
        currentAnalysis: summary,
        files: files || [],
        findings: findingsList,
        detailLoading: false,
      });

      // 첫 번째 파일 및 취약점이 있다면 자동 로드
      if (files && files.length > 0) {
        const firstFile = files.find((f) => f.findingCount > 0) || files[0];
        get().fetchFileContent(analysisId, firstFile.fileId);
      }

      if (findingsList.length > 0) {
        get().selectFinding(findingsList[0].findingId);
      }

      return { summary, files, findings: findingsList };
    } catch (err) {
      set({ error: err.message || '분석 결과를 불러오지 못했습니다.', detailLoading: false });
      throw err;
    }
  },

  /**
   * 6. 파일 코드 본문 조회 (마커 포함)
   */
  fetchFileContent: async (analysisId, fileId) => {
    try {
      const contentData = await analysisApi.getAnalysisFileContent(analysisId, fileId);
      set({ fileContent: contentData });
      return contentData;
    } catch (err) {
      console.error('파일 본문 조회 실패:', err);
      set({ fileContent: null });
    }
  },

  /**
   * 7. 취약점 상세 정보 조회 (LLM 분석 및 Diff 포함)
   */
  selectFinding: async (findingId) => {
    if (!findingId) {
      set({ selectedFinding: null });
      return;
    }
    try {
      const detail = await findingApi.getFindingDetail(findingId);
      set({ selectedFinding: detail });
      return detail;
    } catch (err) {
      console.error('취약점 상세 조회 실패:', err);
      set({ selectedFinding: null });
    }
  },

  /**
   * 8. 취약점 처리 상태 변경 (RESOLVED, OPEN, IGNORED)
   */
  updateFindingStatus: async (findingId, status) => {
    try {
      const result = await findingApi.updateFindingStatus(findingId, status);

      // 목록 상태 실시간 갱신
      set((state) => ({
        findings: state.findings.map((f) =>
          f.findingId === Number(findingId) ? { ...f, status } : f
        ),
        selectedFinding:
          state.selectedFinding && state.selectedFinding.findingId === Number(findingId)
            ? { ...state.selectedFinding, status }
            : state.selectedFinding,
      }));

      return result;
    } catch (err) {
      set({ error: err.message || '취약점 상태 변경에 실패했습니다.' });
      throw err;
    }
  },

  /**
   * 9. 분석 삭제
   */
  deleteAnalysis: async (analysisId) => {
    try {
      await analysisApi.deleteAnalysis(analysisId);
      set((state) => ({
        analyses: state.analyses.filter((a) => a.analysisId !== Number(analysisId)),
        currentAnalysis:
          state.currentAnalysis?.analysisId === Number(analysisId) ? null : state.currentAnalysis,
      }));
    } catch (err) {
      set({ error: err.message || '분석 삭제에 실패했습니다.' });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAnalysisStore;
