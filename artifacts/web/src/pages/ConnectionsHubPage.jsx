import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import AuthLayout from '@/components/AuthLayout.jsx';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

// ─── PUBLISHING CHANNELS ──────────────────────────────────────────────────────
// Map credential keys → publishing channel ID so we can show "Publishing Ready" badge.
const PUBLISHING_CRED_MAP = {
  TWITTER_BEARER_TOKEN:   'twitter',
  INSTAGRAM_ACCESS_TOKEN: 'instagram',
  MAILCHIMP_API_KEY:      'mailchimp',
  CONVERTKIT_API_KEY:     'convertkit',
  WORDPRESS_APP_PASSWORD: 'wordpress',
  GHOST_ADMIN_API_KEY:    'ghost',
  YOUTUBE_OAUTH_TOKEN:    'youtube',
};

// ─── INTEGRATION CATALOG ─────────────────────────────────────────────────────
// Static definitions of every supported integration, organized by category.

const CATEGORIES = [
  { id: 'all',            label: 'All',             icon: '⬡' },
  { id: 'ai-models',      label: 'AI Models',       icon: '🤖' },
  { id: 'video-ai',       label: 'Video AI',        icon: '🎬' },
  { id: 'voice-ai',       label: 'Voice AI',        icon: '🎙' },
  { id: 'social',         label: 'Social Media',    icon: '📱' },
  { id: 'marketing',      label: 'Marketing',       icon: '📣' },
  { id: 'ecommerce',      label: 'Ecommerce',       icon: '🛒' },
  { id: 'automation',     label: 'Automation',      icon: '⚡' },
  { id: 'communication',  label: 'Communication',   icon: '💬' },
  { id: 'infrastructure', label: 'Infrastructure',  icon: '☁' },
  { id: 'database',       label: 'Databases',       icon: '🗄' },
  { id: 'analytics',      label: 'Analytics',       icon: '📊' },
  { id: 'crm',            label: 'CRM',             icon: '👥' },
];

const CATALOG = [
  // ── AI Models ──────────────────────────────────────────────────────────────
  { key: 'OPENROUTER_API_KEY',   name: 'OpenRouter',   category: 'ai-models',      icon: '🤖', accent: 'blue',    label: 'API Key',       placeholder: 'sk-or-v1-…',   description: 'Powers the STARK AI agent. Required for all blueprint execution.',           docsUrl: 'https://openrouter.ai/keys',                    affiliateUrl: 'https://openrouter.ai/', testable: true },
  { key: 'OPENAI_API_KEY',       name: 'OpenAI',       category: 'ai-models',      icon: '⬡',  accent: 'emerald', label: 'API Key',       placeholder: 'sk-…',          description: 'GPT-4o, DALL-E, Whisper. Use for direct OpenAI blueprint tasks.',          docsUrl: 'https://platform.openai.com/api-keys',          affiliateUrl: 'https://platform.openai.com/', testable: false },
  { key: 'ANTHROPIC_API_KEY',    name: 'Claude',       category: 'ai-models',      icon: '🔶',  accent: 'amber',   label: 'API Key',       placeholder: 'sk-ant-…',      description: 'Anthropic Claude 3 for advanced reasoning and writing tasks.',             docsUrl: 'https://console.anthropic.com/',                affiliateUrl: 'https://anthropic.com/', testable: false },
  { key: 'GEMINI_API_KEY',       name: 'Gemini',       category: 'ai-models',      icon: '✦',  accent: 'blue',    label: 'API Key',       placeholder: 'AIzaSy…',       description: 'Google Gemini Pro/Ultra for multimodal AI tasks.',                         docsUrl: 'https://aistudio.google.com/app/apikey',        affiliateUrl: 'https://ai.google.dev/', testable: false },
  { key: 'GROQ_API_KEY',         name: 'Groq',         category: 'ai-models',      icon: '⚡',  accent: 'orange',  label: 'API Key',       placeholder: 'gsk_…',         description: 'Ultra-fast LLaMA inference for high-throughput automation.',               docsUrl: 'https://console.groq.com/',                     affiliateUrl: 'https://groq.com/', testable: false },
  { key: 'PERPLEXITY_API_KEY',   name: 'Perplexity',   category: 'ai-models',      icon: '🔍',  accent: 'violet',  label: 'API Key',       placeholder: 'pplx-…',        description: 'Real-time web-connected AI for research and fact-checking tasks.',        docsUrl: 'https://www.perplexity.ai/settings/api',        affiliateUrl: 'https://perplexity.ai/', testable: false },
  { key: 'DEEPSEEK_API_KEY',     name: 'DeepSeek',     category: 'ai-models',      icon: '🌊',  accent: 'blue',    label: 'API Key',       placeholder: 'sk-…',          description: 'DeepSeek R1/V3 for cost-efficient reasoning and coding tasks.',           docsUrl: 'https://platform.deepseek.com/',                affiliateUrl: 'https://deepseek.com/', testable: false },
  { key: 'MISTRAL_API_KEY',      name: 'Mistral',      category: 'ai-models',      icon: '🌀',  accent: 'red',     label: 'API Key',       placeholder: 'mistral-…',     description: 'Mistral AI models for European-compliant AI workloads.',                  docsUrl: 'https://console.mistral.ai/',                   affiliateUrl: 'https://mistral.ai/', testable: false },
  // ── Video AI ───────────────────────────────────────────────────────────────
  { key: 'HEYGEN_API_KEY',       name: 'HeyGen',       category: 'video-ai',       icon: '🎬',  accent: 'violet',  label: 'API Key',       placeholder: 'HEYGEN-…',      description: 'AI avatar video generation. Essential for video content blueprints.',    docsUrl: 'https://app.heygen.com/settings',               affiliateUrl: 'https://heygen.com/?sid=starks', testable: false },
  { key: 'SYNTHESIA_API_KEY',    name: 'Synthesia',    category: 'video-ai',       icon: '🎥',  accent: 'pink',    label: 'API Key',       placeholder: 'Bearer …',      description: 'Professional AI presenter videos at scale.',                              docsUrl: 'https://www.synthesia.io/api',                  affiliateUrl: 'https://synthesia.io/?sid=starks', testable: false },
  { key: 'RUNWAY_API_KEY',       name: 'Runway',       category: 'video-ai',       icon: '🎞',  accent: 'red',     label: 'API Key',       placeholder: 'key_…',         description: 'Gen-3 video generation and editing for creative content systems.',       docsUrl: 'https://runwayml.com/',                         affiliateUrl: 'https://runwayml.com/?sid=starks', testable: false },
  { key: 'PIKA_API_KEY',         name: 'Pika',         category: 'video-ai',       icon: '✨',  accent: 'pink',    label: 'API Key',       placeholder: 'pika_…',        description: 'Text-to-video and image animation for viral content creation.',          docsUrl: 'https://pika.art/',                             affiliateUrl: 'https://pika.art/?sid=starks', testable: false },
  // ── Voice AI ───────────────────────────────────────────────────────────────
  { key: 'ELEVENLABS_API_KEY',   name: 'ElevenLabs',   category: 'voice-ai',       icon: '🎙',  accent: 'amber',   label: 'API Key',       placeholder: 'el-…',          description: 'Ultra-realistic AI voice cloning and synthesis for audio blueprints.',  docsUrl: 'https://elevenlabs.io/app/settings/api-keys',   affiliateUrl: 'https://elevenlabs.io/?sid=starks', testable: false },
  { key: 'PLAYHT_API_KEY',       name: 'PlayHT',       category: 'voice-ai',       icon: '▶',   accent: 'emerald', label: 'API Key',       placeholder: 'v3_…',          description: 'AI voice generation with emotion and emphasis control.',                  docsUrl: 'https://play.ht/app/api-access',                affiliateUrl: 'https://play.ht/?sid=starks', testable: false },
  { key: 'MURF_API_KEY',         name: 'Murf',         category: 'voice-ai',       icon: '🔊',  accent: 'blue',    label: 'API Key',       placeholder: 'murf-…',        description: 'Professional AI voiceovers with 120+ voices across 20 languages.',      docsUrl: 'https://murf.ai/',                              affiliateUrl: 'https://murf.ai/?sid=starks', testable: false },
  // ── Social Media ───────────────────────────────────────────────────────────
  { key: 'TIKTOK_ACCESS_TOKEN',  name: 'TikTok',       category: 'social',         icon: '🎵',  accent: 'pink',    label: 'Access Token',  placeholder: 'Access token…', description: 'Content automation and analytics for TikTok growth blueprints.',       docsUrl: 'https://developers.tiktok.com/',                affiliateUrl: null, testable: false },
  { key: 'YOUTUBE_API_KEY',      name: 'YouTube',      category: 'social',         icon: '▶',   accent: 'red',     label: 'API Key',       placeholder: 'AIza…',         description: 'YouTube Data API for content scheduling and channel management.',        docsUrl: 'https://console.developers.google.com/',        affiliateUrl: null, testable: false },
  { key: 'META_ACCESS_TOKEN',    name: 'Meta',         category: 'social',         icon: '👥',  accent: 'blue',    label: 'Access Token',  placeholder: 'EAAr…',         description: 'Facebook & Instagram automation for social media blueprints.',          docsUrl: 'https://developers.facebook.com/',              affiliateUrl: null, testable: false },
  { key: 'LINKEDIN_API_KEY',     name: 'LinkedIn',     category: 'social',         icon: '💼',  accent: 'blue',    label: 'Access Token',  placeholder: 'AQX…',          description: 'LinkedIn API for B2B content and lead generation automation.',          docsUrl: 'https://www.linkedin.com/developers/',          affiliateUrl: null, testable: false },
  { key: 'TWITTER_BEARER_TOKEN', name: 'X (Twitter)',  category: 'social',         icon: '𝕏',   accent: 'violet',  label: 'Bearer Token',  placeholder: 'AAAA…',         description: 'X (Twitter) API v2 for tweet automation and audience analytics.',       docsUrl: 'https://developer.twitter.com/',                affiliateUrl: null, testable: false },
  { key: 'THREADS_ACCESS_TOKEN',  name: 'Threads',      category: 'social',         icon: '🧵',  accent: 'violet',  label: 'Access Token',  placeholder: 'thr_…',         description: 'Threads by Meta API for text-based social content automation.',          docsUrl: 'https://developers.facebook.com/docs/threads',  affiliateUrl: null, testable: false },
  { key: 'PINTEREST_API_KEY',    name: 'Pinterest',    category: 'social',         icon: '📌',  accent: 'red',     label: 'Access Token',  placeholder: 'ppa_…',         description: 'Pinterest API for pin scheduling and board automation blueprints.',       docsUrl: 'https://developers.pinterest.com/docs/getting-started/', affiliateUrl: null, testable: false },
  { key: 'INSTAGRAM_ACCESS_TOKEN', name: 'Instagram', category: 'social',         icon: '📸',  accent: 'pink',    label: 'Access Token',  placeholder: 'IGAT_…',        description: 'Instagram Graph API for Reels, posts, and story automation.',            docsUrl: 'https://developers.facebook.com/docs/instagram-api', affiliateUrl: null, testable: false },
  { key: 'FACEBOOK_PAGE_TOKEN',  name: 'Facebook Page', category: 'social',       icon: '👥',  accent: 'blue',    label: 'Page Token',    placeholder: 'EAAr…',         description: 'Facebook Graph API for Page post automation and ad campaign management.', docsUrl: 'https://developers.facebook.com/docs/pages/', affiliateUrl: null, testable: false },
  { key: 'SNAPCHAT_ACCESS_TOKEN',name: 'Snapchat',     category: 'social',         icon: '👻',  accent: 'amber',   label: 'Access Token',  placeholder: 'Bearer…',       description: 'Snapchat Marketing API for Snap Ads and story automation.',              docsUrl: 'https://developers.snap.com/api/marketing-api/Overview/', affiliateUrl: null, testable: false },
  // ── Marketing ──────────────────────────────────────────────────────────────
  { key: 'RESEND_API_KEY',       name: 'Resend',       category: 'marketing',      icon: '📧',  accent: 'orange',  label: 'API Key',       placeholder: 're_…',          description: 'Transactional email for lead-nurture and drip campaign blueprints.',    docsUrl: 'https://resend.com/api-keys',                   affiliateUrl: 'https://resend.com/?sid=starks', testable: false },
  { key: 'MAILCHIMP_API_KEY',    name: 'Mailchimp',    category: 'marketing',      icon: '🐒',  accent: 'amber',   label: 'API Key',       placeholder: 'mc-…',          description: 'Email list management and campaign automation at scale.',               docsUrl: 'https://mailchimp.com/developer/marketing/guides/quick-start/', affiliateUrl: 'https://mailchimp.com/?sid=starks', testable: false },
  { key: 'CONVERTKIT_API_KEY',   name: 'ConvertKit',   category: 'marketing',      icon: '✉',   accent: 'orange',  label: 'API Key',       placeholder: 'ck-…',          description: 'Creator-focused email marketing for content-based income systems.',     docsUrl: 'https://developers.convertkit.com/',            affiliateUrl: 'https://convertkit.com/?sid=starks', testable: false },
  { key: 'BEEHIIV_API_KEY',      name: 'Beehiiv',      category: 'marketing',      icon: '🐝',  accent: 'amber',   label: 'API Key',       placeholder: 'bh_…',          description: 'Newsletter growth platform — build paid subscription email businesses.',  docsUrl: 'https://developers.beehiiv.com/',               affiliateUrl: 'https://beehiiv.com/?sid=starks', testable: false },
  { key: 'INSTANTLY_API_KEY',    name: 'Instantly',    category: 'marketing',      icon: '⚡',  accent: 'violet',  label: 'API Key',       placeholder: 'instantly_…',   description: 'Cold email outreach at scale — AI personalization, inbox rotation.',      docsUrl: 'https://app.instantly.ai/app/settings/integrations', affiliateUrl: 'https://instantly.ai/?sid=starks', testable: false },
  { key: 'SMARTLEAD_API_KEY',    name: 'Smartlead',    category: 'marketing',      icon: '🎯',  accent: 'emerald', label: 'API Key',       placeholder: 'sl_…',          description: 'Multi-channel cold outreach with advanced deliverability and warm-up.',   docsUrl: 'https://smartlead.ai/api-docs/',                affiliateUrl: 'https://smartlead.ai/?sid=starks', testable: false },
  { key: 'ACTIVECAMPAIGN_KEY',   name: 'ActiveCampaign',category: 'marketing',     icon: '📨',  accent: 'blue',    label: 'API Key',       placeholder: 'ac-…',          description: 'Advanced marketing automation with CRM and email sequences.',           docsUrl: 'https://www.activecampaign.com/api/overview.php', affiliateUrl: 'https://activecampaign.com/?sid=starks', testable: false },
  { key: 'KLAVIYO_API_KEY',      name: 'Klaviyo',      category: 'marketing',      icon: '📊',  accent: 'emerald', label: 'API Key',       placeholder: 'pk_…',          description: 'E-commerce email and SMS automation for Shopify/WooCommerce blueprints.', docsUrl: 'https://www.klaviyo.com/account#api-keys-tab', affiliateUrl: 'https://klaviyo.com/?sid=starks', testable: false },
  { key: 'GOHIGHLEVEL_API_KEY',  name: 'GoHighLevel',  category: 'marketing',      icon: '🚀',  accent: 'violet',  label: 'API Key',       placeholder: 'ghl-…',         description: 'All-in-one marketing platform for agency and SaaS income blueprints.', docsUrl: 'https://highlevel.stoplight.io/',               affiliateUrl: 'https://www.gohighlevel.com/?sid=starks', testable: false },
  // ── Ecommerce ──────────────────────────────────────────────────────────────
  { key: 'STRIPE_SECRET_KEY',    name: 'Stripe',       category: 'ecommerce',      icon: '💳',  accent: 'violet',  label: 'Secret Key',    placeholder: 'sk_live_…',     description: 'Payment processing for e-commerce and subscription blueprints.',        docsUrl: 'https://dashboard.stripe.com/apikeys',          affiliateUrl: null, testable: true },
  { key: 'SHOPIFY_API_KEY',      name: 'Shopify',      category: 'ecommerce',      icon: '🛍',  accent: 'emerald', label: 'API Key',       placeholder: 'shpat_…',       description: 'Store management and dropshipping blueprint automation.',               docsUrl: 'https://admin.shopify.com/store/apps/private',  affiliateUrl: 'https://shopify.com/?sid=starks', testable: false },
  { key: 'PAYPAL_CLIENT_ID',     name: 'PayPal',       category: 'ecommerce',      icon: '🅿',   accent: 'blue',    label: 'Client ID',     placeholder: 'Acd…',          description: 'PayPal payments and subscriptions for global e-commerce blueprints.',  docsUrl: 'https://developer.paypal.com/api/rest/',        affiliateUrl: null, testable: false },
  { key: 'DIGISTORE24_API_KEY',  name: 'Digistore24',  category: 'ecommerce',      icon: '🏪',  accent: 'red',     label: 'API Key',       placeholder: 'ds24-…',        description: 'Digital product sales and affiliate management platform.',             docsUrl: 'https://www.digistore24.com/vendor/api/doc/',   affiliateUrl: 'https://www.digistore24.com/?sid=starks', testable: false },
  { key: 'WOOCOMMERCE_API_KEY',  name: 'WooCommerce',  category: 'ecommerce',      icon: '🛍',  accent: 'violet',  label: 'Consumer Key',  placeholder: 'ck_…',          description: 'WooCommerce REST API for WordPress store automation and order management.', docsUrl: 'https://woocommerce.com/document/woocommerce-rest-api/', affiliateUrl: 'https://woocommerce.com/?sid=starks', testable: false },
  { key: 'AMAZON_SP_API_KEY',    name: 'Amazon',       category: 'ecommerce',      icon: '📦',  accent: 'amber',   label: 'Access Key',    placeholder: 'Atvpdkikx0…',   description: 'Amazon Selling Partner API for marketplace listing and order automation.', docsUrl: 'https://developer-docs.amazon.com/sp-api/',  affiliateUrl: null, testable: false },
  { key: 'ETSY_API_KEY',         name: 'Etsy',         category: 'ecommerce',      icon: '🧶',  accent: 'orange',  label: 'API Key',       placeholder: 'etsy_…',        description: 'Etsy Open API for handmade marketplace automation and listing management.', docsUrl: 'https://developers.etsy.com/documentation/tutorials/quickstart/', affiliateUrl: 'https://www.etsy.com/?sid=starks', testable: false },
  { key: 'SQUARE_ACCESS_TOKEN',  name: 'Square',       category: 'ecommerce',      icon: '⬛',  accent: 'blue',    label: 'Access Token',  placeholder: 'EAAAl…',        description: 'Square payments and POS for in-person and online payment blueprints.',   docsUrl: 'https://developer.squareup.com/docs',           affiliateUrl: null, testable: false },
  // ── Automation ─────────────────────────────────────────────────────────────
  { key: 'N8N_API_KEY',          name: 'n8n',          category: 'automation',     icon: '⚙',   accent: 'red',     label: 'API Key',       placeholder: 'n8n_api_…',     description: 'Self-hosted workflow automation for complex multi-step blueprints.',    docsUrl: 'https://docs.n8n.io/api/',                      affiliateUrl: 'https://n8n.io/?sid=starks', testable: false },
  { key: 'ZAPIER_API_KEY',       name: 'Zapier',       category: 'automation',     icon: '⚡',  accent: 'orange',  label: 'API Key',       placeholder: 'zap-…',         description: '5,000+ app integrations for rapid automation prototyping.',             docsUrl: 'https://zapier.com/l/api/',                     affiliateUrl: 'https://zapier.com/?sid=starks', testable: false },
  { key: 'MAKE_API_KEY',         name: 'Make',         category: 'automation',     icon: '🔄',  accent: 'violet',  label: 'API Key',       placeholder: 'make-…',        description: 'Visual automation builder with advanced data transformation.',          docsUrl: 'https://www.make.com/en/api-documentation',     affiliateUrl: 'https://make.com/?sid=starks', testable: false },
  // ── Communication ──────────────────────────────────────────────────────────
  { key: 'SLACK_BOT_TOKEN',      name: 'Slack',        category: 'communication',  icon: '💬',  accent: 'emerald', label: 'Bot Token',     placeholder: 'xoxb-…',        description: 'Slack API for team notifications, alerts, and workflow automation.',      docsUrl: 'https://api.slack.com/authentication/token-types', affiliateUrl: 'https://slack.com/?sid=starks', testable: false },
  { key: 'DISCORD_BOT_TOKEN',    name: 'Discord',      category: 'communication',  icon: '🎮',  accent: 'violet',  label: 'Bot Token',     placeholder: 'MT…',            description: 'Discord Bot API for community management and automated notifications.',   docsUrl: 'https://discord.com/developers/applications',   affiliateUrl: null, testable: false },
  { key: 'TWILIO_AUTH_TOKEN',    name: 'Twilio',       category: 'communication',  icon: '📞',  accent: 'red',     label: 'Auth Token',    placeholder: 'AC…',            description: 'SMS, WhatsApp, and voice automation for outreach and alert blueprints.', docsUrl: 'https://console.twilio.com/',                   affiliateUrl: 'https://twilio.com/?sid=starks', testable: false },
  { key: 'BLAND_AI_API_KEY',     name: 'Bland AI',     category: 'communication',  icon: '🤙',  accent: 'violet',  label: 'API Key',       placeholder: 'bland_…',       description: 'AI phone call agent — automate outbound & inbound calls at scale.',       docsUrl: 'https://docs.bland.ai/',                        affiliateUrl: 'https://bland.ai/?sid=starks', testable: false },
  { key: 'OUTLOOK_CLIENT_SECRET',name: 'Outlook',      category: 'communication',  icon: '📮',  accent: 'blue',    label: 'Client Secret', placeholder: 'outlook_…',     description: 'Microsoft Outlook & Office 365 email for business automation blueprints.', docsUrl: 'https://learn.microsoft.com/en-us/graph/auth-register-app-v2', affiliateUrl: null, testable: false },
  // ── Infrastructure ─────────────────────────────────────────────────────────
  { key: 'CLOUDFLARE_API_KEY',   name: 'Cloudflare',   category: 'infrastructure', icon: '☁',   accent: 'amber',   label: 'API Key',       placeholder: 'Global API Key…', description: 'DNS, Workers, and CDN for deployment and hosting blueprints.',       docsUrl: 'https://dash.cloudflare.com/profile/api-tokens', affiliateUrl: null, testable: false },
  { key: 'SUPABASE_SERVICE_KEY', name: 'Supabase',     category: 'infrastructure', icon: '🗄',   accent: 'emerald', label: 'Service Key',   placeholder: 'eyJ…',           description: 'Managed Postgres + Auth + Storage for database-driven blueprints.',   docsUrl: 'https://supabase.com/dashboard/project/_/settings/api', affiliateUrl: 'https://supabase.com/?sid=starks', testable: false },
  { key: 'GMAIL_REFRESH_TOKEN',  name: 'Gmail',        category: 'infrastructure', icon: '✉',   accent: 'red',     label: 'Refresh Token', placeholder: '1//…',           description: 'Gmail API for email outreach and cold-email automation.',             docsUrl: 'https://developers.google.com/oauthplayground', affiliateUrl: null, testable: false },
  { key: 'AWS_ACCESS_KEY',       name: 'AWS',          category: 'infrastructure', icon: '☁',   accent: 'amber',   label: 'Access Key',    placeholder: 'AKIA…',          description: 'Amazon Web Services for cloud deployment and scaling blueprints.',     docsUrl: 'https://console.aws.amazon.com/iam/',           affiliateUrl: null, testable: false },
  { key: 'VERCEL_TOKEN',         name: 'Vercel',       category: 'infrastructure', icon: '▲',   accent: 'blue',    label: 'API Token',     placeholder: 'vercel_…',      description: 'Vercel serverless deployment for frontend and edge function blueprints.', docsUrl: 'https://vercel.com/account/tokens',             affiliateUrl: 'https://vercel.com/?sid=starks', testable: false },
  { key: 'NETLIFY_ACCESS_TOKEN', name: 'Netlify',      category: 'infrastructure', icon: '🌐',  accent: 'emerald', label: 'Access Token',  placeholder: 'netlify-…',     description: 'Netlify hosting and edge functions for JAMstack blueprint deployments.', docsUrl: 'https://app.netlify.com/user/applications',     affiliateUrl: 'https://netlify.com/?sid=starks', testable: false },
  { key: 'GITHUB_TOKEN',         name: 'GitHub',       category: 'infrastructure', icon: '🐙',  accent: 'violet',  label: 'Personal Access Token', placeholder: 'ghp_…',      description: 'GitHub API for code repositories, CI/CD pipelines, and automated PRs.',   docsUrl: 'https://github.com/settings/tokens',            affiliateUrl: null, testable: false },
  { key: 'DIGITALOCEAN_API_KEY', name: 'DigitalOcean', category: 'infrastructure', icon: '🌊',  accent: 'blue',    label: 'API Key',       placeholder: 'dop_v1_…',      description: 'DigitalOcean droplets and managed databases for cloud infrastructure.',  docsUrl: 'https://cloud.digitalocean.com/account/api/',   affiliateUrl: 'https://www.digitalocean.com/?sid=starks', testable: false },
  { key: 'RAILWAY_API_KEY',      name: 'Railway',      category: 'infrastructure', icon: '🚂',  accent: 'violet',  label: 'API Key',       placeholder: 'railway_…',     description: 'Railway PaaS for instant backend deployments and database hosting.',     docsUrl: 'https://railway.app/account/tokens',            affiliateUrl: 'https://railway.app/?sid=starks', testable: false },
  { key: 'RENDER_API_KEY',       name: 'Render',       category: 'infrastructure', icon: '⚙',   accent: 'emerald', label: 'API Key',       placeholder: 'rnd_…',         description: 'Render cloud for web services, static sites, and cron job blueprints.',  docsUrl: 'https://dashboard.render.com/u/settings',       affiliateUrl: 'https://render.com/?sid=starks', testable: false },
  // ── Databases ──────────────────────────────────────────────────────────────
  { key: 'MONGODB_URI',          name: 'MongoDB',      category: 'database',       icon: '🍃',  accent: 'emerald', label: 'Connection URI', placeholder: 'mongodb+srv://…', description: 'MongoDB Atlas for document storage in NoSQL-powered blueprint systems.', docsUrl: 'https://www.mongodb.com/docs/drivers/',         affiliateUrl: 'https://www.mongodb.com/cloud/atlas?sid=starks', testable: false },
  { key: 'MYSQL_CONNECTION_STR', name: 'MySQL',        category: 'database',       icon: '🐬',  accent: 'blue',    label: 'Connection String', placeholder: 'mysql://…',   description: 'MySQL database connection for relational data-driven blueprints.',       docsUrl: 'https://dev.mysql.com/doc/',                    affiliateUrl: null, testable: false },
  { key: 'AIRTABLE_API_KEY',     name: 'Airtable',     category: 'database',       icon: '📋',  accent: 'amber',   label: 'Personal Token', placeholder: 'pat…',          description: 'Airtable API for spreadsheet-database hybrid workflows and CRM pipelines.', docsUrl: 'https://airtable.com/developers/web/api/introduction', affiliateUrl: 'https://airtable.com/?sid=starks', testable: false },
  { key: 'NOTION_API_KEY',       name: 'Notion',       category: 'database',       icon: '📝',  accent: 'blue',    label: 'Integration Token', placeholder: 'secret_…',    description: 'Notion API — use as your business knowledge base and CRM/project tracker.', docsUrl: 'https://developers.notion.com/docs/getting-started', affiliateUrl: 'https://notion.so/?sid=starks', testable: false },
  { key: 'GOOGLE_SHEETS_KEY',    name: 'Google Sheets',category: 'database',       icon: '📊',  accent: 'emerald', label: 'Service Account Key', placeholder: '{"type":"service…', description: 'Google Sheets API for data logging, reporting, and spreadsheet automation.', docsUrl: 'https://developers.google.com/sheets/api/quickstart', affiliateUrl: null, testable: false },
  // ── Analytics ──────────────────────────────────────────────────────────────
  { key: 'GA4_MEASUREMENT_ID',   name: 'Google Analytics', category: 'analytics', icon: '📈',  accent: 'blue',    label: 'Measurement ID', placeholder: 'G-…',           description: 'Website and funnel analytics for performance tracking blueprints.',   docsUrl: 'https://analytics.google.com/',                 affiliateUrl: null, testable: false },
  { key: 'MIXPANEL_TOKEN',       name: 'Mixpanel',     category: 'analytics',      icon: '📊',  accent: 'violet',  label: 'Project Token', placeholder: 'mp-…',           description: 'Product analytics and user behavior tracking for SaaS blueprints.',   docsUrl: 'https://mixpanel.com/settings/project/',        affiliateUrl: 'https://mixpanel.com/?sid=starks', testable: false },
  { key: 'HOTJAR_SITE_ID',       name: 'Hotjar',       category: 'analytics',      icon: '🔥',  accent: 'red',     label: 'Site ID',       placeholder: '1234567',        description: 'Heatmaps and session recordings for conversion optimization.',         docsUrl: 'https://help.hotjar.com/hc/en-us',             affiliateUrl: 'https://hotjar.com/?sid=starks', testable: false },
  // ── CRM ────────────────────────────────────────────────────────────────────
  { key: 'HUBSPOT_API_KEY',      name: 'HubSpot',      category: 'crm',            icon: '🧡',  accent: 'orange',  label: 'API Key',       placeholder: 'hubspot-…',      description: 'CRM, pipelines, and sales automation for B2B income blueprints.',     docsUrl: 'https://developers.hubspot.com/',               affiliateUrl: 'https://hubspot.com/?sid=starks', testable: false },
  { key: 'SALESFORCE_TOKEN',     name: 'Salesforce',   category: 'crm',            icon: '☁',   accent: 'blue',    label: 'Access Token',  placeholder: '00D…',           description: 'Enterprise CRM and sales pipeline management for large-scale blueprints.', docsUrl: 'https://developer.salesforce.com/',         affiliateUrl: null, testable: false },
];

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  connected:       { label: 'Connected',          color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', dot: 'bg-emerald-400' },
  disconnected:    { label: 'Disconnected',        color: 'text-gray-500',    bg: 'bg-gray-500/10 border-gray-500/20',       dot: 'bg-gray-600'    },
  expired:         { label: 'Expired',             color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20',         dot: 'bg-red-400'     },
  needs_reconnect: { label: 'Needs Reconnect',     color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20',     dot: 'bg-amber-400'   },
  rate_limited:    { label: 'Rate Limited',        color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20',     dot: 'bg-amber-400'   },
  invalid:         { label: 'Invalid Credentials', color: 'text-rose-400',    bg: 'bg-rose-400/10 border-rose-400/20',       dot: 'bg-rose-400'    },
};

// ─── ACCENT COLOR MAP ─────────────────────────────────────────────────────────

const ACCENT = {
  blue:    { border: 'border-blue-500/20',    glow: 'from-blue-500/10',    icon: 'bg-blue-500/10 text-blue-400',    ring: 'ring-blue-400'    },
  violet:  { border: 'border-violet-500/20',  glow: 'from-violet-500/10',  icon: 'bg-violet-500/10 text-violet-400', ring: 'ring-violet-400' },
  orange:  { border: 'border-orange-500/20',  glow: 'from-orange-500/10',  icon: 'bg-orange-500/10 text-orange-400', ring: 'ring-orange-400' },
  pink:    { border: 'border-pink-500/20',    glow: 'from-pink-500/10',    icon: 'bg-pink-500/10 text-pink-400',    ring: 'ring-pink-400'    },
  red:     { border: 'border-red-500/20',     glow: 'from-red-500/10',     icon: 'bg-red-500/10 text-red-400',      ring: 'ring-red-400'     },
  emerald: { border: 'border-emerald-500/20', glow: 'from-emerald-500/10', icon: 'bg-emerald-500/10 text-emerald-400', ring: 'ring-emerald-400' },
  amber:   { border: 'border-amber-500/20',   glow: 'from-amber-500/10',   icon: 'bg-amber-500/10 text-amber-400',  ring: 'ring-amber-400'   },
};

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── CONNECT / EDIT SLIDE-OVER ────────────────────────────────────────────────

function ConnectSlideOver({ integration, existingData, userId, onClose, onSaved }) {
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  const handleSave = async () => {
    if (!value.trim()) { toast.error('Please enter a value'); return; }
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/user-credentials', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId,
          credentialKey: integration.key,
          encryptedValue: btoa(value.trim()),
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(`${integration.name} ${existingData ? 'updated' : 'connected'}`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!existingData) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/user-credentials/${existingData.id}/test`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.ok) {
        toast.success(`${integration.name}: ${data.message}`);
      } else {
        toast.error(`${integration.name}: ${data.message}`);
      }
      onSaved();
    } catch (err) {
      setTestResult({ ok: false, message: 'Test request failed' });
    } finally {
      setTesting(false);
    }
  };

  const ac = ACCENT[integration.accent] ?? ACCENT.blue;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-950 border-l border-white/5 h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="border-b border-white/5 px-6 py-5 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${ac.icon}`}>
            {integration.icon}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              {existingData ? 'Update' : 'Connect'} {integration.name}
            </h2>
            <p className="text-xs text-gray-500">{integration.label} · {CATEGORIES.find(c => c.id === integration.category)?.label}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-600 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-5">
          <p className="text-sm text-gray-400 leading-relaxed">{integration.description}</p>

          {existingData && (
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 text-sm">✓</span>
                <div>
                  <p className="text-xs font-semibold text-emerald-400">Currently Connected</p>
                  <p className="text-xs text-gray-500">Updated {timeAgo(existingData.updatedAt)}</p>
                </div>
              </div>
              {integration.testable && (
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-all disabled:opacity-50"
                >
                  {testing ? 'Testing…' : 'Test'}
                </button>
              )}
            </div>
          )}

          {testResult && (
            <div className={`rounded-xl border p-3 flex items-center gap-3 text-xs ${testResult.ok ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
              <span>{testResult.ok ? '✓' : '✗'}</span>
              <span>{testResult.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">
              {integration.label}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showValue ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder={existingData ? '••••••••••••••••' : integration.placeholder}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-white/20 pr-12"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowValue(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors text-sm"
              >
                {showValue ? '🙈' : '👁'}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">Stored with AES-256-GCM encryption. Never exposed in responses.</p>
          </div>

          <div className="rounded-xl bg-white/2 border border-white/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-300">Where to get your {integration.label}</p>
            <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1">
              {integration.docsUrl} ↗
            </a>
          </div>

          {integration.affiliateUrl && (
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
              <p className="text-xs font-semibold text-amber-400 mb-1">Don't have {integration.name}?</p>
              <a href={integration.affiliateUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-amber-300 hover:underline">
                Get {integration.name} ↗ (affiliate link)
              </a>
            </div>
          )}
        </div>

        <div className="border-t border-white/5 px-6 py-5 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !value.trim()}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
          >
            {saving ? 'Saving…' : existingData ? 'Update Credential' : 'Connect'}
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CUSTOM INTEGRATION MODAL ─────────────────────────────────────────────────

function CustomIntegrationModal({ userId, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const credKey = key.trim().toUpperCase().replace(/\s+/g, '_');

  const handleSave = async () => {
    if (!name.trim() || !credKey || !value.trim()) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/user-credentials', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId,
          credentialKey: credKey,
          encryptedValue: btoa(value.trim()),
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(`${name} connected`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-950 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Add Custom Integration</h2>
            <p className="text-xs text-gray-500 mt-0.5">Connect any API-based platform</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-1.5">Tool Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. My Custom API"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-1.5">Credential Key</label>
            <input
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="e.g. MY_CUSTOM_API_KEY"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            {credKey && credKey !== key.trim() && (
              <p className="text-xs text-gray-600 mt-1">Will be stored as: <span className="text-gray-400 font-mono">{credKey}</span></p>
            )}
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-1.5">Value</label>
            <input
              type="password"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="API key, token, or secret…"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !credKey || !value.trim()}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
          >
            {saving ? 'Saving…' : 'Add Integration'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONNECTION CARD ──────────────────────────────────────────────────────────

function ConnectionCard({ integration, credData, onConnect, onTest, testing }) {
  const isConnected = !!credData;
  const status = credData?.status ?? 'disconnected';
  const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.disconnected;
  const ac = ACCENT[integration.accent] ?? ACCENT.blue;
  const usedBy = credData?.usedBySystems ?? [];

  return (
    <div className={`relative rounded-2xl border ${isConnected ? ac.border : 'border-white/10'} bg-black/80 backdrop-blur-sm p-5 flex flex-col gap-4 transition-all hover:bg-black/90`}>

      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${ac.icon}`}>
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{integration.name}</span>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
            {isConnected && PUBLISHING_CRED_MAP[integration.key] && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/25">
                ✦ Publishing Ready
              </span>
            )}
          </div>
          <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">{integration.description}</p>
        </div>
      </div>

      {/* Metadata (only when connected) */}
      {isConnected && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/10 rounded-lg py-2 px-1">
            <p className="text-[10px] text-gray-400 mb-0.5">Last Sync</p>
            <p className="text-[11px] font-mono text-white">{timeAgo(credData.lastSyncAt || credData.updatedAt)}</p>
          </div>
          <div className="bg-white/10 rounded-lg py-2 px-1">
            <p className="text-[10px] text-gray-400 mb-0.5">Connected</p>
            <p className="text-[11px] font-mono text-white">{timeAgo(credData.connectedAt || credData.createdAt)}</p>
          </div>
          <div className="bg-white/10 rounded-lg py-2 px-1">
            <p className="text-[10px] text-gray-400 mb-0.5">Systems</p>
            <p className="text-[11px] font-mono text-white">{usedBy.length}</p>
          </div>
        </div>
      )}

      {/* Used By Systems */}
      {isConnected && usedBy.length > 0 && (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-600 mb-1.5">Used By</p>
          <div className="flex flex-wrap gap-1">
            {usedBy.slice(0, 4).map(s => (
              <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
                {s.name}
              </span>
            ))}
            {usedBy.length > 4 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500">
                +{usedBy.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Not connected — marketplace upsell */}
      {!isConnected && integration.affiliateUrl && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
          <p className="text-[10px] text-amber-400/80 mb-1">Don't have {integration.name}?</p>
          <a href={integration.affiliateUrl} target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-amber-300 hover:underline">
            Get {integration.name} → affiliate link ↗
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onConnect(integration)}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${isConnected ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-emerald-600/80 hover:bg-emerald-500 text-white'}`}
        >
          {isConnected ? 'Update' : 'Connect'}
        </button>
        {isConnected && integration.testable && (
          <button
            onClick={() => onTest(credData)}
            disabled={testing === credData?.id}
            className="px-3 py-2 rounded-xl text-xs bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5 transition-all disabled:opacity-50"
          >
            {testing === credData?.id ? '…' : 'Test'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── CUSTOM CONNECTION CARD ───────────────────────────────────────────────────

function CustomConnectionCard({ credData, onConnect, onDelete }) {
  const sc = STATUS_CONFIG[credData.status] ?? STATUS_CONFIG.disconnected;
  const usedBy = credData.usedBySystems ?? [];

  const handleDelete = async () => {
    if (!confirm(`Remove credential "${credData.credentialKey}"?`)) return;
    try {
      const res = await fetch(`/api/user-credentials/${credData.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Credential removed');
      onDelete();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="relative rounded-2xl border border-white/10 bg-black/80 p-5 flex flex-col gap-3 hover:bg-black/90 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-white/5 text-gray-400 shrink-0">⚙</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white font-mono">{credData.credentialKey}</span>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
          </div>
          <p className="text-xs text-gray-300 mt-0.5">Custom integration · updated {timeAgo(credData.updatedAt)}</p>
        </div>
      </div>
      {usedBy.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {usedBy.map(s => (
            <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => onConnect(credData.credentialKey)} className="flex-1 py-2 rounded-xl text-xs bg-white/5 hover:bg-white/10 text-gray-300 transition-all">
          Update
        </button>
        <button onClick={handleDelete} className="px-3 py-2 rounded-xl text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ConnectionsHubPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [credentials, setCredentials] = useState([]);   // from /api/user-credentials/summary
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [slideOver, setSlideOver] = useState(null);     // integration definition
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [testing, setTesting] = useState(null);         // credData.id being tested

  // Auto-open a specific integration if ?connect=KEY is in the URL
  useEffect(() => {
    const connectKey = searchParams.get('connect');
    if (connectKey) {
      const integration = CATALOG.find(i => i.key === connectKey);
      if (integration) setSlideOver(integration);
    }
  }, [searchParams]);

  const loadCredentials = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/user-credentials/summary', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load credentials');
      const data = await res.json();
      setCredentials(data);
    } catch (err) {
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadCredentials(); }, [loadCredentials]);

  // Map credentialKey → credential data for quick lookup
  const credMap = Object.fromEntries(credentials.map(c => [c.credentialKey, c]));

  // Health stats
  const connected = credentials.filter(c => c.status === 'connected').length;
  const warning = credentials.filter(c => ['needs_reconnect', 'rate_limited'].includes(c.status)).length;
  const expired = credentials.filter(c => c.status === 'expired').length;
  const disconnected = credentials.filter(c => c.status === 'disconnected').length;
  const invalid = credentials.filter(c => c.status === 'invalid').length;
  const total = credentials.length;
  const catalogConnected = CATALOG.filter(i => credMap[i.key]).length;

  // Known keys from catalog
  const catalogKeys = new Set(CATALOG.map(i => i.key));
  // Custom credentials = those not in the catalog
  const customCreds = credentials.filter(c => !catalogKeys.has(c.credentialKey));

  // Filtered integrations for catalog view
  const filteredCatalog = CATALOG.filter(integration => {
    if (activeCategory !== 'all' && integration.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return integration.name.toLowerCase().includes(q) || integration.description.toLowerCase().includes(q);
    }
    return true;
  });

  // Quick-test a connection
  const handleQuickTest = async (credData) => {
    if (!credData) return;
    setTesting(credData.id);
    try {
      const res = await fetch(`/api/user-credentials/${credData.id}/test`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`✓ ${data.message}`);
      } else {
        toast.error(`✗ ${data.message}`);
      }
      await loadCredentials();
    } catch {
      toast.error('Test request failed');
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex-grow flex items-center justify-center min-h-screen">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500 font-mono">Loading connections…</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {/* ── YouTube video background ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <iframe
          src="https://www.youtube.com/embed/z0KyhEobCC0?autoplay=1&mute=1&loop=1&playlist=z0KyhEobCC0&controls=0&showinfo=0&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3"
          allow="autoplay; encrypted-media"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: 'max(100vw, 177.78vh)', height: 'max(100vh, 56.25vw)', border: 'none' }}
          title="bg"
        />
        <div className="absolute inset-0 bg-black/78" />
      </div>

      {/* Slide-over */}
      {slideOver && (
        <ConnectSlideOver
          integration={slideOver}
          existingData={credMap[slideOver.key]}
          userId={currentUser?.id}
          onClose={() => setSlideOver(null)}
          onSaved={loadCredentials}
        />
      )}

      {/* Custom integration modal */}
      {showCustomModal && (
        <CustomIntegrationModal
          userId={currentUser?.id}
          onClose={() => setShowCustomModal(false)}
          onSaved={loadCredentials}
        />
      )}

      <main className="pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* ── PAGE HEADER ── */}
        <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-8">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground/60 hover:text-foreground transition-colors mb-4"
            >
              ← Return to Dashboard
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🔗</span>
              <h1 className="text-2xl font-bold text-white tracking-tight">Connections Hub</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {catalogConnected} / {CATALOG.length} CONNECTED
              </span>
            </div>
            <p className="text-sm text-gray-500 max-w-xl">
              Central source of truth for all credentials, API keys, OAuth tokens, and third-party integrations. Connect once — every AI-built system reuses these automatically.
            </p>
          </div>
          <button
            onClick={() => setShowCustomModal(true)}
            className="shrink-0 px-4 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-sm font-semibold transition-all flex items-center gap-2"
          >
            <span className="text-base leading-none">+</span> Custom Integration
          </button>
        </div>

        {/* ── HEALTH DASHBOARD ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total',        value: total,        color: 'text-white',        sub: 'credentials stored'   },
            { label: 'Healthy',      value: connected,    color: 'text-emerald-400',  sub: 'connected & valid'    },
            { label: 'Warning',      value: warning,      color: 'text-amber-400',    sub: 'needs attention'      },
            { label: 'Expired',      value: expired + invalid, color: 'text-red-400', sub: 'invalid or expired'   },
            { label: 'Disconnected', value: disconnected, color: 'text-gray-500',     sub: 'not yet connected'    },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl bg-black/80 border border-white/10 px-4 py-3">
              <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
              <p className="text-xs font-semibold text-gray-300 mt-0.5">{stat.label}</p>
              <p className="text-[10px] text-gray-600">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* ── SEARCH + CATEGORY TABS ── */}
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search integrations…"
              className="w-full bg-black/70 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => {
              const count = cat.id === 'all'
                ? credentials.filter(c => catalogKeys.has(c.credentialKey)).length
                : credentials.filter(c => CATALOG.find(i => i.key === c.credentialKey && i.category === cat.id)).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeCategory === cat.id
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/10'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${activeCategory === cat.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-600'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── INTEGRATION GRID ── */}
        {filteredCatalog.length > 0 ? (
          <>
            {activeCategory === 'all' ? (
              // Grouped by category when showing all
              CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                const catItems = CATALOG.filter(i => {
                  if (i.category !== cat.id) return false;
                  if (search) {
                    const q = search.toLowerCase();
                    return i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
                  }
                  return true;
                });
                if (catItems.length === 0) return null;
                const catConnected = catItems.filter(i => credMap[i.key]).length;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-base">{cat.icon}</span>
                      <h2 className="text-xs font-mono uppercase tracking-widest text-gray-400">{cat.label}</h2>
                      <div className="flex-1 border-t border-white/5" />
                      <span className="text-xs text-gray-600 font-mono">{catConnected}/{catItems.length}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                      {catItems.map(integration => (
                        <ConnectionCard
                          key={integration.key}
                          integration={integration}
                          credData={credMap[integration.key]}
                          onConnect={setSlideOver}
                          onTest={handleQuickTest}
                          testing={testing}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCatalog.map(integration => (
                  <ConnectionCard
                    key={integration.key}
                    integration={integration}
                    credData={credMap[integration.key]}
                    onConnect={setSlideOver}
                    onTest={handleQuickTest}
                    testing={testing}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm text-gray-400">No integrations match "{search}"</p>
            <button onClick={() => setSearch('')} className="mt-3 text-xs text-blue-400 hover:underline">Clear search</button>
          </div>
        )}

        {/* ── CUSTOM INTEGRATIONS ── */}
        {customCreds.length > 0 && (
          <div className="border-t border-white/6 pt-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-base">⚙</span>
              <h2 className="text-xs font-mono uppercase tracking-widest text-gray-400">Custom Integrations</h2>
              <div className="flex-1 border-t border-white/5" />
              <span className="text-xs text-gray-600 font-mono">{customCreds.length} stored</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {customCreds.map(cred => (
                <CustomConnectionCard
                  key={cred.id}
                  credData={cred}
                  onConnect={(key) => {
                    const pseudo = {
                      key,
                      name: key,
                      label: 'Credential',
                      description: 'Custom integration credential',
                      icon: '⚙',
                      accent: 'blue',
                      placeholder: 'Value…',
                      docsUrl: '#',
                      affiliateUrl: null,
                      testable: false,
                    };
                    setSlideOver(pseudo);
                  }}
                  onDelete={loadCredentials}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── SECURITY NOTICE ── */}
        <div className="border-t border-white/6 pt-8">
          <div className="rounded-2xl bg-blue-500/5 border border-blue-500/10 p-5 flex gap-4">
            <span className="text-xl shrink-0">🔒</span>
            <div>
              <p className="text-xs font-bold text-blue-300 mb-1">AES-256-GCM Encryption</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                All credentials are encrypted at rest using AES-256-GCM with per-record initialization vectors. Values are never returned in API responses — only metadata is exposed. Credentials are decrypted exclusively inside build engine execution contexts and are never logged or cached.
              </p>
            </div>
          </div>
        </div>

      </div>
      </main>
    </AuthLayout>
  );
}
