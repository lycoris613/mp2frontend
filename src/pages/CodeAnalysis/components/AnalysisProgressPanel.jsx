import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * 분석 진행 모달 팝업 컴포넌트
 * 취약점 분석 시작 버튼 클릭 시 팝업으로 오픈되며,
 * 백엔드 미연결 상태 안내와 함께 프론트엔드 모의(Mock) 분석 진행률 및 단계 표시
 *
 * @param {boolean} isOpen - 모달 팝업 표시 여부
 * @param {function} onClose - 팝업 닫기/취소 콜백
 * @param {function} onViewResult - 분석 결과 페이지 이동 콜백
 * @param {string} fileName - 분석 대상 파일명
 * @param {object} config - 분석 설정 (title, scope, rules)
 */
export default function AnalysisProgressPanel({
  isOpen = false,
  onClose,
  onViewResult,
  fileName = 'users.ts',
  config = {},
  result = null,
}) {
  const [percent, setPercent] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const findingCount = result?.totalFindings !== undefined ? result.totalFindings : 3;

  const steps = [
    '코드 구문 분석 및 AST 파싱 중...',
    '선택 보안 룰 대조 및 취약점 탐지 중...',
    'AI 취약점 영향도 및 신뢰도 평가 중...',
    `취약점 분석 완료 (${findingCount}건 발견됨)`,
  ];

  useEffect(() => {
    if (!isOpen) {
      setPercent(0);
      setStepIndex(0);
      setIsCompleted(false);
      return;
    }

    // 모의(Mock) 분석 진행 애니메이션 시뮬레이션
    setPercent(15);
    setStepIndex(0);
    setIsCompleted(false);

    const t1 = setTimeout(() => {
      setPercent(45);
      setStepIndex(1);
    }, 700);

    const t2 = setTimeout(() => {
      setPercent(80);
      setStepIndex(2);
    }, 1500);

    const t3 = setTimeout(() => {
      setPercent(100);
      setStepIndex(3);
      setIsCompleted(true);
    }, 2300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="analysis-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-modal-title"
      >
        {/* 모달 헤더 */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className={`status-indicator-dot ${isCompleted ? 'done' : 'active'}`}>●</span>
            <h4 id="analysis-modal-title">
              {isCompleted ? '취약점 분석 완료' : '코드 취약점 분석 실행 중'}
            </h4>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="닫기"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="modal-body">
          {/* 백엔드 미연동 안내 알림 배너 */}
          <div className="backend-notice-banner">
            <AlertTriangle size={16} className="notice-icon" />
            <div className="notice-text">
              <strong>백엔드 API 미연결 안내</strong>
              <p>
                현재 백엔드 분석 서버가 연결되어 있지 않아 사전 정의된 데모(Mock) 분석 시뮬레이션으로 동작합니다.
              </p>
            </div>
          </div>

          {/* 분석 대상 정보 카드 */}
          <div className="analysis-target-info">
            <div className="info-row">
              <span className="info-label">프로젝트명</span>
              <span className="info-value">{config?.title || '결제 API 점검'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">대상 파일</span>
              <span className="info-value code-font">{fileName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">분석 범위</span>
              <span className="info-value">{config?.scope || '현재 파일'}</span>
            </div>
          </div>

          {/* 진행 상태 및 프로그레스 바 */}
          <div className="modal-progress-section">
            <div className="progress-labels">
              <span className="step-label">
                {!isCompleted && <Loader2 size={13} className="spin-icon" />}
                {isCompleted && <CheckCircle size={13} className="done-icon" />}
                <span>{steps[stepIndex]}</span>
              </span>
              <span className="progress-percent">{percent}%</span>
            </div>
            <div className="modal-progress-track">
              <div
                className={`modal-progress-bar ${isCompleted ? 'completed' : ''}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 모달 하단 푸터 버튼 */}
        <div className="modal-footer">
          <button
            type="button"
            className="outline-btn"
            onClick={onClose}
          >
            {isCompleted ? '창 닫기' : '분석 취소'}
          </button>
          <button
            type="button"
            className="dark-btn"
            onClick={onViewResult}
            disabled={!isCompleted}
          >
            {isCompleted ? '분석 결과 확인하기 →' : '분석 진행 중...'}
          </button>
        </div>
      </div>
    </div>
  );
}
