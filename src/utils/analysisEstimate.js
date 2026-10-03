/**
 * 예상 분석 시간 계산
 * 03 REST API 설계서 4.1.1 산식 준용: 5초(탐지) + 파일 수 × 20초
 */
export const ANALYZABLE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'java', 'py', 'html', 'htm'];

const BASE_SECONDS = 5;
const SECONDS_PER_FILE = 20;

export const isAnalyzableFile = (fileName = '') =>
  ANALYZABLE_EXTENSIONS.includes(String(fileName).split('.').pop()?.toLowerCase());

const countLines = (content) => {
  if (Array.isArray(content)) return content.length;
  return String(content ?? '').split(/\r?\n/).length;
};

export function formatDuration(seconds) {
  if (seconds < 60) return `약 ${seconds}초`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec === 0 ? `약 ${min}분` : `약 ${min}분 ${sec}초`;
}

/**
 * @param {Object<string, string[]|string>} fileContents - 파일명 → 코드 내용 (분석 요청에 실제로 담기는 파일들)
 * @returns {{ time: string, meta: string, seconds: number, fileCount: number, lineCount: number }}
 */
export function estimateAnalysis(fileContents = {}) {
  const names = Object.keys(fileContents).filter(isAnalyzableFile);
  const fileCount = names.length;
  const lineCount = names.reduce((sum, n) => sum + countLines(fileContents[n]), 0);

  if (fileCount === 0) {
    return { time: '-', meta: '분석 가능한 파일 없음', seconds: 0, fileCount, lineCount };
  }

  const seconds = BASE_SECONDS + fileCount * SECONDS_PER_FILE;
  return {
    time: formatDuration(seconds),
    meta: `${fileCount}개 파일 · ${lineCount}줄`,
    seconds,
    fileCount,
    lineCount,
  };
}
