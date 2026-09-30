/**
 * 백엔드 연동 전 Mock 데이터, Axios Client, API 계층, Zustand Store 전체 연결 검증 스크립트
 * 
 * 페이지 UI 파일을 수정하지 않고도 백엔드 연동 전에 모든 모듈의 연동 상태를 확인합니다.
 * 실행 방법:
 * 1) Node 환경: node src/api/verifyConnection.js (또는 npm test 등)
 * 2) 브라우저 콘솔: import('./src/api/verifyConnection.js').then(m => m.runVerification())
 */

import { apiClient, USE_MOCK } from './client.js';
import { analysisApi } from './analysisApi.js';
import { findingApi } from './findingApi.js';
import { dashboardApi } from './dashboardApi.js';
import { useDashboardStore } from '../stores/dashboardStore.js';
import { useAnalysisStore } from '../stores/analysisStore.js';

export async function runVerification() {
  console.log('\n======================================================');
  console.log('🚀 CodeGuard AI 백엔드 사전 연동 검증 시작');
  console.log(`📡 Mock 모드 활성화 여부: ${USE_MOCK ? '✅ 활성화 (Mock Adapter)' : '❌ 비활성화 (Real Backend)'}`);
  console.log('======================================================\n');

  const results = [];

  // 1. 대시보드 통계 API 및 dashboardStore 연결 검증
  try {
    console.log('[1/5] 📊 dashboardApi 및 dashboardStore 검증 중...');
    const apiSummary = await dashboardApi.getDashboardSummary(30);
    const storeSummary = await useDashboardStore.getState().fetchSummary(30);

    const isMatch = storeSummary && storeSummary.weeklyAnalysisCount === 128;
    results.push({
      항목: '1. 대시보드 통계 (GET /dashboard/summary)',
      API연결: apiSummary ? '성공' : '실패',
      스토어연동: isMatch ? '성공 (weeklyAnalysis: 128)' : '실패',
      상태: isMatch ? '✅ 정상' : '❌ 오류',
    });
  } catch (err) {
    results.push({
      항목: '1. 대시보드 통계',
      API연결: '실패',
      스토어연동: '실패',
      상태: `❌ 오류: ${err.message}`,
    });
  }

  // 2. 분석 목록 및 생성 (analysisApi + analysisStore) 검증
  try {
    console.log('[2/5] 🔍 analysisApi 및 analysisStore (목록/생성) 검증 중...');
    const listBefore = await useAnalysisStore.getState().fetchAnalyses();

    // 신규 분석 요청 생성 (POST /analyses)
    const newAnalysisId = await useAnalysisStore.getState().createAnalysis(
      '검증용 테스트 프로젝트',
      [
        {
          relativePath: 'src/test.ts',
          content: 'const x = req.query.id;\ndb.query(`SELECT * FROM tbl WHERE id = ${x}`);',
        },
      ]
    );

    const listAfter = useAnalysisStore.getState().analyses;
    const isAdded = listAfter.some((a) => a.analysisId === newAnalysisId);

    results.push({
      항목: '2. 분석 생성/목록 (POST & GET /analyses)',
      API연결: newAnalysisId ? `성공 (ID: ${newAnalysisId})` : '실패',
      스토어연동: isAdded ? '성공 (목록 실시간 반영)' : '실패',
      상태: isAdded ? '✅ 정상' : '❌ 오류',
    });
  } catch (err) {
    results.push({
      항목: '2. 분석 생성/목록',
      API연결: '실패',
      스토어연동: '실패',
      상태: `❌ 오류: ${err.message}`,
    });
  }

  // 3. 분석 진행 상태 폴링 API 검증
  try {
    console.log('[3/5] ⏱️ analysisApi.getAnalysisStatus (폴링) 검증 중...');
    const status1 = await analysisApi.getAnalysisStatus(128);
    const status2 = await analysisApi.getAnalysisStatus(128);

    results.push({
      항목: '3. 진행 상태 폴링 (GET /analyses/{id}/status)',
      API연결: `성공 (${status1.status} -> ${status2.status})`,
      스토어연동: `진행률 ${status2.progress}%`,
      상태: '✅ 정상',
    });
  } catch (err) {
    results.push({
      항목: '3. 진행 상태 폴링',
      API연결: '실패',
      스토어연동: '실패',
      상태: `❌ 오류: ${err.message}`,
    });
  }

  // 4. 분석 결과(요약 + 파일트리 + 취약점) 병렬 조회 및 코드 본문/마커 조회 검증
  try {
    console.log('[4/5] 📁 analysisStore.fetchResult & fetchFileContent 검증 중...');
    const result = await useAnalysisStore.getState().fetchResult(128);
    const fileContent = await useAnalysisStore.getState().fetchFileContent(128, 501);

    const hasSummary = !!result.summary;
    const hasFiles = result.files.length > 0;
    const hasMarkers = fileContent && fileContent.findingMarkers.length > 0;

    results.push({
      항목: '4. 결과/파일/마커 (GET /files/{fileId})',
      API연결: `파일 ${result.files.length}개 / 마커 ${fileContent?.findingMarkers?.length}개`,
      스토어연동: hasSummary && hasFiles && hasMarkers ? '성공' : '실패',
      상태: hasSummary && hasFiles && hasMarkers ? '✅ 정상' : '❌ 오류',
    });
  } catch (err) {
    results.push({
      항목: '4. 결과/파일/마커',
      API연결: '실패',
      스토어연동: '실패',
      상태: `❌ 오류: ${err.message}`,
    });
  }

  // 5. 취약점 상세(LLM 분석) 조회 및 상태 변경 (PATCH /status) 검증
  try {
    console.log('[5/5] 🛡️ findingApi & analysisStore (상세/상태변경) 검증 중...');
    const findingDetail = await useAnalysisStore.getState().selectFinding(9001);
    const hasLlm = findingDetail && findingDetail.llmAnalysis && findingDetail.llmAnalysis.status === 'SUCCESS';

    // 상태 변경 테스트 (OPEN -> RESOLVED)
    await useAnalysisStore.getState().updateFindingStatus(9001, 'RESOLVED');
    const updatedFinding = useAnalysisStore.getState().findings.find((f) => f.findingId === 9001);
    const isResolved = updatedFinding && updatedFinding.status === 'RESOLVED';

    results.push({
      항목: '5. 취약점 상세/해결 (PATCH /findings/{id}/status)',
      API연결: hasLlm ? `LLM 설명 (${findingDetail.llmAnalysis.modelName})` : '실패',
      스토어연동: isResolved ? '성공 (상태: RESOLVED 반영)' : '실패',
      상태: hasLlm && isResolved ? '✅ 정상' : '❌ 오류',
    });
  } catch (err) {
    results.push({
      항목: '5. 취약점 상세/해결',
      API연결: '실패',
      스토어연동: '실패',
      상태: `❌ 오류: ${err.message}`,
    });
  }

  console.log('\n======================================================');
  console.log('📋 최종 검증 결과 요약');
  console.log('======================================================');
  console.table(results);
  console.log('======================================================\n');

  return results;
}

// Node.js 직접 실행 시
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('verifyConnection')) {
  runVerification();
}
