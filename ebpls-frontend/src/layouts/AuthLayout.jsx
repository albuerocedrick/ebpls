/**
 * AuthLayout.jsx
 * Split-screen auth layout — left Cula-style municipal branding panel + right form panel.
 * Synced with Landing Page UI while keeping all authentication logic intact.
 */

import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { ShieldCheck, FileCheck, Banknote } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { ROUTES, ROLE_DASHBOARDS } from '../utils/constants';
import logo from '../assets/logo.png';
import liliwHall from '../assets/events/liliw_municipal_hall.jpg';

const AuthLayout = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const role = user?.roleName;

  if (isAuthenticated) {
    const destination = ROLE_DASHBOARDS[role] ?? ROUTES.HOME;
    return <Navigate to={destination} replace />;
  }

  return (
    <div className="min-h-screen flex bg-zinc-50 font-sans text-zinc-900">
      
      {/* Left Panel — Branding & Town Hall Background (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] bg-zinc-950 relative overflow-hidden items-center justify-center border-r border-zinc-800">
        
        {/* Full-width Municipal Hall Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={liliwHall}
            alt="Bahay Pamahalaan ng Liliw"
            className="w-full h-full object-cover opacity-35 filter brightness-90 contrast-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/60" />
        </div>

        {/* Centered Cula-Style Content */}
        <div className="relative z-10 px-10 xl:px-12 flex flex-col items-start text-left gap-8 max-w-lg">
          
          {/* Official Seal Header Badge */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="Bayan ng Liliw Seal" className="w-10 h-10 object-contain rounded-full border border-white/20 p-0.5 bg-white/10" />
            <div>
              <h1 className="text-base font-semibold text-white tracking-tight">Pamahalaang Bayan ng Liliw</h1>
              <p className="text-xs text-zinc-400 font-mono">Municipality of Liliw, Laguna</p>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-[11px] font-mono">
              <span className="font-semibold uppercase tracking-wider text-zinc-300">OFFICIAL PORTAL</span>
            </span>

            <h2 className="text-3xl xl:text-4xl font-semibold text-white tracking-tight leading-[1.12]">
              Business permits,<br />
              <span className="text-zinc-400 font-normal">without the queue.</span>
            </h2>

            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-sm font-normal">
              Register a new business, renew a permit, or track your application status online 24/7.
            </p>
          </div>

          {/* Features Strip */}
          <div className="space-y-2.5 w-full pt-2 border-t border-white/10">
            {[
              { text: 'Paperless online filing 24/7' },
              { text: 'Real-time status tracking & verification' },
              { text: 'Automated tax computation & digital receipt' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-zinc-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* ARTA Badge */}
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] text-zinc-300 bg-white/10 px-3 py-1 rounded-full border border-white/15 leading-none">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="translate-y-[0.5px]">RA 11032 ARTA Compliant System</span>
          </div>

        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center z-10">
          <p className="text-[11px] text-zinc-500 font-mono">
            © {new Date().getFullYear()} Pamahalaang Bayan ng Liliw. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel — Form Container (centered) */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 bg-zinc-50">
        
        {/* Mobile Header (shown on small screens) */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <img src={logo} alt="Bayan ng Liliw Seal" className="w-8 h-8 object-contain rounded-full border border-zinc-200" />
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-zinc-900 text-sm tracking-tight">Liliw e-BPLS</span>
            <span className="text-[10px] font-mono bg-zinc-200/70 text-zinc-700 px-1.5 py-0.5 rounded font-medium">Laguna</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-[400px] bg-white rounded-2xl border border-zinc-200/90 shadow-xs">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="mt-8 text-[11px] text-zinc-400 font-mono text-center">
          Electronic Business Permits & Licensing System v3.6
        </p>
      </div>

    </div>
  );
};

export default AuthLayout;
