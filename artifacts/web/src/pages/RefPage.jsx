import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const COOKIE_NAME = 'sbep_referral_code';
const COOKIE_DAYS = 30;

function setReferralCookie(code) {
  const expires = new Date(Date.now() + COOKIE_DAYS * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; expires=${expires}; path=/; SameSite=Lax`;
  localStorage.setItem(COOKIE_NAME, code);
}

const RefPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) {
      navigate('/signup', { replace: true });
      return;
    }

    const upper = code.toUpperCase();
    setReferralCookie(upper);

    // Track the click (fire-and-forget)
    fetch(`/api/referrals/${upper}/click`, { method: 'POST' }).catch(() => {});

    navigate('/signup', { replace: true });
  }, [code, navigate]);

  return null;
};

export default RefPage;
