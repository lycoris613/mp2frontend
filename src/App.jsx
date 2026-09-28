import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Analyze from './pages/Analyze';
import Result from './pages/Result';

export default function App() {
  const [page, setPage] = useState('home');

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} />

      {page === 'home' ? (
        <Home setPage={setPage} />
      ) : page === 'analyze' ? (
        <Analyze setPage={setPage} />
      ) : (
        <Result />
      )}
    </div>
  );
}
