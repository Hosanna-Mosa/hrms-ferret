import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import DailyUpdates from './pages/DailyUpdates';
import Leave from './pages/Leave';
import TasksSprint from './pages/TasksSprint';
import Onboarding from './pages/Onboarding';
import Offboarding from './pages/Offboarding';
import Documents from './pages/Documents';
import Announcements from './pages/Announcements';
import Performance from './pages/Performance';
import Training from './pages/Training';
import Profile from './pages/Profile';
import AdminManagers from './pages/AdminManagers';
import AdminEmployees from './pages/AdminEmployees';
import EmployeeDetail from './pages/EmployeeDetail';
import ManagerDetail from './pages/ManagerDetail';
import AdminDepartments from './pages/AdminDepartments';
import ProjectsSprints from './pages/ProjectsSprints';
import DepartmentDetail from './pages/DepartmentDetail';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontWeight: 'bold' }}>Loading Ferret PeopleOS...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const RoleRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontWeight: 'bold' }}>Loading...</div>;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  
  return <Dashboard />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontWeight: 'bold' }}>Loading...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />

          {/* Private Routes wrapped in Layout */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard Redirect */}
            <Route index element={<DashboardRedirect />} />
            
            {/* Employee/Manager Shared Roles */}
            <Route path="attendance" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'HR', 'SuperAdmin']}><Attendance /></RoleRoute>} />
            <Route path="daily-updates" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'SuperAdmin']}><DailyUpdates /></RoleRoute>} />
            <Route path="leave" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'HR', 'SuperAdmin']}><Leave /></RoleRoute>} />
            <Route path="tasks" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'SuperAdmin']}><TasksSprint /></RoleRoute>} />
            <Route path="onboarding" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'HR', 'SuperAdmin']}><Onboarding /></RoleRoute>} />
            <Route path="offboarding" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'HR', 'SuperAdmin']}><Offboarding /></RoleRoute>} />
            <Route path="documents" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'HR', 'SuperAdmin']}><Documents /></RoleRoute>} />
            <Route path="announcements" element={<RoleRoute allowedRoles={['Employee', 'SuperAdmin']}><Announcements /></RoleRoute>} />
            <Route path="performance" element={<RoleRoute allowedRoles={['Employee', 'SuperAdmin']}><Performance /></RoleRoute>} />
            <Route path="training" element={<RoleRoute allowedRoles={['Employee', 'SuperAdmin']}><Training /></RoleRoute>} />
            <Route path="profile" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'HR', 'SuperAdmin']}><Profile /></RoleRoute>} />
            
            {/* Standalone Administrative Roles */}
            <Route 
              path="admin/managers" 
              element={
                <RoleRoute allowedRoles={['HR', 'SuperAdmin']}>
                  <AdminManagers />
                </RoleRoute>
              } 
            />
            <Route 
              path="admin/employees" 
              element={
                <RoleRoute allowedRoles={['HR', 'Manager', 'SuperAdmin']}>
                  <AdminEmployees />
                </RoleRoute>
              } 
            />
            <Route 
              path="employee-detail/:employeeId" 
              element={
                <RoleRoute allowedRoles={['HR', 'Manager', 'SuperAdmin']}>
                  <EmployeeDetail />
                </RoleRoute>
              } 
            />
            <Route 
              path="manager-detail/:managerId" 
              element={
                <RoleRoute allowedRoles={['HR', 'SuperAdmin']}>
                  <ManagerDetail />
                </RoleRoute>
              } 
            />
            <Route 
              path="admin/departments" 
              element={
                <RoleRoute allowedRoles={['HR', 'SuperAdmin']}>
                  <AdminDepartments />
                </RoleRoute>
              } 
            />
            <Route 
              path="projects-sprints" 
              element={
                <RoleRoute allowedRoles={['HR', 'Manager', 'SuperAdmin']}>
                  <ProjectsSprints />
                </RoleRoute>
              } 
            />
            <Route 
              path="department-detail/:departmentId" 
              element={
                <RoleRoute allowedRoles={['HR', 'SuperAdmin']}>
                  <DepartmentDetail />
                </RoleRoute>
              } 
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
