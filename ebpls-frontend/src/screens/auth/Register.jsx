import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, CheckCircle2, User, Mail, Lock, ArrowLeft } from 'lucide-react';

import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import useAuth from '../../hooks/useAuth';
import { ROUTES } from '../../utils/constants';

function validate({ firstName, lastName, email, password, confirmPassword }) {
  const errors = {};
  if (!firstName.trim()) errors.firstName = 'First name is required.';
  if (!lastName.trim()) errors.lastName = 'Last name is required.';
  if (!email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!email.includes('@') || !email.includes('.')) {
    errors.email = 'Enter a valid email address.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }
  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return errors;
}

const INITIAL_FIELDS = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const Register = () => {
  const { register, isLoading } = useAuth();
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');

  const set = useCallback(
    (field) => (e) => setFields((prev) => ({ ...prev, [field]: e.target.value })),
    [],
  );

  const blur = useCallback(
    (field) => () => setTouched((prev) => ({ ...prev, [field]: true })),
    [],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, email: true, password: true, confirmPassword: true });
    const validationErrors = validate(fields);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const result = await register({
        firstName: fields.firstName.trim(),
        lastName: fields.lastName.trim(),
        email: fields.email.trim(),
        password: fields.password,
      });
      if (result) {
        setSuccessEmail(fields.email.trim());
        setIsSuccess(true);
      }
    } catch { /* surfaced as a toast by useAuth */ }
  };

  const getError = (field) => (touched[field] ? errors[field] : undefined);

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-6 p-7 sm:p-8">
        {/* Neutral confirmation rather than a green circle: the landing page has
            no accent hue, and a filled success badge would be the only
            saturated element in the whole flow. */}
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-900">
          <CheckCircle2 size={20} className="text-white" />
        </div>
        <div>
          <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
            Account created
          </span>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">
            Check your email
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            We&apos;ve sent a verification link to{' '}
            <strong className="font-medium text-zinc-900">{successEmail}</strong>
            . Open it to activate your account.
          </p>
        </div>
        <div className="h-px w-full bg-zinc-200" />
        <Link
          to={ROUTES.LOGIN}
          className="inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-zinc-800"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7 p-7 sm:p-8" noValidate>
      {/* Header */}
      <div>
        <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
          New account
        </span>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Register to submit and track business permit applications.
        </p>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            placeholder="Juan"
            value={fields.firstName}
            onChange={set('firstName')}
            onBlur={blur('firstName')}
            error={getError('firstName')}
            required
            leftElement={<User size={15} className="text-zinc-400" />}
          />
          <Input
            label="Last name"
            placeholder="dela Cruz"
            value={fields.lastName}
            onChange={set('lastName')}
            onBlur={blur('lastName')}
            error={getError('lastName')}
            required
          />
        </div>

        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={fields.email}
          onChange={set('email')}
          onBlur={blur('email')}
          error={getError('email')}
          required
          leftElement={<Mail size={15} className="text-zinc-400" />}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          value={fields.password}
          onChange={set('password')}
          onBlur={blur('password')}
          error={getError('password')}
          required
          leftElement={<Lock size={15} className="text-zinc-400" />}
        />

        <Input
          label="Confirm password"
          type="password"
          placeholder="Repeat your password"
          value={fields.confirmPassword}
          onChange={set('confirmPassword')}
          onBlur={blur('confirmPassword')}
          error={getError('confirmPassword')}
          required
          leftElement={<Lock size={15} className="text-zinc-400" />}
        />
      </div>

      {/* Submit */}
      <Button
        variant="primary"
        fullWidth
        size="lg"
        type="submit"
        leftIcon={<UserPlus size={16} />}
        isLoading={isLoading}
        className="font-semibold"
      >
        Create account
      </Button>

      {/* Login link */}
      <Link
        to={ROUTES.LOGIN}
        className="group inline-flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors duration-200 hover:text-zinc-900"
      >
        <ArrowLeft
          size={14}
          className="transition-transform duration-300 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none"
        />
        Already have an account? Sign in
      </Link>
    </form>
  );
};

export default Register;
