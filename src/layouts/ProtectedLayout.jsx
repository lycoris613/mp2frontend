import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';

export default function ProtectedLayout({ currentUser = null, onLogout }) {
  return (
    <div className="app">
      <Sidebar currentUser={currentUser} onLogout={onLogout} />
      <Outlet />
    </div>
  );
}