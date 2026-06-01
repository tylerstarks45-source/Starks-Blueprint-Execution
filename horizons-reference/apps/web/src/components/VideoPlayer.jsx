import React, { useState } from 'react';
import { Play } from 'lucide-react';

const VideoPlayer = ({ videoUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const getVideoId = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  const videoId = getVideoId(videoUrl);
  // Using hqdefault as maxresdefault is sometimes unavailable for YouTube Shorts
  const thumbnailUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
  
  // Only load the autoplaying iframe AFTER the user has explicitly clicked the play button overlay
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

  return (
    <div className="video-player-wrapper group" onClick={() => setIsPlaying(true)}>
      {!isPlaying ? (
        <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
          {videoId && (
            <img 
              src={thumbnailUrl} 
              alt="Video Thumbnail" 
              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity duration-300"
            />
          )}
          <div className="relative z-10 w-16 h-16 md:w-20 md:h-20 bg-primary/90 rounded-full flex items-center justify-center shadow-[0_0_30px_hsl(var(--neon-blue)/0.8)] group-hover:scale-110 transition-transform duration-300">
            <Play className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>
      ) : (
        <iframe
          src={embedUrl}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full absolute inset-0 border-0"
        ></iframe>
      )}
    </div>
  );
};

export default VideoPlayer;