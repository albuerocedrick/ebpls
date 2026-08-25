// src/layouts/ApplicantLayout.jsx

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import BottomNav from '../components/layout/BottomNav';
import DraftResumePrompt from '../components/shared/DraftResumePrompt';
import LogoutConfirmModal from '../components/shared/LogoutConfirmModal';
import useApplicationStore from '../store/applicationStore';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';
import NotificationBell from '../components/shared/NotificationBell';
import NotificationPopup from '../components/shared/NotificationPopup';
import apiClient from '../utils/apiClient';
import { API_ENDPOINTS, ROUTES } from '../utils/constants';
import useAuth from '../hooks/useAuth';
import logo from '../assets/logo.png';

const ApplicantLayout = () => {
  const { logout } = useAuth();
  const user = useAuthStore((s) => s.user);

  // Draft detection logic
  const draft_id = useApplicationStore((state) => state.draft_id);
  const loadDraft = useApplicationStore((state) => state.loadDraft);
  const { startPolling, stopPolling } = useNotificationStore();
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const fetchExistingDraft = async () => {
      try {
        // Fetch draft from Postgres via API
        const response = await apiClient.get(API_ENDPOINTS.APPLICATIONS_DRAFTS);
        
        // Backend now returns data: null if no draft exists.
        // We only open the prompt if data actually contains a draft payload.
        if (response && response.data && response.data.form_data) {
          loadDraft(response.data.draft_id, response.data.current_step, response.data.form_data);
          setIsPromptOpen(true);
        }
      } catch (error) {
        console.error('[Layout] Failed to check draft status:', error.message);
      }
    };

    // Only check the server once on mount if we don't have a draft in memory.
    // This avoids re-triggering if the user discards the draft.
    if (!draft_id) {
      fetchExistingDraft();
    }

    startPolling();
    return () => stopPolling();
  }, []); // Run only once on mount

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout(ROUTES.REGISTER);
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">

      {/* Logout confirmation modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutModal(false)}
      />

      <NotificationPopup />

      {/* Universal Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          {/* Municipal seal rather than an "eB" monogram — the same asset the
              sidebar and auth screens use, so the brand reads identically
              across every portal. */}
          <div className="flex h-9 w-9 items-center justify-center">
            <img
              src={logo}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight tracking-tight text-zinc-900">BOSS</span>
            <span className="font-mono text-[10px] leading-tight tracking-[0.08em] text-zinc-500 uppercase">
              Municipality of Liliw
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 pr-1">
          {/* User Profile */}
          <div className="flex items-center gap-2 p-1 pr-3">
            <div className="h-8 w-8 overflow-hidden rounded-full border border-zinc-200">
              <img 
                src="data:image/svg+xml,%3Csvg viewBox='0 0 36 36' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='36' height='36' fill='%23E4E6EB'/%3E%3Cpath d='M18 21.5C14.4101 21.5 11.5 18.5899 11.5 15C11.5 11.4101 14.4101 8.5 18 8.5C21.5899 8.5 24.5 11.4101 24.5 15C24.5 18.5899 21.5899 21.5 18 21.5ZM18 24C23.5228 24 28 28.4772 28 34H8C8 28.4772 12.4772 24 18 24Z' fill='%23BCC0C4'/%3E%3C/svg%3E" 
                alt="Profile" 
                className="h-full w-full object-cover" 
              />
            </div>
            <div className="hidden flex-col pl-1 text-left sm:flex">
              <span className="max-w-[150px] truncate text-[11px] leading-tight text-zinc-500 capitalize">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Applicant'}
              </span>
              <span className="mt-0.5 max-w-[150px] truncate text-[13px] font-medium leading-none text-zinc-900" title={user?.email}>
                {user?.email || 'User'}
              </span>
            </div>
          </div>

          <NotificationBell />

          <button 
            id="applicant-logout-btn"
            onClick={() => setShowLogoutModal(true)}
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors duration-200 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
            aria-label="Log out"
            title="Sign out"
          >
            <LogOut size={17} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto pb-[var(--bottom-nav-height,4rem)]">
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
          
          {/* Autosave Resume Prompt */}
          <DraftResumePrompt 
            isOpen={isPromptOpen} 
            onClose={() => setIsPromptOpen(false)} 
          />

          {/* Child Pages (Dashboard, UAF Wizard, Status Tracker) */}
          <Outlet />
          
        </div>
      </main>

      {/* Official Bottom Navigation */}
      <BottomNav />

    </div>
  );
};

export default ApplicantLayout;