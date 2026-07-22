// src/layouts/ApplicantLayout.jsx

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import BottomNav from '../components/layout/BottomNav';
import DraftResumePrompt from '../components/shared/DraftResumePrompt';
import LogoutConfirmModal from '../components/shared/LogoutConfirmModal';
import useApplicationStore from '../store/applicationStore';
import apiClient from '../utils/apiClient';
import { API_ENDPOINTS, ROUTES } from '../utils/constants';
import useAuth from '../hooks/useAuth';

const ApplicantLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

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
        <button 
          id="applicant-logout-btn"
          onClick={() => setShowLogoutModal(true)}
          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
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