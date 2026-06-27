
import React from 'react';

const VideoBackground = ({ children, className = '', videoId = 'PeY9pWJ2Mbk' }) => {
  return (
    <div className={`relative min-h-screen w-full flex flex-col ${className}`}>
      {/* Background Video Layer */}
      <div className="fixed inset-0 w-full h-screen z-[-1] overflow-hidden pointer-events-none">
        <iframe
          key={videoId}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&playsinline=1&rel=0&vq=hd1080&hd=1&quality=hd1080`}
          allow="autoplay; encrypted-media; fullscreen"
          frameBorder="0"
          title="Global Background Video"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '110vw',
            height: 'calc(110vw * 9 / 16)',
            minHeight: '110vh',
            minWidth: 'calc(110vh * 16 / 9)',
            transform: 'translate3d(-50%, -50%, 0)',
            transformOrigin: 'center center',
            imageRendering: 'auto',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            border: 'none',
            outline: 'none',
          }}
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
