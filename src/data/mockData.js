/**
 * 하위 호환성 유지용 mockData 진입점
 * 각 기능별 파일(dashboardData, analysisData, findingData)에서 re-export
 */
import { recentProjects } from './dashboardData';
import { defaultFiles, sampleCodeLines } from './analysisData';
import { sampleDiff } from './findingData';

export const projects = recentProjects;
export const files = defaultFiles;
export const codeLines = sampleCodeLines;
export const fixedLines = sampleDiff.afterLines;

export * from './dashboardData';
export * from './analysisData';
export * from './findingData';
