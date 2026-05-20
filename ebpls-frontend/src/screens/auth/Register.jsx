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
    } catch (err) { /* toasted by useAuth */ }
  };

  const getError = (field) => (touched[field] ? errors[field] : undefined);

  if (isSuccess) {
    return (
      <div className="p-8 sm:p-10 flex flex-col gap-6 items-center text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-gray-900">Check your email</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            We&apos;ve sent a verification link to<br />
            <strong className="text-gray-900">{successEmail}</strong>
          </p>
        </div>
        <div className="w-full h-px bg-gray-100 my-2" />
        <Link
          to={ROUTES.LOGIN}
          className="w-full inline-flex items-center justify-center rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-all"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 sm:p-10 flex flex-col gap-8" noValidate>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Register to submit and track business permit applications.
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            placeholder="Juan"
            value={fields.firstName}
            onChange={set('firstName')}
            onBlur={blur('firstName')}
            error={getError('firstName')}
            required
            leftElement={<User size={15} />}
          />
          <Input
            label="Last Name"
            placeholder="dela Cruz"
            value={fields.lastName}
            onChange={set('lastName')}
            onBlur={blur('lastName')}
            error={getError('lastName')}
            required
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={fields.email}
          onChange={set('email')}
          onBlur={blur('email')}
          error={getError('email')}
          required
          leftElement={<Mail size={15} />}
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
          leftElement={<Lock size={15} />}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Repeat your password"
          value={fields.confirmPassword}
          onChange={set('confirmPassword')}
          onBlur={blur('confirmPassword')}
          error={getError('confirmPassword')}
          required
          leftElement={<Lock size={15} />}
        />
      </div>

      {/* Submit */}
      <Button
        variant="primary"
        fullWidth
        size="lg"
        type="submit"
        leftIcon={<UserPlus size={17} />}
        isLoading={isLoading}
      >
        Create Account
      </Button>

      {/* Login link */}
      <div className="text-center">
        <Link
          to={ROUTES.LOGIN}
          className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          Already have an account? Sign in
        </Link>
      </div>
    </form>
  );
};

export default Register;
