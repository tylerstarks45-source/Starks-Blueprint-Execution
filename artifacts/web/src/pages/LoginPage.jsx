
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const authCheckRef = useRef(false);
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from || null;

  useEffect(() => {
    if (authCheckRef.current) return;
    authCheckRef.current = true;
    
    if (pb.authStore.isValid) {
      const role = pb.authStore.model?.role || localStorage.getItem('userRole') || 'USER';
      if (from) {
        navigate(from, { replace: true });
      } else if (role === 'SUPER_ADMIN') {
        navigate('/admin-dashboard', { replace: true });
      } else {
        navigate('/user-dashboard', { replace: true });
      }
    }
  }, [navigate, from]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      
      if (result && result.success) {
        const userObj = result.data.record || result.data.user;
        const role = userObj?.role || 'USER';
        
        toast.success("Successfully logged in.");
        
        if (from) {
          navigate(from, { replace: true });
        } else if (role === 'SUPER_ADMIN') {
          navigate('/admin-dashboard', { replace: true });
        } else {
          navigate('/user-dashboard', { replace: true });
        }
      } else {
        toast.error(result?.error || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("An unexpected error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  }, [formData.email, formData.password, login, navigate, from]);

  const handleGoogleLogin = useCallback(() => {
    setIsGoogleLoading(true);
    pb.collection('users').authWithOAuth2({ provider: 'google' })
      .then((authData) => {
        const userObj = authData.record || authData.user;
        const role = userObj?.role || 'USER';
        
        if (from) {
          navigate(from, { replace: true });
        } else if (role === 'SUPER_ADMIN') {
          navigate('/admin-dashboard', { replace: true });
        } else {
          navigate('/user-dashboard', { replace: true });
        }
      })
      .catch((error) => {
        console.error("Google OAuth error:", error);
        toast.error("Failed to authenticate with Google.");
        setIsGoogleLoading(false);
      });
  }, [navigate, from]);

  const isSubmitting = isLoading || isGoogleLoading;

  return (
    <VideoBackground>
      <Helmet>
        <title>Log In | Starks Global Group</title>
      </Helmet>
      
      <Header />
      
      <main className="flex-grow flex items-center justify-center p-4 py-24">
        <div className="w-full max-w-md bg-card/80 backdrop-blur-xl p-8 md:p-10 border border-border shadow-2xl shadow-black/50 rounded-2xl">
          
          <h1 className="text-2xl font-bold text-center text-foreground mb-2 text-shadow-sm">Log In to Starks Global Group</h1>
          <p className="text-center text-sm text-muted-foreground mb-8 text-shadow-sm">Access your automation infrastructure.</p>
          
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
                disabled={isSubmitting}
                className="w-full bg-background/90 border border-input text-foreground px-4 py-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                placeholder="name@company.com"
                autoComplete="email"
                required
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground text-shadow-sm" htmlFor="password">
                  Password
                </label>
                <Link to="/reset-password" className="text-xs text-primary hover:underline font-medium text-shadow-sm">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="w-full bg-background/90 border border-input text-foreground px-4 py-2 pr-10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors focus:outline-none p-1 rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center px-6 py-3 mt-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-[0_4px_15px_hsl(var(--primary)/0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          
          <div className="mt-8 text-center text-sm text-muted-foreground text-shadow-sm">
            Don't have an account? <Link to="/signup" className="text-primary hover:underline font-medium">Sign Up</Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </VideoBackground>
  );
};

export default LoginPage;
