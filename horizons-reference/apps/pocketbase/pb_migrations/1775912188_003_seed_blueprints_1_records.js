/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blueprints");

  const record0 = new Record(collection);
    record0.set("name", "AI Affiliate Content Engine");
    record0.set("description", "A fully automated system designed to generate traffic and affiliate revenue using AI-generated content and short-form video.");
    record0.set("system_name", "AI Affiliate Content Engine");
    record0.set("required_tools", []);
    record0.set("system_details", "{'overview': 'This system generates consistent traffic using AI-powered content and converts that traffic into revenue through affiliate offers.', 'system_flow': ['AI generates content ideas and scripts', 'Content is turned into short-form videos', 'Videos are posted across platforms (YouTube Shorts, TikTok)', 'Traffic is driven to affiliate offers', 'Conversions generate revenue'], 'setup_steps': [{'step': 'STEP 1 - Choose a Niche', 'details': 'Pick a niche: AI tools, Fitness, Business, Tech'}, {'step': 'STEP 2 - Set Up Content Engine', 'details': 'Use AI to generate: Hooks, Scripts, Video ideas'}, {'step': 'STEP 3 - Create Short-Form Videos', 'details': 'Turn scripts into: 10-30 second videos, Vertical format'}, {'step': 'STEP 4 - Upload & Distribute', 'details': 'Post to: YouTube Shorts, TikTok, Instagram Reels'}, {'step': 'STEP 5 - Add Affiliate Links', 'details': 'Link: AI tools, Products, Landing pages'}, {'step': 'STEP 6 - Scale Output', 'details': 'Increase daily content volume, Test different hooks, Optimize performance'}], 'software_stack': ['AI Script Generator', 'Video Generation Tool', 'Content Editing Tool', 'Automation Platform', 'Analytics Tool'], 'tags': ['Automation', 'Affiliate', 'Content', 'Beginner Friendly'], 'revenue_model': 'Affiliate commissions from software tools and digital products', 'target_audience': ['Beginners', 'Content creators', 'Anyone wanting automated income systems']}");
  try {
    app.save(record0);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }
}, (app) => {
  // Rollback: record IDs not known, manual cleanup needed
})