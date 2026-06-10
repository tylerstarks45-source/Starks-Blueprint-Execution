import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const SITE_NAME = 'Starks Global Group';
const SITE_URL = 'https://starksglobalgroup.net';
const DEFAULT_IMAGE = `${SITE_URL}/opengraph.jpg`;

/**
 * PageMeta — centralised SEO / social metadata component.
 *
 * Drop this in place of <CanonicalUrl /> + <Helmet> in every public page.
 * Automatically injects canonical URL, Open Graph, and Twitter Card tags so
 * social bots and search engines receive correct metadata even before the
 * prerendered static HTML is delivered.
 *
 * Props:
 *   title       — page title (required)
 *   description — page description (required)
 *   robots      — robots directive, default "index, follow"
 *   noindex     — shorthand for "noindex, follow"
 *   image       — absolute OG image URL, default site-wide OG image
 *   imageAlt    — alt text for the OG image
 *   type        — OG type, default "website"
 */
const PageMeta = ({
  title,
  description,
  robots,
  noindex = false,
  image = DEFAULT_IMAGE,
  imageAlt = `${SITE_NAME} — AI-powered blueprint execution platform`,
  type = 'website',
}) => {
  const { pathname } = useLocation();
  const canonical = `${SITE_URL}${pathname}`;
  const robotsContent = noindex ? 'noindex, follow' : (robots ?? 'index, follow');

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={imageAlt} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default PageMeta;
