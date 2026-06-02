
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';

const SignupPage = () => {
  const { signup, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ email: '', password: '', passwordConfirm: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.passwordConfirm) {
      toast.error("Please fill in all fields.");
      return;
    }
    
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    
    if (formData.password !== formData.passwordConfirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const result = await signup(formData.email, formData.password);
    
    if (result.success) {
      toast.success("Account created successfully.");
      navigate('/dashboard', { replace: true });
    } else {
      toast.error(result.error);
    }
    setIsLoading(false);
  };

  return (
    <VideoBackground>
      <Helmet>
        <title>Sign Up | Starks Global Group</title>
      </Helmet>
      
      <Header />
      
      <main className="flex-grow flex items-center justify-center p-4 py-24">
        <div className="w-full max-w-md bg-card/80 backdrop-blur-xl p-8 md:p-10 border border-border shadow-2xl shadow-black/50 rounded-2xl">
          
          <h1 className="text-2xl font-bold text-center text-foreground mb-2 text-shadow-sm">Create Your Free Account</h1>
          <p className="text-center text-sm text-muted-foreground mb-8 text-shadow-sm">Join the automation infrastructure platform.</p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 text-shadow-sm" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full bg-background/90 border border-input text-foreground px-4 py-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="name@company.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 text-shadow-sm" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full bg-background/90 border border-input text-foreground px-4 py-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Minimum 8 characters"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2 text-shadow-sm" htmlFor="passwordConfirm">
                Confirm Password
              </label>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                value={formData.passwordConfirm}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full bg-background/90 border border-input text-foreground px-4 py-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Re-enter your password"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center px-6 py-3 mt-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-[0_4px_15px_hsl(var(--primary)/0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-8 text-center text-sm text-muted-foreground text-shadow-sm">
            Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Log In</Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </VideoBackground>
  );
};

export default SignupPage;
