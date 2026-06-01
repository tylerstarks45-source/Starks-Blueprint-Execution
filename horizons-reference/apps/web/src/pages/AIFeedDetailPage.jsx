// Redirecting to new unified routing structure on AIFeedPage
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const AIFeedDetailPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams();

  useEffect(() => {
    // We integrated detail view directly into the feed page for better UX/speed
    navigate(`/dashboard/ai-feed/${slug}`, { replace: true });
  }, [navigate, slug]);

  return null;
};

export default AIFeedDetailPage;