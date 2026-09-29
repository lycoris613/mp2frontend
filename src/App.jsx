import { useState } from 'react';
import ProtectedLayout from './layouts/ProtectedLayout';
import HomePage from './pages/Home';
import CodeAnalysisPage from './pages/CodeAnalysis';
import FindingResultPage from './pages/FindingResult';
import { PAGES } from './constants/navigation';

/**
 * 앱 최상위 루트 컴포넌트
 * ProtectedLayout 기반 페이지 전환 오케스트레이션
 */
export default function App() {
  const [page, setPage] = useState(PAGES.HOME);

  return (
    <ProtectedLayout page={page} setPage={setPage}>
      {page === PAGES.HOME ? (
        <HomePage setPage={setPage} />
      ) : page === PAGES.ANALYZE ? (
        <CodeAnalysisPage setPage={setPage} />
      ) : (
        <FindingResultPage />
      )}
    </ProtectedLayout>
  );
}
