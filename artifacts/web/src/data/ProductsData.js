import { toolAffiliateLinks } from '@/config/toolAffiliateLinks.js';

// Images pool for matching to standard categories
const images = [
  "https://images.unsplash.com/photo-1684369176170-463e84248b70?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1567443024551-f3e3cc2be870?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1682056598904-9aa7ea5e8991?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1675023035272-3426884896f8?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80"
];

// Single source of truth: Generate product data from the affiliate config
export const productsData = Object.entries(toolAffiliateLinks)
  .map(([id, tool], index) => ({
    id,
    name: tool.name,
    category: tool.category,
    description: tool.description,
    image: images[index % images.length],
    cta_link: tool.affiliate_link || tool.cta_link,
    features: tool.features || [],
    use_cases: tool.useCases || tool.use_cases || [],
    targetAudience: tool.targetAudience || "",
    valueProposition: tool.valueProposition || "",
    social_proof: tool.socialProof ? [tool.socialProof] : (tool.social_proof || []),
    badges: tool.badge ? [tool.badge] : (tool.badges || []),
    customCTA: tool.customCTA || "Access Tool"
  }));