import React from 'react';

const MediaRenderer = ({ imageUrl, videoUrl, altText = "Media content" }) => {
  if (videoUrl) {
    // Basic iframe embed for YouTube/Vimeo
    const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
    const isVimeo = videoUrl.includes('vimeo.com');
    
    let embedUrl = videoUrl;
    if (isYouTube) {
      const videoId = videoUrl.split('v=')[1]?.split('&')[0] || videoUrl.split('youtu.be/')[1];
      if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (isVimeo) {
      const videoId = videoUrl.split('vimeo.com/')[1];
      if (videoId) embedUrl = `https://player.vimeo.com/video/${videoId}`;
    }

    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border/50 shadow-lg bg-secondary/20">
        <iframe
          src={embedUrl}
          title={altText}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden border border-border/50 shadow-lg bg-secondary/20">
        <img 
          src={imageUrl} 
          alt={altText} 
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return null;
};

export default MediaRenderer;