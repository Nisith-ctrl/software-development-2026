import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HeartRateProvider } from './lib/heartRate';
import { StoreProvider } from './lib/store';
import { AdminLayout } from './pages/admin/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { LearnerEdit, LearnerList } from './pages/admin/Learners';
import { Overview } from './pages/admin/Overview';
import { RoutineEdit, RoutineList } from './pages/admin/Routines';
import { Wearable } from './pages/admin/Wearable';
import { Home } from './pages/Home';
import { LearnerHome } from './pages/LearnerHome';
import { Player } from './pages/Player';

export function App() {
  return (
    <StoreProvider>
      <HeartRateProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn/:learnerId" element={<LearnerHome />} />
            <Route path="/learn/:learnerId/play/:routineId" element={<Player />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Overview />} />
              <Route path="routines" element={<RoutineList />} />
              <Route path="routines/new" element={<RoutineEdit key="new" />} />
              <Route path="routines/:routineId" element={<RoutineEdit />} />
              <Route path="learners" element={<LearnerList />} />
              <Route path="learners/new" element={<LearnerEdit key="new" />} />
              <Route path="learners/:learnerId" element={<LearnerEdit />} />
              <Route path="data" element={<Dashboard />} />
              <Route path="wearable" element={<Wearable />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </HeartRateProvider>
    </StoreProvider>
  );
}
