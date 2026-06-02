import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const PasswordResetPage = () => {
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // --- Request reset (no token) ---
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [devLink, setDevLink] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email address.'); return; }
    setIsLoading(true);
    const result = await resetPassword(email);
    if (result.success) {
      setIsSent(true);
      if (result.resetUrl) setDevLink(result.resetUrl);
      toast.success('Reset link generated.');
    } else {
      toast.error(result.error);
    }
    setIsLoading(false);
  };

  // --- Set new password (has token) ---
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { toast.error('Passwords do not match.'); return; }
    setIsResetting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to reset password.'); return; }
      setResetDone(true);
      toast.success('Password updated! You can now log in.');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Reset Password | Starks Global Group</title>
      </Helmet>
      <Header />
      <main className="flex-grow flex items-center justify-center p-4 py-24">
        <div className="w-full max-w-md saas-panel p-8 md:p-10">
          {token ? (
            /* ── Set new password ── */
            resetDone ? (
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">Password Updated</h1>
                <p className="text-sm text-muted-foreground mb-6">
                  Your password has been changed. You can now log in with your new password.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="saas-button w-full"
                >
                  Go to Login
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Set New Password</h1>
                <p className="text-sm text-muted-foreground text-center mb-8">
                  Choose a strong password of at least 8 characters.
                </p>
                <form onSubmit={handleSetPassword} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2" htmlFor="password">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="saas-input pr-10"
                        placeholder="Min. 8 characters"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2" htmlFor="confirm">
                      Confirm Password
                    </label>
                    <input
                      id="confirm"
                      type={showPw ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="saas-input"
                      placeholder="Repeat your password"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="saas-button w-full mt-2"
                  >
                    {isResetting ? 'Updating...' : 'Set New Password'}
                  </button>
                  <div className="text-center pt-2">
                    <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2">
                      <ArrowLeft className="w-4 h-4" /> Back to Login
                    </Link>
                  </div>
                </form>
              </>
            )
          ) : (
            /* ── Request reset ── */
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Reset Your Password</h1>
              <p className="text-sm text-muted-foreground text-center mb-8">
                Enter your email and we'll generate a secure reset link.
              </p>
              {isSent ? (
                <div className="text-center">
                  <div className="bg-secondary/50 p-6 border border-border mb-4">
                    <p className="text-sm text-foreground mb-2">
                      A reset link was generated for <strong>{email}</strong>.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Check your email for the link, or ask your admin to retrieve it from server logs.
                    </p>
                  </div>
                  {devLink && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 mb-4 text-left">
                      <p className="text-xs font-semibold text-amber-500 mb-1">Dev Mode — Reset Link:</p>
                      <a
                        href={devLink}
                        className="text-xs text-primary break-all hover:underline"
                      >
                        {devLink}
                      </a>
                    </div>
                  )}
                  <Link to="/login" className="text-primary text-sm font-medium hover:underline flex items-center justify-center gap-2 mt-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleRequestReset} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2" htmlFor="email">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="saas-input"
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="saas-button w-full mt-2"
                  >
                    {isLoading ? 'Generating...' : 'Send Reset Link'}
                  </button>
                  <div className="text-center pt-4">
                    <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2">
                      <ArrowLeft className="w-4 h-4" /> Back to Login
                    </Link>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PasswordResetPage;
