import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PageMeta from '@/components/PageMeta.jsx';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Rocket, Clock, Target, Layers, ArrowRight,
  Box, Code, Copy, CheckCircle2, Zap, Play, Loader2, ExternalLink,
  ShoppingBag, Star, MessageSquare, Lock, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const DIFF_COLOR = {
  beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  advanced: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const SOURCE_BADGE = {
  platform:  'bg-primary/10 text-primary border-primary/20',
  community: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

const StarPicker = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1,2,3,4,5].map(n => (
      <button key={n} type="button" onClick={() => onChange(n)}>
        <Star className={`w-6 h-6 transition-colors ${n <= value ? 'text-amber-400 fill-amber-400' : 'text-zinc-600 hover:text-amber-300'}`} />
      </button>
    ))}
  </div>
);

const ReviewCard = ({ review }) => (
  <div className="p-4 bg-muted/20 border border-border/40 rounded-xl">
    <div className="flex items-center gap-2 mb-2">
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(n => (
          <Star key={n} className={`w-3.5 h-3.5 ${n <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground font-mono">
        User #{review.userId} · {new Date(review.createdAt).toLocaleDateString()}
      </span>
    </div>
    {review.reviewText && (
      <p className="text-sm text-foreground/80 leading-relaxed">{review.reviewText}</p>
    )}
  </div>
);

const BlueprintDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [blueprint, setBlueprint] = useState(null);
  const [tools, setTools] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [error, setError] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const authToken = () => localStorage.getItem('sbep_auth_token');

  // Fetches a blueprint by ID using the detail endpoint (entitled — returns setupSteps if purchaser/admin/author)
  const fetchBlueprintById = async (id) => {
    const token = authToken();
    const res = await fetch(`/api/blueprints/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Blueprint not found');
    return res.json();
  };

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(false);
      try {
        // Step 1: Resolve slug → ID via list endpoint (lightweight)
        const slugRes = await fetch(`/api/blueprints?slug=${encodeURIComponent(slug)}`);
        if (!slugRes.ok) throw new Error('Blueprint not found');
        const slugData = await slugRes.json();
        const stub = Array.isArray(slugData) ? slugData[0] : slugData;
        if (!stub) throw new Error('Blueprint not found');

        // Step 2: Fetch full detail from /:id with auth — server returns setupSteps if entitled
        const [bp, toolsRes, revRes] = await Promise.all([
          fetchBlueprintById(stub.id),
          fetch('/api/tools'),
          fetch(`/api/blueprints/${stub.id}/reviews`),
        ]);

        setBlueprint(bp);

        if (toolsRes.ok) {
          const allTools = await toolsRes.json();
          setTools(Array.isArray(allTools) ? allTools.slice(0, 6) : []);
        }
        if (revRes.ok) setReviews(await revRes.json());

        // Entitlement: server already gated setupSteps; set hasPurchased from entitlement endpoint
        if ((bp.priceCredits ?? 0) > 0) {
          try {
            const token = authToken();
            const entRes = await fetch(`/api/blueprints/${bp.id}/entitlement`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (entRes.ok) {
              const ent = await entRes.json();
              if (ent.canAccess) setHasPurchased(true);
            }
          } catch { /* ok */ }
        } else {
          setHasPurchased(true); // free blueprints always accessible
        }
      } catch (err) {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [slug, currentUser]);

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleBuildBlueprint = async () => {
    if (!currentUser) {
      toast.error("Please log in to build this blueprint");
      navigate('/login', { state: { from: `/blueprints/${slug}` } });
      return;
    }
    if (!blueprint) return;

    setIsBuilding(true);
    try {
      const resp = await fetch('/api/system-instances', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ blueprintId: blueprint.id, name: blueprint.name, userId: currentUser.id }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create system instance');
      }

      const instance = await resp.json();
      toast.success(`Launching AI Build Agent for "${blueprint.name}"...`);
      navigate(`/systems/${instance.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to start build. Please try again.');
    } finally {
      setIsBuilding(false);
    }
  };

  const handlePurchase = async () => {
    if (!currentUser) {
      toast.error("Please log in to purchase");
      navigate('/login', { state: { from: `/blueprints/${slug}` } });
      return;
    }
    setIsPurchasing(true);
    try {
      const resp = await fetch(`/api/blueprints/${blueprint.id}/purchase`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Purchase failed');
      }
      setHasPurchased(true);
      // Refetch full blueprint from detail endpoint — now entitled, server returns premium fields
      try {
        const full = await fetchBlueprintById(blueprint.id);
        setBlueprint(full);
      } catch { /* non-fatal — user still has access */ }
      toast.success(`Blueprint purchased! ${blueprint.priceCredits} credits deducted.`);
    } catch (err) {
      toast.error(err.message || 'Failed to purchase blueprint');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error("Please log in to leave a review");
      return;
    }
    setIsSubmittingReview(true);
    try {
      const resp = await fetch(`/api/blueprints/${blueprint.id}/reviews`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rating: reviewRating, reviewText: reviewText.trim() || undefined }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit review');
      }
      const newReview = await resp.json();
      setReviews(prev => [newReview, ...prev]);
      // Update local avg
      const newCount = reviews.length + 1;
      const newAvg = (reviews.reduce((s, r) => s + r.rating, 0) + reviewRating) / newCount;
      setBlueprint(prev => ({ ...prev, ratingCount: newCount, ratingAvg: Math.round(newAvg * 10) / 10 }));
      setShowReviewForm(false);
      setReviewText('');
      setReviewRating(5);
      toast.success("Review submitted!");
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-mono text-sm">Loading blueprint...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !blueprint) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageMeta title="Blueprint Not Found | Starks Global Group" description="The requested blueprint could not be found." robots="noindex, follow" />
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="cinematic-card p-10 text-center max-w-md w-full border-destructive/30">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">Blueprint Not Found</h2>
            <p className="text-muted-foreground mb-8">The system architecture you requested does not exist.</p>
            <button onClick={() => navigate('/blueprints')} className="saas-button w-full">
              Back to Blueprints
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const steps = blueprint.setupSteps || blueprint.setup_steps || [];
  const diffKey = (blueprint.difficulty || 'intermediate').toLowerCase();
  const diffBadge = DIFF_COLOR[diffKey] || DIFF_COLOR.intermediate;
  const srcBadgeClass = SOURCE_BADGE[blueprint.source] || SOURCE_BADGE.platform;
  const isFree = (blueprint.priceCredits ?? 0) === 0;
  const canAccess = isFree || hasPurchased;

  const prompts = [
    {
      title: "AI System Persona",
      content: `You are an expert automation engineer building the "${blueprint.name}" system. Your goal is to execute each step precisely, verify outputs, and create a reliable automated pipeline.`
    },
    {
      title: "Build Instruction Template",
      content: `Blueprint: ${blueprint.name}\nObjective: ${blueprint.description || 'Automate and scale operations'}\nExecute systematically, test each component, and confirm activation.`
    }
  ];

  const bpDescription = blueprint.description
    ? blueprint.description.slice(0, 155).replace(/\s+\S*$/, '') + (blueprint.description.length > 155 ? '…' : '')
    : `${blueprint.name} — a step-by-step AI system blueprint from Starks Global Group.`;

  return (
    <div className="min-h-screen bg-background flex flex-col bg-grid-pattern selection:bg-primary/20">
      <PageMeta
        title={`${blueprint.name} | System Blueprint — Starks Global Group`}
        description={bpDescription}
      />

      <Header />

      <main className="flex-grow pt-24 pb-24">
        <div className="container mx-auto px-4 max-w-5xl">

          {/* Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cinematic-card p-8 md:p-12 mb-10 border-primary/30 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 mix-blend-screen pointer-events-none">
              <Layers className="w-64 h-64 text-primary" />
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                <Rocket className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 text-xs font-mono uppercase tracking-wider border rounded capitalize bg-primary/10 text-primary border-primary/20">
                System Blueprint
              </span>
              {blueprint.source === 'community' && (
                <span className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border rounded ${srcBadgeClass}`}>
                  Community
                </span>
              )}
              {blueprint.difficulty && (
                <span className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border rounded capitalize ${diffBadge}`}>
                  {blueprint.difficulty}
                </span>
              )}
              {!isFree && (
                <span className="px-3 py-1 text-xs font-mono uppercase tracking-wider border rounded bg-amber-500/10 text-amber-400 border-amber-500/20">
                  {blueprint.priceCredits} credits
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 tracking-tight font-mono relative z-10">
              {blueprint.name}
            </h1>
            <p className="text-xl text-muted-foreground mb-6 max-w-3xl leading-relaxed font-medium relative z-10">
              {blueprint.description}
            </p>

            {/* Rating summary */}
            {(blueprint.ratingCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 mb-6 relative z-10">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className={`w-4 h-4 ${n <= Math.round(blueprint.ratingAvg ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
                  ))}
                </div>
                <span className="text-sm font-bold text-amber-400">{Number(blueprint.ratingAvg).toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({blueprint.ratingCount} review{blueprint.ratingCount !== 1 ? 's' : ''})</span>
                {(blueprint.salesCount ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground ml-2">
                    <Users className="w-3.5 h-3.5" /> {blueprint.salesCount} purchases
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-border/50 relative z-10">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Setup Time
                </p>
                <p className="font-bold text-foreground text-lg">
                  {blueprint.estimatedTime || '2-4 Hours'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Difficulty
                </p>
                <p className="font-bold text-foreground text-lg capitalize">
                  {blueprint.difficulty || 'Intermediate'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Est. Cost
                </p>
                <p className="font-bold text-foreground text-lg">
                  {blueprint.estimatedCost || '$0-50/mo'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Outcome
                </p>
                <p className="font-bold text-emerald-400 text-lg">
                  Automated Pipeline
                </p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Main content */}
            <div className="lg:col-span-2 space-y-10">

              {/* Architecture Steps */}
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 font-mono">
                  <span className="w-8 h-8 rounded-lg bg-secondary/20 text-secondary flex items-center justify-center text-sm font-bold border border-secondary/30">1</span>
                  System Architecture
                </h2>
                <div className="space-y-4">
                  {Array.isArray(steps) && steps.length > 0 ? steps.map((step, idx) => (
                    <div key={idx} className="p-6 bg-card border border-border/50 rounded-xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors" />
                      <div className="flex items-start gap-4">
                        <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-foreground mb-1 text-lg">
                            {typeof step === 'string' ? step : (step.title || step.name || `Step ${idx + 1}`)}
                          </h4>
                          {step.description && (
                            <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 border border-dashed border-border rounded-xl text-center">
                      <Rocket className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        Detailed step-by-step logic is generated by the AI Build Agent when you start building.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Core Logic — gated for paid blueprints */}
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 font-mono">
                  <span className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-sm font-bold border border-primary/30">2</span>
                  Core Logic & Templates
                </h2>
                {canAccess ? (
                  <div className="space-y-6">
                    {prompts.map((prompt, idx) => (
                      <div key={idx} className="cinematic-card overflow-hidden">
                        <div className="bg-muted/50 px-4 py-3 border-b border-border/50 flex justify-between items-center">
                          <span className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                            <Code className="w-4 h-4 text-primary" /> {prompt.title}
                          </span>
                          <button
                            onClick={() => handleCopy(prompt.content, idx)}
                            className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors bg-background px-2 py-1 rounded border border-border"
                          >
                            {copiedIndex === idx
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              : <Copy className="w-3.5 h-3.5" />}
                            {copiedIndex === idx ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="p-4 bg-[#0a0a0a]">
                          <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed">{prompt.content}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 border border-amber-500/20 bg-amber-500/5 rounded-xl text-center">
                    <Lock className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                    <p className="text-foreground font-semibold mb-1">Purchase to Access</p>
                    <p className="text-muted-foreground text-sm">Purchase this blueprint to unlock the full templates and logic.</p>
                  </div>
                )}
              </section>

              {/* Recommended Tools */}
              {tools.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 font-mono">
                    <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold border border-emerald-500/30">3</span>
                    Recommended Tools
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tools.map(tool => (
                      <div key={tool.id} className="p-4 rounded-xl border border-border/50 bg-card/60 hover:border-primary/40 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <Link to={`/marketplace/product/${tool.id}`} className="font-semibold text-sm hover:text-primary transition-colors">
                              {tool.name}
                            </Link>
                            {tool.pricing && (
                              <p className="text-xs text-primary/80 font-mono mt-0.5">{tool.pricing}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tool.description}</p>
                          </div>
                          <div className="shrink-0 flex flex-col gap-1.5 items-end">
                            <Link to={`/marketplace/product/${tool.id}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold hover:bg-primary/10 hover:border-primary/30 transition-colors">
                              Details
                            </Link>
                            {tool.affiliateLink && (
                              <a href={tool.affiliateLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 border border-primary/20 transition-colors">
                                Get <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Reviews section ──────────────────────────────────────── */}
              <section id="reviews">
                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 font-mono">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-bold border border-amber-500/30">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  Reviews {reviews.length > 0 && <span className="text-muted-foreground text-lg font-normal">({reviews.length})</span>}
                </h2>

                {/* Submit review CTA */}
                {currentUser && canAccess && !showReviewForm && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="mb-6 flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-colors"
                  >
                    <Star className="w-4 h-4" /> Write a Review
                  </button>
                )}

                {/* Review form */}
                {showReviewForm && (
                  <motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleSubmitReview}
                    className="cinematic-card p-6 mb-6"
                  >
                    <h3 className="font-semibold text-foreground mb-4">Your Review</h3>
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Rating</p>
                      <StarPicker value={reviewRating} onChange={setReviewRating} />
                    </div>
                    <textarea
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      placeholder="Share your experience with this blueprint (optional)..."
                      rows={3}
                      className="w-full bg-muted/20 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none mb-4"
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="px-4 py-2 border border-border/50 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/20 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
                      >
                        {isSubmittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Submit Review
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* Reviews list */}
                {reviews.length === 0 ? (
                  <div className="p-8 border border-dashed border-border rounded-xl text-center">
                    <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
                  </div>
                )}
              </section>

            </div>

            {/* Sidebar */}
            <div className="space-y-6">

              {/* Purchase / Build CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="cinematic-card p-6 border-primary/40 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent pointer-events-none" />
                <div className="relative z-10">

                  {/* Purchase gate */}
                  {!isFree && !hasPurchased ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <ShoppingBag className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-amber-400 font-mono">Premium Blueprint</span>
                      </div>
                      <h3 className="text-xl font-bold mb-1 font-mono">Unlock This Blueprint</h3>
                      <p className="text-3xl font-black text-amber-400 mb-2">{blueprint.priceCredits} <span className="text-base font-semibold text-muted-foreground">credits</span></p>
                      <p className="text-sm text-muted-foreground mb-6">
                        One-time purchase. Unlocks full access including templates, logic, and the AI Build Agent.
                      </p>
                      <button
                        onClick={handlePurchase}
                        disabled={isPurchasing}
                        className="w-full py-4 text-base font-semibold rounded-xl bg-amber-500 text-black hover:bg-amber-400 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
                      >
                        {isPurchasing ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                        ) : (
                          <><ShoppingBag className="w-5 h-5" /> Purchase Blueprint</>
                        )}
                      </button>
                      {!currentUser && (
                        <p className="text-xs text-center text-muted-foreground/60 mt-3">
                          <Link to="/login" className="text-primary hover:underline">Log in</Link> to purchase
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-emerald-400 font-mono">
                          {hasPurchased && !isFree ? 'Purchased · ' : ''}AI Agent Ready
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 font-mono">Build This Blueprint</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Launch the AI Build Agent to construct this system step by step with your tools and credentials.
                      </p>
                      <button
                        onClick={handleBuildBlueprint}
                        disabled={isBuilding}
                        className="w-full py-4 text-base font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
                      >
                        {isBuilding ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Launching Agent...</>
                        ) : (
                          <><Play className="w-5 h-5" /> Build This Blueprint <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>
                      {!currentUser && (
                        <p className="text-xs text-center text-muted-foreground/60 mt-3">
                          <Link to="/login" className="text-primary hover:underline">Log in</Link> to start building
                        </p>
                      )}
                    </>
                  )}
                </div>
              </motion.div>

              {/* Required Integrations */}
              <div className="cinematic-card p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border/50 pb-2">
                  Required Integrations
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold">OpenRouter API</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20">Required</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-secondary" />
                      <span className="text-sm font-bold">Webhook Listener</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">Supported</span>
                  </div>
                  <Link to="/my-stack" className="block text-center text-xs font-bold text-primary hover:underline mt-4">
                    Manage My Stack →
                  </Link>
                </div>
              </div>

              {/* Back to Blueprints */}
              <Link
                to="/blueprints"
                className="block text-center py-3 rounded-xl border border-border/50 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                ← Browse All Blueprints
              </Link>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlueprintDetailPage;
