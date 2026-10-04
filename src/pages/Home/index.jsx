import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import HeroBanner from './components/HeroBanner';
import MetricCard from './components/MetricCard';
import RecentAnalysisList from './components/RecentAnalysisList';
import VulnerabilityPieChart from './components/VulnerabilityPieChart';
import { useDashboardStore } from '../../stores/dashboardStore';
import { PAGES } from '../../constants/navigation';

function useSafeNavigate() {
  try {
    return useNavigate();
  } catch (e) {
    return null;
  }
}

/**
 * [SCR-001] 홈 대시보드 화면 (백엔드 실데이터 연동)
 */
export default function HomePage({ setPage, currentUser, onLogin, onLogout }) {
  const navigate = useSafeNavigate();
  const { summary, fetchSummary, isLoading, error } = useDashboardStore();

  useEffect(() => {
    fetchSummary().catch((e) => console.error('홈 대시보드 데이터 로드 실패:', e));
  }, [fetchSummary]);

  const handleStartAnalyze = () => {
    if (setPage) setPage(PAGES.ANALYZE);
    if (navigate) navigate('/analysis/new');
  };

  const metrics = [
    {
      id: 'total-analyses',
      label: '전체 분석 건수',
      value: `${summary?.totalAnalyses ?? 0}건`,
      caption: 'Spring Boot 백엔드 누적 분석',
      tone: 'neutral',
    },
    {
      id: 'total-findings',
      label: '탐지된 취약점',
      value: `${summary?.totalFindings ?? 0}건`,
      caption: '즉시 조치 또는 검토 필요',
      tone: summary?.totalFindings > 0 ? 'warn' : 'neutral',
    },
    {
      id: 'critical-findings',
      label: '치명적(CRITICAL) 취약점',
      value: `${summary?.criticalCount ?? 0}건`,
      caption: 'SQL Injection 등 긴급 대응',
      tone: summary?.criticalCount > 0 ? 'danger' : 'neutral',
    },
    {
      id: 'high-findings',
      label: '높음(HIGH) 취약점',
      value: `${summary?.highCount ?? 0}건`,
      caption: '하드코딩된 비밀정보 등',
      tone: summary?.highCount > 0 ? 'warn' : 'neutral',
    },
  ];

  return (
    <main className="content">
      <PageHeader
        currentUser={currentUser}
        onLogin={onLogin}
        onLogout={onLogout}
      />

      <div className="page-pad">
        <HeroBanner onStart={handleStartAnalyze} />

        {error && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '16px' }}>
            대시보드 통계 조회 오류: {error}
          </div>
        )}

        <section className="stats">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.id}
              label={metric.label}
              value={metric.value}
              caption={metric.caption}
              tone={metric.tone}
            />
          ))}
        </section>

        <div className="home-grid">
          <RecentAnalysisList
            projects={summary?.recentProjects || []}
            onSelectProject={(proj) => {
              const target = proj.id;
              if (navigate) navigate(`/analyses?analysisId=${target}`);
            }}
          />
          <VulnerabilityPieChart
            vulnTypeMap={summary?.vulnTypeMap || {}}
          />
        </div>
      </div>
    </main>
  );
}