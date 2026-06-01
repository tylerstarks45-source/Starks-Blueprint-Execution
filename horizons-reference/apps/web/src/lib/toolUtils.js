/**
 * Utility functions for tool filtering, sorting, and category diversity.
 */

export const applyCategoryDiversity = (tools, maxPerCategory = 2, limit = 6) => {
  if (!tools || !Array.isArray(tools)) return [];
  
  const categoryCounts = {};
  const result = [];
  const leftovers = [];

  for (const tool of tools) {
    const cat = tool.category || 'Uncategorized';
    if (!categoryCounts[cat]) categoryCounts[cat] = 0;

    if (categoryCounts[cat] < maxPerCategory) {
      result.push(tool);
      categoryCounts[cat]++;
    } else {
      leftovers.push(tool);
    }
    
    if (result.length === limit) break;
  }

  // If we don't have enough tools to meet the limit, fill with leftovers
  let i = 0;
  while (result.length < limit && i < leftovers.length) {
    result.push(leftovers[i]);
    i++;
  }

  return result.slice(0, limit);
};

export const getCategoryWeight = (category) => {
  const weights = {
    'Funnel & Email Tools': 100,
    'AI Video Tools': 90,
    'AI Marketing Tools': 85,
    'AI Automation Tools': 80,
    'AI Business Systems': 75,
    'AI Chatbots': 70,
    'Website Builders': 65,
    'Analytics Tools': 60,
    'AI Data Tools': 55,
    'AI Writing Tools': 50
  };
  return weights[category] || 40;
};