
import React from 'react';

const VideoBackground = ({ children, className = '' }) => {
  return (
    <div className={`relative min-h-screen w-full flex flex-col ${className}`}>
      {/* Background Video Layer */}
      <div className="fixed inset-0 w-full h-screen z-[-1] overflow-hidden pointer-events-none">
        <iframe
          src="https://www.youtube.com/embed/Hgg7M3kSqyE?autoplay=1&mute=1&loop=1&playlist=Hgg7M3kSqyE&controls=0&modestbranding=1&playsinline=1&rel=0"
          className="absolute top-1/2 left-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2 object-cover"
          allow="autoplay; encrypted-media"
          frameBorder="0"
          title="Global Background Video"
        />
      </div>
      
      {/* Content Layer */}
      <div className="relative z-10 flex-grow flex flex-col w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default VideoBackground;
