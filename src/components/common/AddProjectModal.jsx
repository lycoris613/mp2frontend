import { useState, useRef, useEffect } from 'react';
import { FolderPlus, X, AlertCircle, Check } from 'lucide-react';
import { createNewEmptyProject } from '../../services/projectService';

export default function AddProjectModal({ isOpen, onClose, onProjectCreated }) {
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [createSrcFolder, setCreateSrcFolder] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setProjectName('');
      setProjectDesc('');
      setCreateSrcFolder(true);
      setErrorMsg('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmed = projectName.trim();
    if (!trimmed) {
      setErrorMsg('프로젝트 이름을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newProj = await createNewEmptyProject({
        name: trimmed,
        description: projectDesc,
        createSrcFolder,
      });

      if (typeof onProjectCreated === 'function') {
        onProjectCreated(newProj);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || '프로젝트 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-1, #12161f)',
          border: '1px solid var(--border-strong, #2a3447)',
          borderRadius: '12px',
          width: '460px',
          maxWidth: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          color: 'var(--text-1, #f8fafc)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border, #1e2636)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-2, #181f2c)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderPlus size={18} color="#10b981" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
                새 빈 프로젝트 추가
              </h3>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '13px',
                  color: 'var(--text-3, #94a3b8)',
                }}
              >
                새로운 빈 프로젝트를 생성하고 로컬 파일 시스템과 연동합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-3, #94a3b8)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {errorMsg && (
            <div
              style={{
                marginBottom: '14px',
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#f87171',
                fontSize: '14px',
              }}
            >
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '6px',
                color: 'var(--text-2, #cbd5e1)',
              }}
            >
              프로젝트 이름 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="예: order-service, user-management"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--bg-0, #0a0d14)',
                border: '1px solid var(--border, #2a3447)',
                borderRadius: '6px',
                color: 'var(--text-1, #f8fafc)',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <small
              style={{
                display: 'block',
                marginTop: '4px',
                fontSize: '13px',
                color: 'var(--text-3, #64748b)',
              }}
            >
              영문 소문자, 숫자, 하이픈(-) 조합을 권장합니다.
            </small>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '6px',
                color: 'var(--text-2, #cbd5e1)',
              }}
            >
              프로젝트 설명 (선택)
            </label>
            <input
              type="text"
              placeholder="예: 주문 및 결제 처리 백엔드 서비스"
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--bg-0, #0a0d14)',
                border: '1px solid var(--border, #2a3447)',
                borderRadius: '6px',
                color: 'var(--text-1, #f8fafc)',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div
            style={{
              marginBottom: '20px',
              padding: '10px 14px',
              background: 'var(--bg-2, #181f2c)',
              borderRadius: '6px',
              border: '1px solid var(--border, #2a3447)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }}
            onClick={() => setCreateSrcFolder(!createSrcFolder)}
          >
            <input
              type="checkbox"
              id="createSrcFolder"
              checked={createSrcFolder}
              onChange={(e) => setCreateSrcFolder(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--accent, #10b981)' }}
            />
            <label
              htmlFor="createSrcFolder"
              style={{
                fontSize: '14px',
                color: 'var(--text-2, #cbd5e1)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              기본 <strong>src</strong> 폴더 생성 (추천)
            </label>
          </div>

          {/* 푸터 액션 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid var(--border, #333d4e)',
                color: 'var(--text-2, #94a3b8)',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !projectName.trim()}
              style={{
                padding: '8px 18px',
                background: projectName.trim()
                  ? 'var(--accent, #10b981)'
                  : 'var(--border, #333d4e)',
                border: 'none',
                color: projectName.trim() ? '#022c22' : '#64748b',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: projectName.trim() ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isSubmitting ? (
                <span>생성 중...</span>
              ) : (
                <>
                  <Check size={14} />
                  <span>프로젝트 생성</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
