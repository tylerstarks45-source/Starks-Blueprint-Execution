import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import PageMeta from '@/components/PageMeta.jsx';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import VideoBackground from '@/components/VideoBackground.jsx';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link. Please check your email and try again.');
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed. The link may have expired.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Unable to reach the server. Please try again later.');
      });
  }, [searchParams, navigate]);

  return (
    <VideoBackground className="flex items-center justify-center px-4 selection:bg-primary/20">
      <PageMeta
        title="Verify Email | Starks Global Group"
        description="Verify your email address to complete your Starks Global Group account setup."
        noindex
      />

      <div className="w-full max-w-md">
        <div className="cinematic-card p-10 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-primary mx-auto mb-6 animate-spin" />
              <h1 className="text-2xl font-bold font-mono text-foreground mb-2">Verifying your email…</h1>
              <p className="text-muted-foreground text-sm">Please wait a moment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
              <h1 className="text-2xl font-bold font-mono text-foreground mb-2">Email Verified!</h1>
              <p className="text-muted-foreground text-sm mb-6">{message}</p>
              <p className="text-xs text-muted-foreground mb-6">Redirecting you to login in 3 seconds…</p>
              <Link
                to="/login"
                className="saas-button py-3 px-8 text-sm inline-block"
              >
                Log In Now →
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
              <h1 className="text-2xl font-bold font-mono text-foreground mb-2">Verification Failed</h1>
              <p className="text-muted-foreground text-sm mb-8">{message}</p>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="saas-button py-3 px-8 text-sm inline-block w-full"
                >
                  Go to Login
                </Link>
                <Link
                  to="/contact"
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <Mail className="w-4 h-4" /> Contact Support
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </VideoBackground>
  );
};

export default VerifyEmailPage;
