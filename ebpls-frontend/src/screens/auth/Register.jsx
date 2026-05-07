/**
 * Register.jsx
 * Applicant self-registration screen.
 * Phase 2A: Wired to POST /api/auth/register via useAuth hook.
 *
 * Validation (client-side, before submit):
 *   - firstName, lastName required
 *   - email: valid format
 *   - password: min 8 characters
 *   - confirmPassword: must match password
 */

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import useAuth from '../../hooks/useAuth';
import { ROUTES } from '../../utils/constants';

// =========================================
// Validation
// =========================================
function validate({ firstName, lastName, email, password, confirmPassword }) {
  const errors = {};

  if (!firstName.trim())  errors.firstName = 'First name is required.';
  if (!lastName.trim())   errors.lastName  = 'Last name is required.';

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

// =========================================
// Component
// =========================================
const INITIAL_FIELDS = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const Register = () => {
  const { register, isLoading } = useAuth();

  const [fields, setFields]   = useState(INITIAL_FIELDS);
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({});

  const set = useCallback(
    (field) => (e) =>
      setFields((prev) => ({ ...prev, [field]: e.target.value })),
    [],
  );

  const blur = useCallback(
    (field) => () => setTouched((prev) => ({ ...prev, [field]: true })),
    [],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields touched so errors show on submit attempt.
    setTouched({ firstName: true, lastName: true, email: true, password: true, confirmPassword: true });

    const validationErrors = validate(fields);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    await register({
      firstName: fields.firstName.trim(),
      lastName:  fields.lastName.trim(),
      email:     fields.email.trim(),
      password:  fields.password,
    });
  };

  // Re-validate on every field change once the user has touched that field.
  const getError = (field) => (touched[field] ? errors[field] : undefined);

  return (
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-[hsl(var(--color-text))]">Create Account</h1>
        <p className="text-sm text-[hsl(var(--color-text-muted))]">
          Register to submit and track business permit applications.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            placeholder="Juan"
            value={fields.firstName}
            onChange={set('firstName')}
            onBlur={blur('firstName')}
            error={getError('firstName')}
            required
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
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Repeat password"
          value={fields.confirmPassword}
          onChange={set('confirmPassword')}
          onBlur={blur('confirmPassword')}
          error={getError('confirmPassword')}
          required
        />
      </div>

      <Button
        variant="primary"
        fullWidth
        type="submit"
        leftIcon={<UserPlus size={16} />}
        isLoading={isLoading}
      >
        Create Account
      </Button>

      <div className="border-t border-border pt-4 text-center text-sm text-[hsl(var(--color-text-muted))]">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="text-accent font-medium hover:opacity-80 transition-opacity">
          Sign in
        </Link>
      </div>
    </form>
  );
};

export default Register;
