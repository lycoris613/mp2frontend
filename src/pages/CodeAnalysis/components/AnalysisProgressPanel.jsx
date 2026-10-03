import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, Loader2 } from 'lucide-react';

/**
 * 분석 진행 모달 팝업 컴포넌트
 * 실제 Spring Boot 백엔드 분석 진행 및 결과 알림 표시
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

  const timersRef = useRef([]);
  const isCompletedRef = useRef(false);

  const findingCount = result?.totalFindings !== undefined ? result.totalFindings : 0;

  const steps = [
    '코드 구문 분석 및 AST 파싱 중...',
    '선택 보안 룰 대조 및 취약점 탐지 중...',
    'AI 취약점 영향도 및 신뢰도 평가 중...',
    `취약점 분석 완료 (${findingCount}건 발견됨)`,
  ];

  // 모든 대기 타이머 클리어 함수
  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    if (!isOpen) {
      clearAllTimers();
      isCompletedRef.current = false;
      setPercent(0);
      setStepIndex(0);
      setIsCompleted(false);
      return;
    }

    // 모달이 열렸을 때 (결과가 이미 도착한 상태가 아니라면 초기화 진행)
    if (!result) {
      clearAllTimers();
      isCompletedRef.current = false;
      setIsCompleted(false);
      setPercent(20);
      setStepIndex(0);

      // 1단계 -> 2단계: 50%
      const t1 = setTimeout(() => {
        if (!isCompletedRef.current) {
          setPercent((prev) => Math.max(prev, 50));
          setStepIndex((prev) => (prev < 1 ? 1 : prev));
        }
      }, 500);

      // 2단계 -> 3단계: 85%
      const t2 = setTimeout(() => {
        if (!isCompletedRef.current) {
          setPercent((prev) => Math.max(prev, 85));
          setStepIndex((prev) => (prev < 2 ? 2 : prev));
        }
      }, 1000);

      // 3단계 대기: 92% (백엔드 분석 응답 대기)
      const t3 = setTimeout(() => {
        if (!isCompletedRef.current) {
          setPercent((prev) => Math.max(prev, 92));
        }
      }, 1800);

      timersRef.current = [t1, t2, t3];
    }

    return () => {
      clearAllTimers();
    };
  }, [isOpen, result]);

  // result가 도착하면 타이머를 즉시 취소하고 완료(100%) 상태로 확정 전환
  useEffect(() => {
    if (result && isOpen) {
      isCompletedRef.current = true;
      clearAllTimers();
      setPercent(100);
      setStepIndex(3);
      setIsCompleted(true);
    }
  }, [result, isOpen]);

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
          {/* 백엔드 연동 상태 안내 알림 배너 */}
          <div
            className="backend-notice-banner"
            style={{
              borderColor: '#10b981',
              backgroundColor: '#f0fdf4',
              color: '#065f46',
            }}
          >
            <CheckCircle size={16} className="notice-icon" style={{ color: '#10b981' }} />
            <div className="notice-text">
              <strong style={{ color: '#047857' }}>
                Spring Boot 백엔드 분석 엔진 연결됨
              </strong>
              <p style={{ color: '#065f46' }}>
                실제 Spring Boot REST API (/api/v1/analyses) 서버와 연동되어 보안 규칙 탐지를 수행합니다.
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
