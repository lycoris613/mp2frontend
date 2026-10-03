/**
 * 프로그래밍 언어 감지 유틸리티
 */
export function detectLanguage(fileName, codeContent = '') {
  if (!fileName) {
    return {
      language: 'UNKNOWN',
      displayName: '확인실패',
      tag: 'FAIL',
      isSupported: false,
      message: '파일이 선택되지 않았습니다',
    };
  }

  const parts = fileName.split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';

  const LANGUAGE_MAP = {
    // TypeScript
    ts: { language: 'TYPESCRIPT', displayName: 'TypeScript', tag: 'TS', isSupported: true },
    tsx: { language: 'TYPESCRIPT', displayName: 'TypeScript (JSX)', tag: 'TSX', isSupported: true },
    // JavaScript
    js: { language: 'JAVASCRIPT', displayName: 'JavaScript', tag: 'JS', isSupported: true },
    jsx: { language: 'JAVASCRIPT', displayName: 'JavaScript (JSX)', tag: 'JSX', isSupported: true },
    mjs: { language: 'JAVASCRIPT', displayName: 'JavaScript Module', tag: 'MJS', isSupported: true },
    cjs: { language: 'JAVASCRIPT', displayName: 'CommonJS', tag: 'CJS', isSupported: true },
    // Java
    java: { language: 'JAVA', displayName: 'Java', tag: 'JAVA', isSupported: true },
    // Python
    py: { language: 'PYTHON', displayName: 'Python', tag: 'PY', isSupported: true },
    // HTML
    html: { language: 'HTML', displayName: 'HTML', tag: 'HTML', isSupported: true },
    htm: { language: 'HTML', displayName: 'HTML', tag: 'HTM', isSupported: true },
    jsp: { language: 'HTML', displayName: 'JSP / HTML', tag: 'JSP', isSupported: true },
  };

  if (ext && LANGUAGE_MAP[ext]) {
    return LANGUAGE_MAP[ext];
  }

  // 첫 줄 해시뱅(#!)으로 2차 시도
  const text = Array.isArray(codeContent) ? codeContent.join('\n') : String(codeContent || '');
  const firstLine = text.split('\n')[0]?.trim() || '';
  if (firstLine.startsWith('#!/usr/bin/env python') || firstLine.startsWith('#!/usr/bin/python')) {
    return LANGUAGE_MAP.py;
  }
  if (firstLine.startsWith('#!/usr/bin/env node') || firstLine.startsWith('#!/usr/bin/node')) {
    return LANGUAGE_MAP.js;
  }

  // 알 수 없거나 지원하지 않는 언어 -> 확인실패
  return {
    language: 'UNKNOWN',
    displayName: '확인실패',
    tag: 'FAIL',
    isSupported: false,
    message: `지원하지 않는 파일 형식 (.${ext || '확장자없음'})`,
  };
}

export default detectLanguage;
