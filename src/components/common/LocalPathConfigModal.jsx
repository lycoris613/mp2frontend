import { useState, useEffect } from 'react';
import { FolderCog, X, Check, RotateCcw, HardDrive, Info } from 'lucide-react';
import {
  getLocalCodeBaseDir,
  saveLocalCodeBaseDir,
  DEFAULT_LOCAL_CODE_BASE_DIR,
} from '../../services/localCodeSyncService';

/**
 * 로컬 소스코드 동기화 디렉토리 경로 설정 모달
 * 다른 컴퓨터나 다른 디렉토리 환경에서도 사용자가 소스코드 저장 위치를 자유롭게 수정할 수 있도록 지원
 */
export default function LocalPathConfigModal({ isOpen, onClose, onPathChanged }) {
  const [currentPath, setCurrentPath] = useState(() => getLocalCodeBaseDir());
  const [inputPath, setInputPath] = useState(() => getLocalCodeBaseDir());
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const activeDir = getLocalCodeBaseDir();
      setCurrentPath(activeDir);
      setInputPath(activeDir);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResetDefault = () => {
    setInputPath(DEFAULT_LOCAL_CODE_BASE_DIR);
  };

  const handleSave = async () => {
    const trimmed = inputPath.trim();
    if (!trimmed) return;

    await saveLocalCodeBaseDir(trimmed);
    setCurrentPath(trimmed);
    setSaveSuccess(true);
    onPathChanged?.(trimmed);

    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#151922',
          border: '1px solid #2b3445',
          borderRadius: '10px',
          width: '520px',
          padding: '24px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.7)',
          color: '#e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <FolderCog size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
                로컬 소스코드 저장 경로 설정
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '14px', color: '#94a3b8' }}>
                다른 컴퓨터 또는 다른 드라이브/폴더에서 작업할 때 경로를 직접 수정할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 경로 입력 폼 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '15px', fontWeight: 500, marginBottom: '8px', color: '#cbd5e1' }}>
            로컬 기준 폴더 절대 경로 (Base Directory)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="예: C:\Users\{사용자명}\Documents\code 또는 D:\project\code"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0d1017',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '15px',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
              }}
            />
          </div>
        </div>

        {/* 안내 상자 */}
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <Info size={16} color="#818cf8" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <span>파일은 설정하신 경로 하위에 </span>
            <strong style={{ color: '#818cf8' }}>{`{설정경로}\\{프로젝트명}\\{상대경로}`}</strong>
            <span> 형태로 자동 생성 및 실시간 동기화됩니다.</span>
            <br />
            <span style={{ color: '#94a3b8' }}>
              폴더가 존재하지 않는 경우 자동으로 새 디렉토리를 생성합니다.
            </span>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleResetDefault}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid #334155',
              color: '#94a3b8',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
            title="기본값(C:\Users\user\Documents\code)으로 되돌리기"
          >
            <RotateCcw size={12} />
            <span>기본값 복원</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #334155',
                color: '#94a3b8',
                borderRadius: '6px',
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!inputPath.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                background: saveSuccess ? '#10b981' : '#0284c7',
                border: 'none',
                color: '#ffffff',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: inputPath.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s',
              }}
            >
              {saveSuccess ? (
                <>
                  <Check size={14} />
                  <span>적용 완료!</span>
                </>
              ) : (
                <>
                  <HardDrive size={14} />
                  <span>경로 저장 및 적용</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
