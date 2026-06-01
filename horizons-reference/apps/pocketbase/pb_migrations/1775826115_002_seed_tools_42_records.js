/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const record0 = new Record(collection);
    record0.set("name", "ChatGPT");
    record0.set("description", "Advanced AI chatbot for content creation and problem-solving");
    record0.set("full_description", "ChatGPT is an advanced AI language model that can assist with content creation, brainstorming, coding, and answering complex questions. It's widely used for customer service automation, content generation, and research.");
    record0.set("target_audience", "Content creators, developers, businesses");
    record0.set("category", "AI Software");
    record0.set("verified_use_case", true);
  try {
    app.save(record0);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record1 = new Record(collection);
    record1.set("name", "Claude");
    record1.set("description", "Anthropic's AI assistant for analysis and writing");
    record1.set("full_description", "Claude is a powerful AI assistant developed by Anthropic, known for its strong reasoning capabilities and nuanced understanding. It excels at analysis, writing, coding, and complex problem-solving tasks.");
    record1.set("target_audience", "Professionals, researchers, developers");
    record1.set("category", "AI Software");
    record1.set("verified_use_case", true);
  try {
    app.save(record1);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record2 = new Record(collection);
    record2.set("name", "Gemini");
    record2.set("description", "Google's multimodal AI model");
    record2.set("full_description", "Gemini is Google's advanced AI model that can process text, images, and other modalities. It's designed for complex reasoning and can handle various types of content analysis and generation.");
    record2.set("target_audience", "Enterprises, developers, content teams");
    record2.set("category", "AI Software");
    record2.set("verified_use_case", true);
  try {
    app.save(record2);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record3 = new Record(collection);
    record3.set("name", "Midjourney");
    record3.set("description", "AI image generation from text prompts");
    record3.set("full_description", "Midjourney is a leading AI image generation tool that creates high-quality images from text descriptions. It's popular for creative professionals, designers, and marketers who need visual content quickly.");
    record3.set("target_audience", "Designers, marketers, creative professionals");
    record3.set("category", "AI Software");
    record3.set("verified_use_case", true);
  try {
    app.save(record3);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record4 = new Record(collection);
    record4.set("name", "DALL-E");
    record4.set("description", "OpenAI's image generation AI");
    record4.set("full_description", "DALL-E is OpenAI's image generation model that creates unique images from text prompts. It's used for creating marketing materials, illustrations, and visual content for various applications.");
    record4.set("target_audience", "Designers, marketers, content creators");
    record4.set("category", "AI Software");
    record4.set("verified_use_case", true);
  try {
    app.save(record4);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record5 = new Record(collection);
    record5.set("name", "Runway");
    record5.set("description", "AI video generation and editing platform");
    record5.set("full_description", "Runway is an AI-powered video creation and editing platform that enables users to generate, edit, and enhance videos using artificial intelligence. It's used for content creation, marketing, and video production.");
    record5.set("target_audience", "Video creators, marketers, content producers");
    record5.set("category", "AI Software");
    record5.set("verified_use_case", true);
  try {
    app.save(record5);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record6 = new Record(collection);
    record6.set("name", "Jasper");
    record6.set("description", "AI copywriting and content generation tool");
    record6.set("full_description", "Jasper is an AI-powered writing assistant that helps create marketing copy, blog posts, social media content, and other written materials. It's designed for marketers and content creators.");
    record6.set("target_audience", "Marketers, content creators, copywriters");
    record6.set("category", "AI Software");
    record6.set("verified_use_case", true);
  try {
    app.save(record6);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record7 = new Record(collection);
    record7.set("name", "Copy.ai");
    record7.set("description", "AI writing assistant for marketing content");
    record7.set("full_description", "Copy.ai is an AI writing tool that generates marketing copy, product descriptions, social media posts, and other content. It's user-friendly and designed for businesses of all sizes.");
    record7.set("target_audience", "Small businesses, marketers, entrepreneurs");
    record7.set("category", "AI Software");
    record7.set("verified_use_case", true);
  try {
    app.save(record7);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record8 = new Record(collection);
    record8.set("name", "Convertkit");
    record8.set("description", "Email marketing platform for creators");
    record8.set("full_description", "ConvertKit is an email marketing platform specifically designed for creators, bloggers, and online educators. It offers email automation, landing pages, and subscriber management tools.");
    record8.set("target_audience", "Creators, bloggers, online educators");
    record8.set("category", "Funnel & Email Tools");
    record8.set("verified_use_case", true);
  try {
    app.save(record8);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record9 = new Record(collection);
    record9.set("name", "Mailchimp");
    record9.set("description", "Email marketing and automation platform");
    record9.set("full_description", "Mailchimp is a comprehensive email marketing platform offering email campaigns, automation, segmentation, and analytics. It's suitable for businesses of all sizes and includes CRM features.");
    record9.set("target_audience", "Small to medium businesses, marketers");
    record9.set("category", "Funnel & Email Tools");
    record9.set("verified_use_case", true);
  try {
    app.save(record9);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record10 = new Record(collection);
    record10.set("name", "ActiveCampaign");
    record10.set("description", "CRM and marketing automation platform");
    record10.set("full_description", "ActiveCampaign is a powerful CRM and marketing automation platform that combines email marketing, sales automation, and customer service tools. It's designed for growing businesses.");
    record10.set("target_audience", "Growing businesses, sales teams, marketers");
    record10.set("category", "Funnel & Email Tools");
    record10.set("verified_use_case", true);
  try {
    app.save(record10);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record11 = new Record(collection);
    record11.set("name", "Klaviyo");
    record11.set("description", "Email and SMS marketing for ecommerce");
    record11.set("full_description", "Klaviyo is a specialized email and SMS marketing platform for ecommerce businesses. It offers advanced segmentation, automation, and analytics specifically for online retailers.");
    record11.set("target_audience", "Ecommerce businesses, online retailers");
    record11.set("category", "Funnel & Email Tools");
    record11.set("verified_use_case", true);
  try {
    app.save(record11);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record12 = new Record(collection);
    record12.set("name", "GetResponse");
    record12.set("description", "Email marketing and sales funnel builder");
    record12.set("full_description", "GetResponse is an all-in-one email marketing and sales funnel platform. It includes email campaigns, landing pages, webinar hosting, and automation features.");
    record12.set("target_audience", "Online marketers, entrepreneurs, small businesses");
    record12.set("category", "Funnel & Email Tools");
    record12.set("verified_use_case", true);
  try {
    app.save(record12);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record13 = new Record(collection);
    record13.set("name", "ClickFunnels");
    record13.set("description", "Sales funnel and landing page builder");
    record13.set("full_description", "ClickFunnels is a dedicated sales funnel builder that helps create high-converting landing pages, sales pages, and complete sales funnels. It includes email integration and analytics.");
    record13.set("target_audience", "Online entrepreneurs, digital marketers, coaches");
    record13.set("category", "Funnel & Email Tools");
    record13.set("verified_use_case", true);
  try {
    app.save(record13);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record14 = new Record(collection);
    record14.set("name", "Leadpages");
    record14.set("description", "Landing page builder for lead generation");
    record14.set("full_description", "Leadpages is a landing page builder focused on lead generation and conversion optimization. It offers templates, A/B testing, and integration with email marketing platforms.");
    record14.set("target_audience", "Marketers, small businesses, lead generators");
    record14.set("category", "Funnel & Email Tools");
    record14.set("verified_use_case", true);
  try {
    app.save(record14);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record15 = new Record(collection);
    record15.set("name", "Unbounce");
    record15.set("description", "AI-powered landing page platform");
    record15.set("full_description", "Unbounce is an AI-powered landing page builder that helps create high-converting pages without coding. It includes dynamic content, A/B testing, and conversion analytics.");
    record15.set("target_audience", "Digital marketers, agencies, ecommerce");
    record15.set("category", "Funnel & Email Tools");
    record15.set("verified_use_case", true);
  try {
    app.save(record15);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record16 = new Record(collection);
    record16.set("name", "Wix");
    record16.set("description", "Website builder with drag-and-drop interface");
    record16.set("full_description", "Wix is a popular website builder offering drag-and-drop functionality, templates, and hosting. It's suitable for small businesses, portfolios, and online stores.");
    record16.set("target_audience", "Small businesses, freelancers, entrepreneurs");
    record16.set("category", "Website Builders");
    record16.set("verified_use_case", true);
  try {
    app.save(record16);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record17 = new Record(collection);
    record17.set("name", "Squarespace");
    record17.set("description", "Design-focused website builder");
    record17.set("full_description", "Squarespace is a design-focused website builder known for beautiful templates and professional aesthetics. It's popular for portfolios, blogs, and online stores.");
    record17.set("target_audience", "Designers, creatives, small businesses");
    record17.set("category", "Website Builders");
    record17.set("verified_use_case", true);
  try {
    app.save(record17);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record18 = new Record(collection);
    record18.set("name", "Webflow");
    record18.set("description", "Professional web design and development platform");
    record18.set("full_description", "Webflow is a professional web design platform that combines visual design with code-level control. It's used by designers and developers to create custom websites without traditional coding.");
    record18.set("target_audience", "Web designers, developers, agencies");
    record18.set("category", "Website Builders");
    record18.set("verified_use_case", true);
  try {
    app.save(record18);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record19 = new Record(collection);
    record19.set("name", "WordPress");
    record19.set("description", "Open-source website and blog platform");
    record19.set("full_description", "WordPress is the world's most popular website platform, powering millions of websites. It offers flexibility, extensibility, and a large ecosystem of plugins and themes.");
    record19.set("target_audience", "Bloggers, businesses, developers");
    record19.set("category", "Website Builders");
    record19.set("verified_use_case", true);
  try {
    app.save(record19);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record20 = new Record(collection);
    record20.set("name", "Shopify");
    record20.set("description", "Ecommerce platform for online stores");
    record20.set("full_description", "Shopify is a leading ecommerce platform that enables businesses to create and manage online stores. It includes payment processing, inventory management, and marketing tools.");
    record20.set("target_audience", "Online retailers, ecommerce businesses");
    record20.set("category", "Website Builders");
    record20.set("verified_use_case", true);
  try {
    app.save(record20);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record21 = new Record(collection);
    record21.set("name", "Zapier");
    record21.set("description", "Workflow automation connecting apps");
    record21.set("full_description", "Zapier is a workflow automation platform that connects thousands of apps, allowing users to automate tasks without coding. It's used for connecting tools and automating repetitive processes.");
    record21.set("target_audience", "Businesses, teams, entrepreneurs");
    record21.set("category", "Automation Systems");
    record21.set("verified_use_case", true);
  try {
    app.save(record21);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record22 = new Record(collection);
    record22.set("name", "Make (Integromat)");
    record22.set("description", "Visual workflow automation platform");
    record22.set("full_description", "Make is a visual automation platform that allows users to create complex workflows connecting multiple apps. It offers more advanced automation capabilities than basic tools.");
    record22.set("target_audience", "Advanced users, agencies, enterprises");
    record22.set("category", "Automation Systems");
    record22.set("verified_use_case", true);
  try {
    app.save(record22);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record23 = new Record(collection);
    record23.set("name", "n8n");
    record23.set("description", "Open-source workflow automation");
    record23.set("full_description", "n8n is an open-source workflow automation platform that can be self-hosted or cloud-based. It offers powerful automation capabilities with a visual workflow builder.");
    record23.set("target_audience", "Developers, enterprises, technical teams");
    record23.set("category", "Automation Systems");
    record23.set("verified_use_case", true);
  try {
    app.save(record23);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record24 = new Record(collection);
    record24.set("name", "IFTTT");
    record24.set("description", "Simple automation for everyday tasks");
    record24.set("full_description", "IFTTT (If This Then That) is a simple automation platform for connecting apps and automating everyday tasks. It's user-friendly and great for basic automation needs.");
    record24.set("target_audience", "General users, small businesses");
    record24.set("category", "Automation Systems");
    record24.set("verified_use_case", true);
  try {
    app.save(record24);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record25 = new Record(collection);
    record25.set("name", "Airtable");
    record25.set("description", "Database and workflow management platform");
    record25.set("full_description", "Airtable is a flexible database platform that combines spreadsheet simplicity with database power. It's used for project management, CRM, inventory tracking, and custom workflows.");
    record25.set("target_audience", "Teams, businesses, project managers");
    record25.set("category", "Automation Systems");
    record25.set("verified_use_case", true);
  try {
    app.save(record25);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record26 = new Record(collection);
    record26.set("name", "Salesforce");
    record26.set("description", "Enterprise CRM and sales platform");
    record26.set("full_description", "Salesforce is a leading enterprise CRM platform offering sales management, customer service, marketing automation, and analytics. It's designed for large organizations.");
    record26.set("target_audience", "Enterprise businesses, sales teams");
    record26.set("category", "Sales & Outreach");
    record26.set("verified_use_case", true);
  try {
    app.save(record26);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record27 = new Record(collection);
    record27.set("name", "HubSpot");
    record27.set("description", "All-in-one CRM and marketing platform");
    record27.set("full_description", "HubSpot is a comprehensive CRM platform offering sales, marketing, customer service, and operations tools. It's suitable for businesses of all sizes.");
    record27.set("target_audience", "Businesses, sales teams, marketers");
    record27.set("category", "Sales & Outreach");
    record27.set("verified_use_case", true);
  try {
    app.save(record27);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record28 = new Record(collection);
    record28.set("name", "Pipedrive");
    record28.set("description", "Sales CRM focused on pipeline management");
    record28.set("full_description", "Pipedrive is a sales CRM platform focused on pipeline management and deal tracking. It's designed to help sales teams close more deals efficiently.");
    record28.set("target_audience", "Sales teams, small to medium businesses");
    record28.set("category", "Sales & Outreach");
    record28.set("verified_use_case", true);
  try {
    app.save(record28);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record29 = new Record(collection);
    record29.set("name", "Outreach");
    record29.set("description", "Sales engagement platform");
    record29.set("full_description", "Outreach is a sales engagement platform that helps teams execute sales plays, manage sequences, and track engagement. It's designed for modern sales teams.");
    record29.set("target_audience", "Sales teams, enterprises");
    record29.set("category", "Sales & Outreach");
    record29.set("verified_use_case", true);
  try {
    app.save(record29);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record30 = new Record(collection);
    record30.set("name", "Apollo.io");
    record30.set("description", "Sales intelligence and outreach platform");
    record30.set("full_description", "Apollo.io is a sales intelligence platform that provides prospect data, email finding, and outreach automation. It's used for lead generation and sales prospecting.");
    record30.set("target_audience", "Sales teams, entrepreneurs, agencies");
    record30.set("category", "Sales & Outreach");
    record30.set("verified_use_case", true);
  try {
    app.save(record30);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record31 = new Record(collection);
    record31.set("name", "Hunter.io");
    record31.set("description", "Email finder and verification tool");
    record31.set("full_description", "Hunter.io is an email finding and verification tool that helps locate business email addresses. It's used for lead generation and outreach campaigns.");
    record31.set("target_audience", "Sales teams, marketers, recruiters");
    record31.set("category", "Sales & Outreach");
    record31.set("verified_use_case", true);
  try {
    app.save(record31);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record32 = new Record(collection);
    record32.set("name", "Clearbit");
    record32.set("description", "B2B data and intelligence platform");
    record32.set("full_description", "Clearbit is a B2B data and intelligence platform that provides company and person data. It's used for lead enrichment, account-based marketing, and sales intelligence.");
    record32.set("target_audience", "B2B businesses, sales teams, marketers");
    record32.set("category", "Sales & Outreach");
    record32.set("verified_use_case", true);
  try {
    app.save(record32);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record33 = new Record(collection);
    record33.set("name", "LinkedIn Sales Navigator");
    record33.set("description", "LinkedIn's sales prospecting tool");
    record33.set("full_description", "LinkedIn Sales Navigator is LinkedIn's premium tool for sales professionals to find and engage prospects. It offers advanced search, lead recommendations, and CRM integration.");
    record33.set("target_audience", "Sales professionals, B2B businesses");
    record33.set("category", "Sales & Outreach");
    record33.set("verified_use_case", true);
  try {
    app.save(record33);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record34 = new Record(collection);
    record34.set("name", "Google Analytics");
    record34.set("description", "Website traffic and user behavior analytics");
    record34.set("full_description", "Google Analytics is the most popular web analytics platform, providing insights into website traffic, user behavior, and conversion tracking. It's essential for understanding website performance.");
    record34.set("target_audience", "Website owners, marketers, businesses");
    record34.set("category", "Data & Intelligence");
    record34.set("verified_use_case", true);
  try {
    app.save(record34);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record35 = new Record(collection);
    record35.set("name", "Mixpanel");
    record35.set("description", "Product analytics and user insights");
    record35.set("full_description", "Mixpanel is a product analytics platform that tracks user behavior and provides insights for product optimization. It's used by product teams and growth marketers.");
    record35.set("target_audience", "Product teams, growth marketers, SaaS companies");
    record35.set("category", "Data & Intelligence");
    record35.set("verified_use_case", true);
  try {
    app.save(record35);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record36 = new Record(collection);
    record36.set("name", "Amplitude");
    record36.set("description", "Digital analytics and product intelligence");
    record36.set("full_description", "Amplitude is a digital analytics platform that provides product intelligence and user behavior insights. It's designed for product-driven companies.");
    record36.set("target_audience", "Product teams, tech companies, growth teams");
    record36.set("category", "Data & Intelligence");
    record36.set("verified_use_case", true);
  try {
    app.save(record36);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record37 = new Record(collection);
    record37.set("name", "Tableau");
    record37.set("description", "Business intelligence and data visualization");
    record37.set("full_description", "Tableau is a leading business intelligence platform for data visualization and analytics. It helps organizations understand data and make data-driven decisions.");
    record37.set("target_audience", "Enterprises, data analysts, business teams");
    record37.set("category", "Data & Intelligence");
    record37.set("verified_use_case", true);
  try {
    app.save(record37);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record38 = new Record(collection);
    record38.set("name", "Power BI");
    record38.set("description", "Microsoft's business intelligence platform");
    record38.set("full_description", "Power BI is Microsoft's business intelligence platform offering data visualization, analytics, and reporting. It integrates well with Microsoft products and enterprise systems.");
    record38.set("target_audience", "Enterprises, Microsoft users, data teams");
    record38.set("category", "Data & Intelligence");
    record38.set("verified_use_case", true);
  try {
    app.save(record38);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record39 = new Record(collection);
    record39.set("name", "Looker");
    record39.set("description", "Business intelligence and data platform");
    record39.set("full_description", "Looker is a business intelligence platform that enables data exploration, visualization, and sharing. It's designed for enterprises and data-driven organizations.");
    record39.set("target_audience", "Enterprises, data teams, analysts");
    record39.set("category", "Data & Intelligence");
    record39.set("verified_use_case", true);
  try {
    app.save(record39);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record40 = new Record(collection);
    record40.set("name", "Segment");
    record40.set("description", "Customer data platform");
    record40.set("full_description", "Segment is a customer data platform that collects, unifies, and activates customer data. It's used for data integration and customer analytics.");
    record40.set("target_audience", "Enterprises, marketing teams, product teams");
    record40.set("category", "Data & Intelligence");
    record40.set("verified_use_case", true);
  try {
    app.save(record40);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record41 = new Record(collection);
    record41.set("name", "Hotjar");
    record41.set("description", "Website heatmaps and user feedback");
    record41.set("full_description", "Hotjar is a tool for understanding user behavior through heatmaps, session recordings, and feedback. It helps optimize website user experience.");
    record41.set("target_audience", "Website owners, UX teams, marketers");
    record41.set("category", "Data & Intelligence");
    record41.set("verified_use_case", true);
  try {
    app.save(record41);
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