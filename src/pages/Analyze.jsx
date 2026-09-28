import Header from '../components/Header';
import { files, codeLines } from '../data/mockData';

export default function Analyze({ setPage }) {
  return (
    <main className="content">
      <Header compact />

      <div className="workspace">
        <aside className="filetree">
          <small>탐색기 · PAYMENTS-API</small>
          <b>src</b>

          {files.map((file, index) => (
            <div
              className={(file === 'users.ts' ? 'selected ' : '') + 'tree-row'}
              key={file}
            >
              <span>{index === 0 ? '▾' : 'TS'}</span>
              {file}
            </div>
          ))}
        </aside>

        <section className="editor">
          <div className="tab">users.ts</div>
          <div className="code">
            {codeLines.map((line, index) => (
              <div className={index === 5 ? 'vuln-line' : ''} key={index}>
                <em>{index + 1}</em>
                <code>{line || ' '}</code>
                {index === 5 && <span className="tag">SQL 삽입 가능성</span>}
              </div>
            ))}
          </div>
        </section>

        <aside className="settings">
          <h3>분석 범위 및 설정</h3>

          <label>감지할 언어</label>
          <div className="select">TS　TypeScript</div>

          <label>분석 범위</label>
          <div className="select">현재 파일</div>

          <label>보안 정책</label>
          <div className="select">사용</div>

          <div className="estimate">
            <span>예상 분석 시간</span>
            <b>약 45초</b>
            <small>17개 파일 · 1879줄</small>
          </div>

          <button
            className="dark-btn wide"
            onClick={() => setPage('result')}
          >
            취약점 분석 시작
          </button>
        </aside>
      </div>

      <div className="analysis-log">
        <div>
          <b>● 분석 실행 중</b>
          <span>64%</span>
        </div>
        <progress value="64" max="100" />
        <code>
          파일 중　src/routes/users.ts
          <br />
          24:33:21 패턴 SQL 쿼리 발견
          <br />
          24:33:22 다른 유형 규칙식 검토
          <br />
          24:33:23 AI 컨텍스트 개선 중...
        </code>
      </div>
    </main>
  );
}
