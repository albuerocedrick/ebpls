// src/layouts/ApplicantLayout.jsx

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import BottomNav from '../components/layout/BottomNav';
import DraftResumePrompt from '../components/shared/DraftResumePrompt';
import LogoutConfirmModal from '../components/shared/LogoutConfirmModal';
import useApplicationStore from '../store/applicationStore';
import useAuthStore from '../store/authStore';
import apiClient from '../utils/apiClient';
import { API_ENDPOINTS, ROUTES } from '../utils/constants';
import useAuth from '../hooks/useAuth';

const ApplicantLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const user = useAuthStore((s) => s.user);

  // Draft detection logic
  const draft_id = useApplicationStore((state) => state.draft_id);
  const loadDraft = useApplicationStore((state) => state.loadDraft);
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
  }, []); // Run only once on mount

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout(ROUTES.REGISTER);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* Logout confirmation modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutModal(false)}
      />
      
      {/* Universal Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-bold">eB</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-gray-900 leading-tight tracking-tight">BOSS</span>
            <span className="text-[10px] font-medium text-gray-400 leading-tight">Municipality of Liliw</span>
          </div>
        </div>
        <div className="flex items-center gap-2 pr-1">
          {/* User Profile */}
          <div className="flex items-center gap-2 p-1 pr-3 bg-transparent rounded-full">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-black/5">
              <img 
                src="data:image/svg+xml,%3Csvg viewBox='0 0 36 36' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='36' height='36' fill='%23E4E6EB'/%3E%3Cpath d='M18 21.5C14.4101 21.5 11.5 18.5899 11.5 15C11.5 11.4101 14.4101 8.5 18 8.5C21.5899 8.5 24.5 11.4101 24.5 15C24.5 18.5899 21.5899 21.5 18 21.5ZM18 24C23.5228 24 28 28.4772 28 34H8C8 28.4772 12.4772 24 18 24Z' fill='%23BCC0C4'/%3E%3C/svg%3E" 
                alt="Profile" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="hidden sm:flex flex-col text-left pl-1">
              <span className="text-[11px] text-gray-500 font-medium leading-tight capitalize truncate max-w-[150px]">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Applicant'}
              </span>
              <span className="text-[14px] font-bold text-[#050505] leading-none mt-0.5 truncate max-w-[150px]" title={user?.email}>
                {user?.email || 'User'}
              </span>
            </div>
          </div>

          <button 
            id="applicant-logout-btn"
            onClick={() => setShowLogoutModal(true)}
            className="relative w-10 h-10 flex items-center justify-center bg-[#E4E6EB] hover:bg-red-100 hover:text-red-600 text-[#050505] rounded-full transition-colors ml-1"
            aria-label="Log out"
            title="Sign Out"
          >
            <LogOut size={18} strokeWidth={2} />
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