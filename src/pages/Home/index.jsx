import PageHeader from '../../components/layout/PageHeader';
import HeroBanner from './components/HeroBanner';
import MetricCard from './components/MetricCard';
import RecentAnalysisList from './components/RecentAnalysisList';
import VulnerabilityPieChart from './components/VulnerabilityPieChart';
import { dashboardMetrics } from '../../data/dashboardData';
import { PAGES } from '../../constants/navigation';

/**
 * [SCR-001] 홈 대시보드 화면
 * 04 UI화면 설계서 3절 및 05 React 컴포넌트 설계서 표 3-1 준수
 */
export default function HomePage({ setPage }) {
  const handleStartAnalyze = () => {
    setPage(PAGES.ANALYZE);
  };

  return (
    <main className="content">
      <PageHeader />

      <div className="page-pad">
        <HeroBanner onStart={handleStartAnalyze} />

        <section className="stats">
          {dashboardMetrics.map((metric) => (
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
          <RecentAnalysisList />
          <VulnerabilityPieChart />
        </div>
      </div>
    </main>
  );
}
