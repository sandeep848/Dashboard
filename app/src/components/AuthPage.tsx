import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Eye, EyeOff, Loader2, MailCheck, ShieldCheck } from 'lucide-react';
import { authApi } from '@/services/api';

interface AuthState {
  token: string;
  user: { email: string; full_name: string };
}

interface AuthPageProps {
  onAuthenticated: (auth: AuthState, rememberMe: boolean) => void;
}

type View =
  | 'login'
  | 'signup'
  | 'verify-email'
  | 'verify-success'
  | 'forgot-password'
  | 'reset-email-sent'
  | 'reset-password'
  | 'reset-success';

const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
  { label: 'One special character', test: (p: string) => /[^\w\s]/.test(p) },
];

const getStrength = (password: string) => {
  const met = passwordRequirements.filter((r) => r.test(password)).length;
  if (met <= 2) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/3' };
  if (met <= 4) return { label: 'Medium', color: 'bg-amber-500', width: 'w-2/3' };
  return { label: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
};

const AuthPage = ({ onAuthenticated }: AuthPageProps) => {
  const [view, setView] = useState<View>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [resendCountdown, setResendCountdown] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  const strength = useMemo(() => getStrength(password), [password]);
  const resetStrength = useMemo(() => getStrength(newPassword), [newPassword]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => setResendCountdown((v) => v - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (view !== 'verify-success' || redirectCountdown <= 0) return;
    const timer = setInterval(() => setRedirectCountdown((v) => v - 1), 1000);
    return () => clearInterval(timer);
  }, [view, redirectCountdown]);

  useEffect(() => {
    if (view === 'verify-success' && redirectCountdown === 0) {
      setView('login');
      setRedirectCountdown(3);
    }
  }, [view, redirectCountdown]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const validateSignup = () => {
    if (!fullName.trim()) return 'Full name is required';
    if (!email.includes('@')) return 'Please enter a valid email address';
    if (password !== confirmPassword) return 'Passwords do not match';
    if (!termsAccepted) return 'You must accept Terms & Conditions';
    const unmet = passwordRequirements.find((r) => !r.test(password));
    if (unmet) return `Password requirement not met: ${unmet.label}`;
    return null;
  };

  const onSignup = async () => {
    clearMessages();
    const validation = validateSignup();
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.signup(email, password, fullName);
      setSuccess(`Verification email sent. Dev token: ${response.verification_token}`);
      setVerificationToken(response.verification_token || '');
      setResendCountdown(60);
      setView('verify-email');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyEmail = async () => {
    clearMessages();
    setLoading(true);
    try {
      await authApi.verifyEmail(email, verificationToken);
      setView('verify-success');
      setSuccess('Your email has been verified successfully!');
      setRedirectCountdown(3);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const onResendVerification = async () => {
    if (resendCountdown > 0) return;
    clearMessages();
    setLoading(true);
    try {
      const response = await authApi.resendVerification(email);
      setSuccess(`Verification resent. Dev token: ${response.verification_token}`);
      setVerificationToken(response.verification_token || '');
      setResendCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  const onLogin = async () => {
    clearMessages();
    setLoading(true);
    try {
      const response = await authApi.login(email, password, rememberMe);
      onAuthenticated({ token: response.token, user: response.user }, rememberMe);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Login failed';
      setError(detail);
      if (detail === 'Email not verified') {
        setSuccess('Please verify your email first. You can resend verification below.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = async () => {
    clearMessages();
    setLoading(true);
    try {
      const response = await authApi.forgotPassword(email);
      setSuccess(`Reset instructions sent. Dev token: ${response.reset_token || '(hidden)'}`);
      setResetToken(response.reset_token || '');
      setResendCountdown(60);
      setView('reset-email-sent');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async () => {
    clearMessages();
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(email, resetToken, newPassword);
      setView('reset-success');
      setSuccess('Your password has been reset successfully.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl shadow-xl border-slate-200/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">LLM Dashboard Authentication</CardTitle>
          <CardDescription>Secure access with email verification and password recovery.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" aria-live="polite">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert aria-live="polite">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {view === 'signup' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="full-name">Full Name</Label>
                <Input id="full-name" autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" aria-label="Toggle password visibility" className="absolute right-3 top-2.5" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div className={`h-full rounded-full ${strength.color} ${strength.width} transition-all`} />
                </div>
                <p className="text-xs mt-1 text-muted-foreground">Strength: {strength.label}</p>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button type="button" aria-label="Toggle confirm password visibility" className="absolute right-3 top-2.5" onClick={() => setShowConfirmPassword((v) => !v)}>
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground border rounded-md p-3 space-y-1">
                <p className="font-medium">Password requirements:</p>
                {passwordRequirements.map((rule) => (
                  <p key={rule.label} className={rule.test(password) ? 'text-emerald-600' : 'text-muted-foreground'}>
                    • {rule.label}
                  </p>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(Boolean(v))} />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the <a href="#" className="text-primary underline">Terms & Conditions</a>
                </Label>
              </div>

              <Button className="w-full" onClick={onSignup} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign Up'}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" disabled>Continue with Google</Button>
                <Button variant="outline" disabled>Continue with GitHub</Button>
              </div>

              <p className="text-sm text-center">
                Already have an account?{' '}
                <button className="text-primary underline" onClick={() => setView('login')}>Log in</button>
              </p>
            </div>
          )}

          {view === 'verify-email' && (
            <div className="space-y-4">
              <div className="text-center">
                <MailCheck className="h-10 w-10 mx-auto text-primary" />
                <p className="mt-2">We've sent a verification email to <strong>{email}</strong>.</p>
                <p className="text-sm text-muted-foreground">Please check your inbox and spam folder.</p>
              </div>
              <div>
                <Label>Verification Token</Label>
                <Input value={verificationToken} onChange={(e) => setVerificationToken(e.target.value)} />
              </div>
              <Button className="w-full" onClick={onVerifyEmail} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify Email'}
              </Button>
              <Button variant="secondary" className="w-full" onClick={onResendVerification} disabled={loading || resendCountdown > 0}>
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Verification Email'}
              </Button>
              <button className="text-sm text-primary underline w-full" onClick={() => setView('signup')}>Change email</button>
            </div>
          )}

          {view === 'verify-success' && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
              <p className="font-medium">Your email has been verified successfully!</p>
              <p className="text-sm text-muted-foreground">Redirecting to login in {redirectCountdown}s...</p>
              <Button onClick={() => setView('login')} className="w-full">Go to Login</Button>
            </div>
          )}

          {view === 'login' && (
            <div className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <Input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" aria-label="Toggle password visibility" className="absolute right-3 top-2.5" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(Boolean(v))} />
                  <Label htmlFor="remember" className="text-sm">Remember Me</Label>
                </div>
                <button className="text-sm text-primary underline" onClick={() => setView('forgot-password')}>Forgot Password?</button>
              </div>

              <Button className="w-full" onClick={onLogin} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log In'}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" disabled>Google</Button>
                <Button variant="outline" disabled>GitHub</Button>
              </div>

              <p className="text-sm text-center">
                Don't have an account?{' '}
                <button className="text-primary underline" onClick={() => setView('signup')}>Sign up</button>
              </p>

              <Button variant="ghost" className="w-full" onClick={onResendVerification} disabled={!email || loading || resendCountdown > 0}>
                {resendCountdown > 0 ? `Resend verification in ${resendCountdown}s` : 'Resend verification email'}
              </Button>
            </div>
          )}

          {view === 'forgot-password' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
              <div>
                <Label>Email Address</Label>
                <Input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button className="w-full" onClick={onForgotPassword} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
              </Button>
              <button className="text-sm text-primary underline w-full" onClick={() => setView('login')}>Back to login</button>
            </div>
          )}

          {view === 'reset-email-sent' && (
            <div className="space-y-4 text-center">
              <MailCheck className="h-10 w-10 mx-auto text-primary" />
              <p>Check your email for reset instructions.</p>
              <Button onClick={() => setView('reset-password')} className="w-full">I have a reset token</Button>
              <Button variant="secondary" onClick={onForgotPassword} className="w-full" disabled={loading || resendCountdown > 0}>
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend reset link'}
              </Button>
              <button className="text-sm text-primary underline" onClick={() => setView('login')}>Back to login</button>
            </div>
          )}

          {view === 'reset-password' && (
            <div className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Reset Token</Label>
                <Input value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
              </div>
              <div>
                <Label>New Password</Label>
                <div className="relative">
                  <Input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <button type="button" className="absolute right-3 top-2.5" onClick={() => setShowNewPassword((v) => !v)}>
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div className={`h-full rounded-full ${resetStrength.color} ${resetStrength.width} transition-all`} />
                </div>
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
              </div>
              <div className="text-xs text-muted-foreground border rounded-md p-3 space-y-1">
                {passwordRequirements.map((rule) => (
                  <p key={rule.label} className={rule.test(newPassword) ? 'text-emerald-600' : 'text-muted-foreground'}>
                    • {rule.label}
                  </p>
                ))}
              </div>
              <Button className="w-full" onClick={onResetPassword} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
              </Button>
            </div>
          )}

          {view === 'reset-success' && (
            <div className="space-y-4 text-center">
              <ShieldCheck className="h-12 w-12 mx-auto text-emerald-500" />
              <p>Your password has been reset successfully.</p>
              <Button className="w-full" onClick={() => setView('login')}>Log in with your new password</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
