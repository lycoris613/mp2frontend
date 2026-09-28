import Header from '../components/Header';
import { codeLines, fixedLines } from '../data/mockData';

const resultFiles = [
  'routes',
  'users.ts',
  'payments.ts',
  'database.ts',
  'config.ts',
  'auth.ts',
];

export default function Result() {
  return (
    <main className="content">
      <Header />

      <div className="page-pad result-page">
        <div className="result-title">
          <div>
            <h2>코드 분석 결과</h2>
            <p>payments-api · src/routes/users.ts</p>
          </div>
          <button className="outline-btn">보고서 내보내기</button>
        </div>

        <div className="filter-row">
          <span className="pill active">● SQL 삽입　8</span>
          <span className="pill">● 하드코딩 API 키　11</span>
          <span className="pill">● 세션 쿠키 설정　4</span>
          <span className="pill">● 입력 검증 누락　11</span>
          <span className="pill">● 오류 메시지 노출　29</span>
          <span className="totals">
            전체 <b>23</b>　● 치명적 3　● 높음 6　● 중간·낮음 14
          </span>
        </div>

        <div className="result-grid">
          <aside className="result-tree">
            <small>탐색기 · PAYMENTS-API</small>

            {resultFiles.map((file, index) => (
              <div
                className={file === 'users.ts' ? 'selected tree-row' : 'tree-row'}
                key={file}
              >
                {file}
                <span>{[0, 1, 1, 1, 1, 1][index] ? '●' : ''}</span>
              </div>
            ))}
          </aside>

          <section className="editor result-editor">
            <div className="tab">users.ts</div>
            <div className="code">
              {codeLines.map((line, index) => (
                <div className={index === 5 ? 'vuln-line' : ''} key={index}>
                  <em>{index + 1}</em>
                  <code>{line || ' '}</code>
                  {index === 5 && (
                    <span className="tag">SQL 삽입 가능성 · 치명적</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <aside className="finding">
            <div className="finding-top">
              <span>위험도 · CWE-89</span>
              <small>AI 신뢰도 97%</small>
            </div>
            <h3>SQL 삽입 취약점</h3>
            <label>설명</label>
            <p>사용자 입력값을 검증 없이 SQL 쿼리 문자열에 직접 삽입합니다.</p>
            <label>공격 효과</label>
            <p>
              인가되지 않은 데이터 조회, 데이터베이스 변조 및 명령 실행 위험이
              있습니다.
            </p>
            <button className="outline-btn wide">이 취약점</button>
          </aside>
        </div>

        <div className="diff">
          <section>
            <b>BEFORE　users.ts</b>
            {codeLines.slice(4, 7).map((line, index) => (
              <code className="bad" key={index}>
                {index + 5}　{line}
              </code>
            ))}
          </section>

          <section>
            <b>AFTER　users.ts</b>
            {fixedLines.map((line, index) => (
              <code className="good" key={index}>
                {index + 5}　{line}
              </code>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
