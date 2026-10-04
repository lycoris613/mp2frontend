/**
 * 로딩 스피너 공통 컴포넌트
 */
export default function LoadingSpinner({ message = '데이터를 불러오는 중입니다...' }) {
  return (
    <div className="loading-container" style={{ padding: '32px', textAlign: 'center' }}>
      <div className="spinner" style={{ display: 'inline-block', marginBottom: '8px' }}>
        ⏳
      </div>
      <p style={{ color: 'var(--text-3)', fontSize: '15px' }}>{message}</p>
    </div>
  );
}
