/**
 * AuthLayout.jsx
 * Split-screen auth layout: a dark municipal panel on the left, the form on the
 * right. All authentication logic is untouched; only presentation here.
 *
 * @policy  The left panel is a flat zinc-950 field, not a photograph. The image
 *          it previously carried sat at -z-20, behind the panel's own
 *          background, so it never actually rendered; a plain dark column also
 *          reads cleaner beside a white form.
 * @policy  No non-ASCII bytes in this file. The em-dash and copyright glyphs are
 *          written as &mdash; and &copy; because as raw bytes they were being
 *          double-encoded and showed as mojibake in the panel.
 */

import { Outlet, Navigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { ROUTES, ROLE_DASHBOARDS } from '../utils/constants';
import logo from '../assets/logo.png';

/** Three assurances, phrased as on the landing page. */
const ASSURANCES = [
  'Paperless online filing, 24/7',
  'Real-time status tracking',
  'Automated assessment and digital receipt',
];

const AuthLayout = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const role = user?.roleName;

  if (isAuthenticated) {
    const destination = ROLE_DASHBOARDS[role] ?? ROUTES.HOME;
    return <Navigate to={destination} replace />;
  }

  return (
    <div
      // `data-neutral-focus` matches the landing page: the dark panel makes the
      // global blue focus ring both off-palette and low contrast.
      data-neutral-focus
      className="flex min-h-screen bg-white font-sans text-zinc-900 selection:bg-zinc-900 selection:text-white"
    >
      {/* Left panel. Flat dark field, hidden below lg. */}
      <div className="relative hidden bg-zinc-950 lg:flex lg:w-[46%] xl:w-[42%]">
        <div className="relative flex w-full flex-col justify-between p-10 xl:p-12">
          <Link
            to={ROUTES.HOME}
            className="inline-flex w-fit items-center gap-2.5 transition-opacity duration-200 hover:opacity-80"
          >
            <img
              src={logo}
              alt=""
              aria-hidden="true"
              className="h-8 w-8 rounded-full object-contain"
            />
            <span className="text-sm font-semibold tracking-tight text-white">
              BOSS
            </span>
          </Link>

          {/* Vertically: a flex-1 row centres the copy against the panel, with
              the wordmark and footer pinned to the edges (the footer carries
              min-h-8 so it balances the 32px logo row above).
              Horizontally: w-full, not max-w-md - the cap left the block 48px
              from the left but 109px from the right inside the padded column.
              Filling the width makes the gutters symmetric while keeping the
              copy's left edge aligned with the wordmark and footer. */}
          <div className="flex flex-1 items-center py-10">
            <div className="w-full">
              <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] text-zinc-400 uppercase">
                <span
                  aria-hidden="true"
                  className="h-px w-8 flex-none bg-zinc-600"
                />
                Municipality of Liliw, Laguna
              </p>

              <h2 className="mt-6 text-3xl leading-[1.1] font-semibold tracking-tight text-balance text-white xl:text-4xl">
                Business permits, filed and tracked online.
              </h2>

              <p className="mt-5 max-w-md text-sm leading-relaxed text-zinc-400">
                Register a new business, renew a permit, or check where your
                application stands &mdash; without queueing at the municipal hall.
              </p>

              {/* Hairline-separated rows rather than dotted bullets, matching the
                  hero's assurances strip. Solid zinc-800 rules now that the panel
                  is a flat field: translucent white/15 was tuned for a photo
                  underneath and reads inconsistently on plain zinc-950. */}
              <ul className="mt-8 flex flex-col border-t border-zinc-800">
                {ASSURANCES.map((item) => (
                  <li
                    key={item}
                    className="border-b border-zinc-800 py-3 text-sm text-zinc-300 last:border-b-0"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex min-h-8 items-end justify-between gap-4 font-mono text-[10px] tracking-[0.14em] text-zinc-500 uppercase">
            <span>Compliant with RA 11032</span>
            <span>&copy; {new Date().getFullYear()} Bayan ng Liliw</span>
          </div>
        </div>
      </div>

      {/* Right panel - form. */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        {/* Mobile wordmark: the left panel is hidden below lg, so the form would
            otherwise open with no indication of whose portal this is. */}
        <Link
          to={ROUTES.HOME}
          className="mb-8 inline-flex items-center gap-2.5 lg:hidden"
        >
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            className="h-8 w-8 rounded-full object-contain"
          />
          <span className="text-sm font-semibold tracking-tight text-zinc-900">
            BOSS
          </span>
        </Link>

        <div className="w-full max-w-[400px]">
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <Outlet />
          </div>

          {/* Way back to the public page. Someone who reaches sign-in by
              accident previously had no exit. */}
          <Link
            to={ROUTES.HOME}
            className="group mt-6 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase transition-colors duration-200 hover:text-zinc-900"
          >
            <ArrowLeft
              className="h-3 w-3 transition-transform duration-300 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            />
            Back to the public site
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
