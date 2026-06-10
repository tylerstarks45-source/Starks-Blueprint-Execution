
import React from 'react';

const VideoBackground = ({ children, className = '' }) => {
  return (
    <div className={`relative min-h-screen w-full flex flex-col ${className}`}>
      {/* Static gradient background — preserves dark cinematic theme without video overhead */}
      <div
        className="fixed inset-0 w-full h-screen z-[-1] pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(14,30,64,0.95) 0%, rgba(8,14,30,0.98) 60%, #050a14 100%)',
        }}
      />

      {/* Content Layer */}
      <div className="relative z-10 flex-grow flex flex-col w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default VideoBackground;
