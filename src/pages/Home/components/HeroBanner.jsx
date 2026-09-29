import { ArrowRight, ShieldCheck } from 'lucide-react';

/**
 * 홈 대시보드 히어로 배너 컴포넌트
 * 05 React 컴포넌트 설계서 표 3-1 준수
 *
 * @param {function} onStart - 분석 시작 버튼 클릭 이벤트
 */
export default function HeroBanner({ onStart }) {
  return (
    <section className="hero">
      <div>
        <small>AI SECURITY COPILOT</small>
        <h2>빠른 전에, 코드 속 위험을 먼저 발견하세요.</h2>
        <p>
          정적 분석과 AI 추론을 결합해 취약점의 위치, 영향 범위, 안전한 수정안을
          한 번에 확인합니다.
        </p>
        <button className="dark-btn" onClick={onStart}>
          코드 가져오기 시작
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="hero-ring">
        <ShieldCheck size={30} />
      </div>
    </section>
  );
}
