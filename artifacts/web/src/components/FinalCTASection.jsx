
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer.jsx';

const FinalCTASection = () => {
  const navigate = useNavigate();
  
  const handleStartSystem = e => {
    e.preventDefault();
    navigate('/blueprints');
  };
  
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          transition={{ duration: 0.6 }} 
          className="p-8 md:p-16 border border-white/10 bg-card/40 backdrop-blur-xl rounded-3xl shadow-2xl"
        >
          <Zap className="w-16 h-16 text-primary mx-auto mb-8 drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)] animate-pulse" />
          
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-balance text-white [text-shadow:_0_4px_16px_rgb(0_0_0_/_80%)]">
            Starks Global Group Info Video
          </h2>
          
          {/* Video Section */}
          <div className="mt-video-container mb-12 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <VideoPlayer videoUrl="https://youtu.be/-D_3F0hDVYU?si=xYhMznKgIFx9wVxC" />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-5">
            <button onClick={handleStartSystem} className="saas-button text-lg px-10 py-4 shadow-[0_0_30px_hsl(var(--primary)/0.4)] group w-full sm:w-auto">
              Start With This System <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <span className="cta-footnote mt-4 text-zinc-200 font-medium [text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]">
              No guesswork. Just proven systems and tools.
            </span>
          </div>
          
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTASection;
