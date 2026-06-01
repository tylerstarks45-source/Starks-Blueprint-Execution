import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const PasswordResetPage = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(email);
    
    if (result.success) {
      setIsSent(true);
      toast.success("Password reset link sent to your email.");
    } else {
      toast.error(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Reset Password | Starks Global Group</title>
      </Helmet>
      
      <Header />
      
      <main className="flex-grow flex items-center justify-center p-4 py-24">
        <div className="w-full max-w-md saas-panel p-8 md:p-10">
          <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Reset Your Password</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Enter your email address and we'll send you a link to securely reset your password.
          </p>
          
          {isSent ? (
            <div className="text-center bg-secondary/50 p-6 border border-border">
              <p className="text-sm text-foreground mb-4">
                If an account exists for <strong>{email}</strong>, you will receive password reset instructions shortly.
              </p>
              <Link to="/login" className="text-primary text-sm font-medium hover:underline flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Log In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="text-center pt-4">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back to Log In
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PasswordResetPage;