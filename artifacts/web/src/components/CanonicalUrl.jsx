import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const CanonicalUrl = () => {
  const { pathname } = useLocation();
  const canonical = `${window.location.origin}${pathname}`;
  return (
    <Helmet>
      <link rel="canonical" href={canonical} />
    </Helmet>
  );
};

export default CanonicalUrl;
