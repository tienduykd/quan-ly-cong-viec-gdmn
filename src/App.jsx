import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import CreateTaskModal from './components/CreateTaskModal';
import TaskDetailModal from './components/TaskDetailModal';
import UserProfileModal from './components/UserProfileModal';

import DashboardView from './views/DashboardView';
import TasksView from './views/TasksView';
import StatsView from './views/StatsView';
import UsersView from './views/UsersView';
import ZaloView from './views/ZaloView';

import { getAuthToken, getStoredUser, setAuthToken, setStoredUser, apiRequest } from './api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasksScope, setTasksScope] = useState('all');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Validate current token
    const token = getAuthToken();
    if (token) {
      apiRequest('/auth/me')
        .then(user => {
          setCurrentUser(user);
          setStoredUser(user);
        })
        .catch(() => {
          handleLogout();
        });
    }
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setStoredUser(null);
    setCurrentUser(null);
  };

  const handleTaskCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleTaskUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleViewTasksTab = (scope = 'all') => {
    setTasksScope(scope);
    setActiveTab('tasks');
  };

  if (!currentUser) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-teal-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={currentUser}
        onLogout={handleLogout}
        onOpenCreateTask={() => setIsCreateOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            key={`dashboard-${refreshKey}`}
            user={currentUser}
            onSelectTask={(id) => setSelectedTaskId(id)}
            onOpenCreateTask={() => setIsCreateOpen(true)}
            onViewTasksTab={handleViewTasksTab}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView
            key={`tasks-${refreshKey}`}
            user={currentUser}
            initialScope={tasksScope}
            onSelectTask={(id) => setSelectedTaskId(id)}
            onOpenCreateTask={() => setIsCreateOpen(true)}
          />
        )}

        {activeTab === 'stats' && (
          <StatsView
            key={`stats-${refreshKey}`}
            user={currentUser}
          />
        )}

        {activeTab === 'users' && (
          <UsersView
            key={`users-${refreshKey}`}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'zalo' && (
          <ZaloView
            key={`zalo-${refreshKey}`}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400">
          <p>
            Phần mềm hỗ trợ quản lý công việc - Ngành Giáo dục Mầm non (GDMN) © 2026
          </p>
          <p className="text-[11px] mt-0.5 text-slate-400">
            Giám đốc Chương trình đào tạo: <strong>TS. Đặng Út Phượng</strong> • Hotline hỗ trợ kỹ thuật nội bộ
          </p>
        </div>
      </footer>

      {/* Modals */}
      {isCreateOpen && (
        <CreateTaskModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onTaskCreated={handleTaskCreated}
          currentUser={currentUser}
        />
      )}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          currentUser={currentUser}
          onTaskUpdated={handleTaskUpdated}
        />
      )}

      {isProfileOpen && (
        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={currentUser}
          onProfileUpdated={() => {
            apiRequest('/auth/me').then(u => {
              setCurrentUser(u);
              setStoredUser(u);
            });
          }}
        />
      )}
    </div>
  );
}
