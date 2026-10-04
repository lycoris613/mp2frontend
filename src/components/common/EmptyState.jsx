/**
 * 빈 상태 안내 공통 컴포넌트
 */
export default function EmptyState({
  title = '데이터가 없습니다',
  description = '새로운 분석을 시작해 보세요.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
      <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>{title}</p>
      <p style={{ color: 'var(--text-3)', fontSize: '15px', marginBottom: '16px' }}>
        {description}
      </p>
      {actionLabel && (
        <button className="dark-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
