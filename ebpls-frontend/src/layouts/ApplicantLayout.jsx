// src/layouts/ApplicantLayout.jsx

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import BottomNav from '../components/layout/BottomNav';
import DraftResumePrompt from '../components/shared/DraftResumePrompt';
import useApplicationStore from '../store/applicationStore';
import apiClient from '../utils/apiClient';
import { API_ENDPOINTS } from '../utils/constants';

const ApplicantLayout = () => {
  const navigate = useNavigate();

  // Draft detection logic
  const draft_id = useApplicationStore((state) => state.draft_id);
  const loadDraft = useApplicationStore((state) => state.loadDraft);
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  useEffect(() => {
    const fetchExistingDraft = async () => {
      try {
        // Fetch draft from Postgres via API
        const response = await apiClient.get(API_ENDPOINTS.APPLICATIONS_DRAFTS);
        
        // If successful, load into Zustand and trigger prompt
        if (response?.data) {
          loadDraft(response.data.draft_id, response.data.current_step, response.data.form_data);
          setIsPromptOpen(true);
        }
      } catch (error) {
        // A 404 means no draft exists, which is normal. Ignore it.
        if (!error.message.includes('404')) {
          console.error('[Layout] Failed to check draft status:', error.message);
        }
      }
    };

    // Only run if Zustand doesn't already have a draft loaded
    if (!draft_id) {
      fetchExistingDraft();
    } else {
      setIsPromptOpen(true);
    }
  }, [draft_id, loadDraft]);

  const handleLogout = () => {
    // In Phase 2, this will clear authStore and tokens
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[hsl(var(--color-bg,0,0%,98%))]">
      
      {/* Universal Top Header */}
      <header className="sticky top-0 z-40 bg-[hsl(var(--color-surface,0,0%,100%))] border-b border-[hsl(var(--color-border,0,0%,90%))] px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded bg-accent text-white flex items-center justify-center text-sm font-bold">eB</span>
          <h1 className="text-lg font-bold text-[hsl(var(--color-text,0,0%,10%))]">eBPLS Liliw</h1>
        </div>
        <button 
          onClick={handleLogout} 
          className="p-2 text-[hsl(var(--color-text-muted,0,0%,40%))] hover:text-red-600 transition-colors"
          title="Sign Out"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Main Scrollable Content */}
      {/* The padding-bottom here MUST match your --bottom-nav-height to prevent hidden content */}
      <main className="flex-1 overflow-y-auto pb-[var(--bottom-nav-height,4rem)]">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          
          {/* Autosave Resume Prompt */}
          <DraftResumePrompt 
            isOpen={isPromptOpen} 
            onClose={() => setIsPromptOpen(false)} 
          />

          {/* Child Pages (Dashboard, UAF Wizard, Status Tracker) */}
          <Outlet />
          
        </div>
      </main>

      {/* Your Official Template Component */}
      <BottomNav />

    </div>
  );
};

export default ApplicantLayout;