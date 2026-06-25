/**
 * AuthLayout.jsx
 * Split-screen auth layout — left branding panel + right form panel.
 * Everything centered and aligned.
 */

import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Shield, FileCheck, Banknote } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { ROUTES, ROLE_DASHBOARDS } from '../utils/constants';
import logo from '../assets/logo.png';

const AuthLayout = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const role = user?.roleName;

  if (isAuthenticated) {
    const destination = ROLE_DASHBOARDS[role] ?? ROUTES.HOME;
    return <Navigate to={destination} replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-gray-900 relative overflow-hidden items-center justify-center">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        
        {/* Gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-gray-900 to-transparent" />

        {/* Centered content */}
        <div className="relative z-10 px-10 xl:px-14 text-center flex flex-col items-center gap-10">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-2.5 shadow-2xl flex items-center justify-center transition-transform hover:scale-105 duration-300">
              <img src={logo} alt="BOSS Logo" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">BOSS</h1>
              <p className="text-xs text-gray-400 font-medium mt-1">Municipality of Liliw, Laguna</p>
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
              Business Permits<br />Made Simple.
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
              Apply, track, and manage your business permits online. No more long queues.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 w-full max-w-xs">
            {[
              { icon: <FileCheck size={16} />, text: 'Submit applications online 24/7' },
              { icon: <Shield size={16} />, text: 'Real-time status tracking' },
              { icon: <Banknote size={16} />, text: 'Pay via OTC or online (GCash/Card)' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 shrink-0">
                  {item.icon}
                </div>
                <span className="text-sm text-gray-300 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Municipality of Liliw
          </p>
        </div>
      </div>

      {/* Right Panel — Form (centered) */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
        {/* Mobile logo (shown only on small screens) */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-blue-900/5 p-2 border border-gray-100">
            <img src={logo} alt="BOSS Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-lg font-extrabold text-gray-900 tracking-tight block leading-tight">BOSS</span>
            <span className="text-[10px] text-gray-400 font-medium">Municipality of Liliw</span>
          </div>
        </div>

        {/* Form card */}
        <div className="w-full max-w-[420px] bg-white rounded-3xl border border-gray-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="mt-8 text-[11px] text-gray-400 text-center">
          Electronic Business Permits & Licensing System
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;
