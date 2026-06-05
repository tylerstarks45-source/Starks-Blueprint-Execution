import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import { Eye, EyeOff, Zap, Shield, Cpu, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';

const LoginPage = () => {
  const { login, isAuthenticated, isLoading: authLoading, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from || null;

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && currentUser) {
      const role = currentUser.role || 'USER';
      if (from) navigate(from, { replace: true });
      else if (role === 'SUPER_ADMIN') navigate('/admin-dashboard', { replace: true });
      else navigate('/user-dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, currentUser, navigate, from]);

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
        const userObj = result.data?.record || result.data?.user || result.data;
        const role = userObj?.role || 'USER';
        toast.success("Welcome back. System access granted.");
        if (from) navigate(from, { replace: true });
        else if (role === 'SUPER_ADMIN') navigate('/admin-dashboard', { replace: true });
        else navigate('/user-dashboard', { replace: true });
      } else {
        toast.error(result?.error || "Invalid credentials. Access denied.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [formData.email, formData.password, login, navigate, from]);

  const FEATURES = [
    { icon: Cpu, text: "AI-powered blueprint execution" },
    { icon: Zap, text: "Automated income systems" },
    { icon: Shield, text: "Enterprise-grade security" },
  ];

  return (
    <VideoBackground>
      <Helmet>
        <title>Log In | Starks Global Group</title>
      </Helmet>

      <Header />

      <main className="flex-grow flex items-center justify-center p-4 py-24">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

          {/* Left column — branding */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden lg:flex flex-col gap-8"
          >
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-full border border-primary/20 mb-6">
                <Lock className="w-3 h-3" /> Secure Access Portal
              </div>
              <h1 className="text-4xl font-extrabold font-mono text-foreground leading-tight mb-4">
                Your AI Automation<br />
                <span className="text-primary">Command Center</span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Log in to access your blueprints, active systems, and AI build agent.
              </p>
            </div>

            <div className="space-y-4">
              {FEATURES.map(({ icon: Icon, text }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5 backdrop-blur-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/20 shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{text}</span>
                </motion.div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 font-mono">
                ✓ 8 live blueprints &nbsp;·&nbsp; ✓ 17 curated tools &nbsp;·&nbsp; ✓ OpenRouter AI
              </p>
            </div>
          </motion.div>

          {/* Right column — form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            <div className="bg-black/60 backdrop-blur-xl p-8 md:p-10 border border-white/10 shadow-2xl shadow-black/70 rounded-2xl">

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-1 font-mono">Welcome back</h2>
                <p className="text-sm text-muted-foreground">Sign in to access your automation infrastructure.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="w-full bg-white/5 border border-white/10 text-foreground px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none disabled:opacity-50 transition-all placeholder:text-muted-foreground/40"
                    placeholder="name@company.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-foreground" htmlFor="password">
                      Password
                    </label>
                    <Link to="/reset-password" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
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
                      disabled={isLoading}
                      className="w-full bg-white/5 border border-white/10 text-foreground px-4 py-3 pr-12 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none disabled:opacity-50 transition-all placeholder:text-muted-foreground/40"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 mt-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none font-mono tracking-wide"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : 'Log In →'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/5 text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                  Create Account
                </Link>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/40">
                <Lock className="w-3 h-3" />
                <span>Secured with JWT authentication</span>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      <Footer />
    </VideoBackground>
  );
};

export default LoginPage;
