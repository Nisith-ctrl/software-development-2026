import { NavLink, Outlet } from 'react-router-dom';
import { useHeartRate } from '../../lib/heartRate';

export function AdminLayout() {
  const hr = useHeartRate();
  return (
    <div className="admin">
      <header className="admin-bar">
        <NavLink to="/" className="brand">
          <img src="/icon.svg" alt="" width={32} height={32} />
          <span>LifeSync</span>
        </NavLink>
        <nav className="admin-nav" aria-label="Grown-up area">
          <NavLink to="/admin" end>Overview</NavLink>
          <NavLink to="/admin/routines">Routines</NavLink>
          <NavLink to="/admin/learners">Learners</NavLink>
          <NavLink to="/admin/data">Progress data</NavLink>
          <NavLink to="/admin/wearable">
            Wearable {hr.source !== 'none' && <span className="hr-pill">♥ {hr.bpm ?? '--'}</span>}
          </NavLink>
        </nav>
      </header>
      <main className="page admin-main">
        <Outlet />
      </main>
    </div>
  );
}
