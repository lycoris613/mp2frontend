import Header from '../components/Header';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { projects } from '../data/mockData';

export default function Home({ setPage }) {
  const chartBars = [42, 34, 48, 39, 43, 37, 33, 29, 24, 20, 18, 14];

  return (
    <main className="content">
      <Header />

      <div className="page-pad">
        <section className="hero">
          <div>
            <small>AI SECURITY COPILOT</small>
            <h2>빠른 전에, 코드 속 위험을 먼저 발견하세요.</h2>
            <p>
              정적 분석과 AI 추론을 결합해 취약점의 위치, 영향 범위,
              안전한 수정안을 한 번에 확인합니다.
            </p>
            <button className="dark-btn" onClick={() => setPage('analyze')}>
              코드 가져오기 시작
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="hero-ring">
            <ShieldCheck size={30} />
          </div>
        </section>

        <section className="stats">
          <article>
            <span>이번 주 분석</span>
            <b>128</b>
            <small>지난 주 대비 +18%</small>
          </article>
          <article>
            <span>발견한 취약점</span>
            <b>47</b>
            <small>치명적 3건 포함</small>
          </article>
          <article>
            <span>개선율</span>
            <b>86.4%</b>
            <small>+6.2%p 개선</small>
          </article>
          <article>
            <span>평균 분석 시간</span>
            <b>2분 18초</b>
            <small>32초 단축</small>
          </article>
        </section>

        <div className="home-grid">
          <section className="panel recent">
            <div className="panel-head">
              <b>최근 분석</b>
              <span>전체 보기 →</span>
            </div>

            {projects.map((project) => (
              <div className="recent-row" key={project.name}>
                <span className="file-icon"></span>
                <div>
                  <b>{project.name}</b>
                  <small>{project.meta}</small>
                </div>
                <span className={'risk ' + project.tone}>
                  위험 {project.risk}
                </span>
                <small>3분 전</small>
              </div>
            ))}
          </section>

          <section className="panel severity">
            <div className="panel-head">
              <b>위험 추세 · 심각도</b>
              <small>최근 30일</small>
            </div>
            <div className="bars">
              {chartBars.map((height, index) => (
                <i key={index} style={{ height }}></i>
              ))}
            </div>
            <div className="legend">● 치명적　● 높음　● 중간　● 낮음</div>
          </section>

          <section className="panel vulnerability-pie-panel">
            <div className="panel-head">
              <b>취약점 유형</b>
              <small>발견된 취약점 47건</small>
            </div>

            <div className="vulnerability-pie-wrap">
              <svg
                className="vulnerability-pie"
                viewBox="0 0 200 140"
                role="img"
                aria-label="취약점 유형 분포 파이차트"
              >
                <path
                  className="pie-slice pie-sql"
                  d="M 100 70 L 100 12 A 58 58 0 0 1 119.03 124.79 Z"
                />
                <path
                  className="pie-slice pie-secret"
                  d="M 100 70 L 119.03 124.79 A 58 58 0 0 1 42.29 64.19 Z"
                />
                <path
                  className="pie-slice pie-xss"
                  d="M 100 70 L 42.29 64.19 A 58 58 0 0 1 100 12 Z"
                />

                <text className="pie-label" x="135" y="60" textAnchor="middle">
                  <tspan x="135" dy="0">SQL 삽입</tspan>
                  <tspan className="pie-count" x="135" dy="13">21건</tspan>
                </text>

                <text className="pie-label" x="77" y="91" textAnchor="middle">
                  <tspan x="77" dy="0">하드코딩</tspan>
                  <tspan x="77" dy="11">비밀정보</tspan>
                  <tspan className="pie-count" x="77" dy="12">15건</tspan>
                </text>

                <text className="pie-label" x="77" y="42" textAnchor="middle">
                  <tspan x="77" dy="0">XSS</tspan>
                  <tspan className="pie-count" x="77" dy="13">11건</tspan>
                </text>
              </svg>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
