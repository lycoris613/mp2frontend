import Sidebar from '../components/layout/Sidebar';

/**
 * 로그인 후 공통 레이아웃 (Sidebar + Main Content)
 * 04 UI화면 설계서 2.1절 및 05 React 컴포넌트 설계서 표 3-1 준수
 */
export default function ProtectedLayout({ page, setPage, children }) {
  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} />
      {children}
    </div>
  );
}
