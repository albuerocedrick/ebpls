/**
 * VerifySuccess.jsx
 * Shown after an email verification link is opened.
 */
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { ROUTES } from '../../utils/constants';

const VerifySuccess = () => {
  return (
    <div className="flex flex-col gap-6 p-7 duration-500 animate-in fade-in sm:p-8">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-900">
        <CheckCircle2 size={20} className="text-white" />
      </div>

      <div>
        <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
          Email verified
        </span>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">
          Your account is active
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          You can now sign in to file an application, track its progress, and
          settle assessments online.
        </p>
      </div>

      <div className="h-px w-full bg-zinc-200" />

      <Link
        to={ROUTES.LOGIN}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-zinc-800"
      >
        Continue to sign in
        <ArrowRight
          size={16}
          className="transition-transform duration-300 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </div>
  );
};

export default VerifySuccess;
