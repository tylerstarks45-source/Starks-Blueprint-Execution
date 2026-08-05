import {
  pgTable, serial, integer, text, boolean, timestamp, jsonb, real, index, uniqueIndex
} from "drizzle-orm/pg-core";

// ─── commerce_catalogs ────────────────────────────────────────────────────────
export const commerceCatalogs = pgTable(
  "commerce_catalogs",
  {
    id:             serial("id").primaryKey(),
    catalogId:      text("catalog_id").notNull(),
    userId:         integer("user_id"),
    businessId:     integer("business_id"),
    title:          text("title").notNull(),
    description:    text("description"),
    catalogType:    text("catalog_type").notNull().default("general"),
    // general | digital | physical | services | subscriptions | courses | events | mixed
    status:         text("status").notNull().default("active"),
    // active | draft | archived
    defaultCurrency: text("default_currency").notNull().default("USD"),
    supportedCurrencies: jsonb("supported_currencies").default("[]"),
    productCount:   integer("product_count").notNull().default(0),
    serviceCount:   integer("service_count").notNull().default(0),
    offerCount:     integer("offer_count").notNull().default(0),
    isDefault:      boolean("is_default").default(false),
    tags:           jsonb("tags").default("[]"),
    metadata:       jsonb("metadata").default("{}"),
    createdAt:      timestamp("created_at").defaultNow(),
    updatedAt:      timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_commerce_catalogs_user").on(t.userId),
    index("idx_commerce_catalogs_business").on(t.businessId),
    uniqueIndex("idx_commerce_catalogs_id").on(t.catalogId),
  ]
);

// ─── commerce_products ────────────────────────────────────────────────────────
export const commerceProducts = pgTable(
  "commerce_products",
  {
    id:               serial("id").primaryKey(),
    productId:        text("product_id").notNull(),
    catalogId:        text("catalog_id"),
    userId:           integer("user_id"),
    businessId:       integer("business_id"),
    title:            text("title").notNull(),
    description:      text("description"),
    productType:      text("product_type").notNull(),
    // digital | physical | software | template | course | ebook | video | audio | image | license | other
    sku:              text("sku"),
    status:           text("status").notNull().default("draft"),
    // draft | active | paused | archived | out_of_stock
    basePrice:        real("base_price"),
    currency:         text("currency").notNull().default("USD"),
    hasVariants:      boolean("has_variants").default(false),
    variantCount:     integer("variant_count").default(0),
    inventoryPolicy:  text("inventory_policy").default("unlimited"),
    // unlimited | tracked | deny_on_out
    inventoryQty:     integer("inventory_qty"),
    isDigital:        boolean("is_digital").default(false),
    deliveryMetadata: jsonb("delivery_metadata").default("{}"),
    fulfillmentMetadata: jsonb("fulfillment_metadata").default("{}"),
    seoMetadata:      jsonb("seo_metadata").default("{}"),
    tags:             jsonb("tags").default("[]"),
    metadata:         jsonb("metadata").default("{}"),
    createdAt:        timestamp("created_at").defaultNow(),
    updatedAt:        timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_commerce_products_user").on(t.userId),
    index("idx_commerce_products_business").on(t.businessId),
    index("idx_commerce_products_catalog").on(t.catalogId),
    uniqueIndex("idx_commerce_products_id").on(t.productId),
  ]
);

// ─── commerce_services ────────────────────────────────────────────────────────
export const commerceServices = pgTable(
  "commerce_services",
  {
    id:              serial("id").primaryKey(),
    serviceId:       text("service_id").notNull(),
    catalogId:       text("catalog_id"),
    userId:          integer("user_id"),
    businessId:      integer("business_id"),
    title:           text("title").notNull(),
    description:     text("description"),
    serviceType:     text("service_type").notNull(),
    // consulting | retainer | coaching | implementation | maintenance | managed_service | training | audit | other
    deliveryMode:    text("delivery_mode").notNull().default("remote"),
    // remote | onsite | hybrid | async
    status:          text("status").notNull().default("available"),
    // available | paused | sold_out | archived
    basePrice:       real("base_price"),
    pricingModel:    text("pricing_model").default("fixed"),
    // fixed | hourly | daily | project | retainer | usage | custom
    currency:        text("currency").notNull().default("USD"),
    durationHours:   real("duration_hours"),
    capacityLimit:   integer("capacity_limit"),
    requiresBooking: boolean("requires_booking").default(false),
    bookingMetadata: jsonb("booking_metadata").default("{}"),
    deliverables:    jsonb("deliverables").default("[]"),
    tags:            jsonb("tags").default("[]"),
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
    updatedAt:       timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_commerce_services_user").on(t.userId),
    index("idx_commerce_services_business").on(t.businessId),
    uniqueIndex("idx_commerce_services_id").on(t.serviceId),
  ]
);

// ─── commerce_offers ─────────────────────────────────────────────────────────
export const commerceOffers = pgTable(
  "commerce_offers",
  {
    id:            serial("id").primaryKey(),
    offerId:       text("offer_id").notNull(),
    catalogId:     text("catalog_id"),
    userId:        integer("user_id"),
    businessId:    integer("business_id"),
    title:         text("title").notNull(),
    headline:      text("headline"),
    description:   text("description"),
    offerType:     text("offer_type").notNull(),
    // product | service | bundle | subscription | membership | course | consulting | license | other
    status:        text("status").notNull().default("draft"),
    // draft | active | expired | archived
    price:         real("price"),
    compareAtPrice: real("compare_at_price"),
    currency:      text("currency").notNull().default("USD"),
    pricingModelId: text("pricing_model_id"),
    productIds:    jsonb("product_ids").default("[]"),
    serviceIds:    jsonb("service_ids").default("[]"),
    valueProposition: jsonb("value_proposition").default("[]"),
    bonusMetadata:  jsonb("bonus_metadata").default("[]"),
    guaranteeMetadata: jsonb("guarantee_metadata").default("{}"),
    validFrom:     timestamp("valid_from"),
    validUntil:    timestamp("valid_until"),
    maxRedemptions: integer("max_redemptions"),
    redemptionCount: integer("redemption_count").default(0),
    conversionScore: real("conversion_score").default(0),
    tags:          jsonb("tags").default("[]"),
    metadata:      jsonb("metadata").default("{}"),
    createdAt:     timestamp("created_at").defaultNow(),
    updatedAt:     timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_commerce_offers_user").on(t.userId),
    index("idx_commerce_offers_business").on(t.businessId),
    uniqueIndex("idx_commerce_offers_id").on(t.offerId),
  ]
);

// ─── commerce_bundles ─────────────────────────────────────────────────────────
export const commerceBundles = pgTable(
  "commerce_bundles",
  {
    id:            serial("id").primaryKey(),
    bundleId:      text("bundle_id").notNull(),
    catalogId:     text("catalog_id"),
    userId:        integer("user_id"),
    businessId:    integer("business_id"),
    title:         text("title").notNull(),
    description:   text("description"),
    bundleType:    text("bundle_type").notNull().default("curated"),
    // curated | dynamic | subscription | limited
    status:        text("status").notNull().default("draft"),
    bundlePrice:   real("bundle_price"),
    currency:      text("currency").notNull().default("USD"),
    discountType:  text("discount_type").default("none"),
    // none | percentage | fixed | bogo
    discountValue: real("discount_value"),
    offerIds:      jsonb("offer_ids").default("[]"),
    productIds:    jsonb("product_ids").default("[]"),
    serviceIds:    jsonb("service_ids").default("[]"),
    savingsAmount: real("savings_amount"),
    isLimitedTime: boolean("is_limited_time").default(false),
    expiresAt:     timestamp("expires_at"),
    metadata:      jsonb("metadata").default("{}"),
    createdAt:     timestamp("created_at").defaultNow(),
    updatedAt:     timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_commerce_bundles_user").on(t.userId),
    index("idx_commerce_bundles_business").on(t.businessId),
    uniqueIndex("idx_commerce_bundles_id").on(t.bundleId),
  ]
);

// ─── commerce_variants ────────────────────────────────────────────────────────
export const commerceVariants = pgTable(
  "commerce_variants",
  {
    id:            serial("id").primaryKey(),
    variantId:     text("variant_id").notNull(),
    parentId:      text("parent_id").notNull(), // product_id or service_id
    parentType:    text("parent_type").notNull(), // product | service
    userId:        integer("user_id"),
    businessId:    integer("business_id"),
    title:         text("title").notNull(),
    sku:           text("sku"),
    price:         real("price"),
    compareAtPrice: real("compare_at_price"),
    currency:      text("currency").default("USD"),
    attributes:    jsonb("attributes").default("{}"),
    // e.g. { color: "blue", size: "L" }
    inventoryQty:  integer("inventory_qty"),
    isAvailable:   boolean("is_available").default(true),
    position:      integer("position").default(0),
    metadata:      jsonb("metadata").default("{}"),
    createdAt:     timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("idx_commerce_variants_parent").on(t.parentId),
    index("idx_commerce_variants_business").on(t.businessId),
    uniqueIndex("idx_commerce_variants_id").on(t.variantId),
  ]
);

// ─── pricing_models ───────────────────────────────────────────────────────────
export const pricingModels = pgTable(
  "pricing_models",
  {
    id:              serial("id").primaryKey(),
    modelId:         text("model_id").notNull(),
    userId:          integer("user_id"),
    businessId:      integer("business_id"),
    catalogId:       text("catalog_id"),
    title:           text("title").notNull(),
    modelType:       text("model_type").notNull(),
    // fixed | tiered | usage | hybrid | subscription | regional | promotional | contract | dynamic
    currency:        text("currency").notNull().default("USD"),
    baseAmount:      real("base_amount"),
    billingInterval: text("billing_interval"),
    // one_time | monthly | quarterly | annually | custom
    trialDays:       integer("trial_days"),
    setupFee:        real("setup_fee"),
    tiers:           jsonb("tiers").default("[]"),
    // [{ upTo: 100, unitPrice: 0.05 }, ...]
    usageMetric:     text("usage_metric"),
    regionOverrides: jsonb("region_overrides").default("{}"),
    isActive:        boolean("is_active").default(true),
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
    updatedAt:       timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_pricing_models_user").on(t.userId),
    index("idx_pricing_models_business").on(t.businessId),
    uniqueIndex("idx_pricing_models_id").on(t.modelId),
  ]
);

// ─── pricing_rules ────────────────────────────────────────────────────────────
export const pricingRules = pgTable(
  "pricing_rules",
  {
    id:          serial("id").primaryKey(),
    ruleId:      text("rule_id").notNull(),
    modelId:     text("model_id").notNull(),
    userId:      integer("user_id"),
    businessId:  integer("business_id"),
    ruleType:    text("rule_type").notNull(),
    // volume_discount | loyalty | geographic | seasonal | early_bird | bundle | custom
    conditions:  jsonb("conditions").default("{}"),
    effect:      jsonb("effect").notNull().default("{}"),
    // { type: "percentage_off", value: 10 }
    priority:    integer("priority").default(0),
    isActive:    boolean("is_active").default(true),
    metadata:    jsonb("metadata").default("{}"),
    createdAt:   timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("idx_pricing_rules_model").on(t.modelId),
    index("idx_pricing_rules_business").on(t.businessId),
    uniqueIndex("idx_pricing_rules_id").on(t.ruleId),
  ]
);

// ─── subscription_contracts ───────────────────────────────────────────────────
export const subscriptionContracts = pgTable(
  "subscription_contracts",
  {
    id:               serial("id").primaryKey(),
    contractId:       text("contract_id").notNull(),
    userId:           integer("user_id"),
    businessId:       integer("business_id"),
    customerId:       text("customer_id"),
    offerId:          text("offer_id"),
    pricingModelId:   text("pricing_model_id"),
    status:           text("status").notNull().default("pending"),
    // pending | trialing | active | past_due | paused | cancelled | expired
    planTitle:        text("plan_title"),
    amount:           real("amount"),
    currency:         text("currency").default("USD"),
    billingInterval:  text("billing_interval").notNull().default("monthly"),
    trialEndsAt:      timestamp("trial_ends_at"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd:   timestamp("current_period_end"),
    cancelledAt:      timestamp("cancelled_at"),
    cancellationReason: text("cancellation_reason"),
    gracePeriodDays:  integer("grace_period_days").default(0),
    renewalMetadata:  jsonb("renewal_metadata").default("{}"),
    upgradeMetadata:  jsonb("upgrade_metadata").default("{}"),
    metadata:         jsonb("metadata").default("{}"),
    createdAt:        timestamp("created_at").defaultNow(),
    updatedAt:        timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_subscription_contracts_user").on(t.userId),
    index("idx_subscription_contracts_business").on(t.businessId),
    index("idx_subscription_contracts_status").on(t.status),
    uniqueIndex("idx_subscription_contracts_id").on(t.contractId),
  ]
);

// ─── billing_profiles ─────────────────────────────────────────────────────────
export const billingProfiles = pgTable(
  "billing_profiles",
  {
    id:             serial("id").primaryKey(),
    profileId:      text("profile_id").notNull(),
    userId:         integer("user_id"),
    businessId:     integer("business_id"),
    customerId:     text("customer_id"),
    billingCycle:   text("billing_cycle").notNull().default("monthly"),
    currency:       text("currency").notNull().default("USD"),
    paymentGateway: text("payment_gateway"),
    // stripe | square | paypal | manual | other — adapter only, no execution
    invoicePrefix:  text("invoice_prefix"),
    autoInvoice:    boolean("auto_invoice").default(false),
    netTermsDays:   integer("net_terms_days").default(30),
    lateFeePct:     real("late_fee_pct"),
    taxExempt:      boolean("tax_exempt").default(false),
    metadata:       jsonb("metadata").default("{}"),
    createdAt:      timestamp("created_at").defaultNow(),
    updatedAt:      timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_billing_profiles_user").on(t.userId),
    index("idx_billing_profiles_business").on(t.businessId),
    uniqueIndex("idx_billing_profiles_id").on(t.profileId),
  ]
);

// ─── checkout_profiles ────────────────────────────────────────────────────────
export const checkoutProfiles = pgTable(
  "checkout_profiles",
  {
    id:                  serial("id").primaryKey(),
    checkoutId:          text("checkout_id").notNull(),
    userId:              integer("user_id"),
    businessId:          integer("business_id"),
    offerId:             text("offer_id"),
    status:              text("status").notNull().default("configuring"),
    // configuring | ready | incomplete | abandoned
    readinessScore:      real("readiness_score").default(0),
    // 0-100
    checkoutType:        text("checkout_type").default("standard"),
    // standard | one_click | subscription | installment
    requiredAssets:      jsonb("required_assets").default("[]"),
    // payment page, legal, terms, etc.
    validationResults:   jsonb("validation_results").default("[]"),
    conversionMetadata:  jsonb("conversion_metadata").default("{}"),
    abandonmentMetadata: jsonb("abandonment_metadata").default("{}"),
    readinessDiagnostics: jsonb("readiness_diagnostics").default("[]"),
    metadata:            jsonb("metadata").default("{}"),
    createdAt:           timestamp("created_at").defaultNow(),
    updatedAt:           timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_checkout_profiles_user").on(t.userId),
    index("idx_checkout_profiles_business").on(t.businessId),
    uniqueIndex("idx_checkout_profiles_id").on(t.checkoutId),
  ]
);

// ─── shopping_carts ───────────────────────────────────────────────────────────
export const shoppingCarts = pgTable(
  "shopping_carts",
  {
    id:           serial("id").primaryKey(),
    cartId:       text("cart_id").notNull(),
    userId:       integer("user_id"),
    businessId:   integer("business_id"),
    customerId:   text("customer_id"),
    status:       text("status").notNull().default("open"),
    // open | converted | abandoned | expired
    items:        jsonb("items").default("[]"),
    // [{ type, id, qty, price, currency }]
    subtotal:     real("subtotal").default(0),
    discountAmount: real("discount_amount").default(0),
    taxAmount:    real("tax_amount").default(0),
    shippingAmount: real("shipping_amount").default(0),
    total:        real("total").default(0),
    currency:     text("currency").default("USD"),
    appliedCoupons: jsonb("applied_coupons").default("[]"),
    metadata:     jsonb("metadata").default("{}"),
    expiresAt:    timestamp("expires_at"),
    convertedAt:  timestamp("converted_at"),
    createdAt:    timestamp("created_at").defaultNow(),
    updatedAt:    timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_shopping_carts_user").on(t.userId),
    index("idx_shopping_carts_business").on(t.businessId),
    index("idx_shopping_carts_status").on(t.status),
    uniqueIndex("idx_shopping_carts_id").on(t.cartId),
  ]
);

// ─── quotes ───────────────────────────────────────────────────────────────────
export const quotes = pgTable(
  "quotes",
  {
    id:             serial("id").primaryKey(),
    quoteId:        text("quote_id").notNull(),
    userId:         integer("user_id"),
    businessId:     integer("business_id"),
    customerId:     text("customer_id"),
    title:          text("title").notNull(),
    description:    text("description"),
    status:         text("status").notNull().default("draft"),
    // draft | sent | viewed | accepted | declined | expired | converted
    lineItems:      jsonb("line_items").default("[]"),
    subtotal:       real("subtotal"),
    discountAmount: real("discount_amount"),
    taxAmount:      real("tax_amount"),
    total:          real("total"),
    currency:       text("currency").default("USD"),
    validUntil:     timestamp("valid_until"),
    terms:          text("terms"),
    notes:          text("notes"),
    sentAt:         timestamp("sent_at"),
    viewedAt:       timestamp("viewed_at"),
    acceptedAt:     timestamp("accepted_at"),
    declinedAt:     timestamp("declined_at"),
    convertedToContractId: text("converted_to_contract_id"),
    metadata:       jsonb("metadata").default("{}"),
    createdAt:      timestamp("created_at").defaultNow(),
    updatedAt:      timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_quotes_user").on(t.userId),
    index("idx_quotes_business").on(t.businessId),
    index("idx_quotes_status").on(t.status),
    uniqueIndex("idx_quotes_id").on(t.quoteId),
  ]
);

// ─── proposals ────────────────────────────────────────────────────────────────
export const proposals = pgTable(
  "proposals",
  {
    id:            serial("id").primaryKey(),
    proposalId:    text("proposal_id").notNull(),
    userId:        integer("user_id"),
    businessId:    integer("business_id"),
    customerId:    text("customer_id"),
    title:         text("title").notNull(),
    executiveSummary: text("executive_summary"),
    status:        text("status").notNull().default("draft"),
    // draft | review | sent | viewed | accepted | declined | expired
    sections:      jsonb("sections").default("[]"),
    // [{ title, content, order }]
    totalValue:    real("total_value"),
    currency:      text("currency").default("USD"),
    validUntil:    timestamp("valid_until"),
    acceptedAt:    timestamp("accepted_at"),
    declinedAt:    timestamp("declined_at"),
    metadata:      jsonb("metadata").default("{}"),
    createdAt:     timestamp("created_at").defaultNow(),
    updatedAt:     timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_proposals_user").on(t.userId),
    index("idx_proposals_business").on(t.businessId),
    index("idx_proposals_status").on(t.status),
    uniqueIndex("idx_proposals_id").on(t.proposalId),
  ]
);

// ─── contracts ────────────────────────────────────────────────────────────────
export const contracts = pgTable(
  "contracts",
  {
    id:              serial("id").primaryKey(),
    contractDocId:   text("contract_doc_id").notNull(),
    // separate from subscription_contracts — this is a legal/commercial contract document
    userId:          integer("user_id"),
    businessId:      integer("business_id"),
    customerId:      text("customer_id"),
    title:           text("title").notNull(),
    contractType:    text("contract_type").notNull(),
    // service_agreement | nda | msa | sow | retainer | partnership | license | custom
    status:          text("status").notNull().default("draft"),
    // draft | review | sent | signed | active | expired | terminated
    totalValue:      real("total_value"),
    currency:        text("currency").default("USD"),
    termStartDate:   timestamp("term_start_date"),
    termEndDate:     timestamp("term_end_date"),
    renewalTerms:    text("renewal_terms"),
    clauses:         jsonb("clauses").default("[]"),
    signedAt:        timestamp("signed_at"),
    signedByCustomer: boolean("signed_by_customer").default(false),
    signedByBusiness: boolean("signed_by_business").default(false),
    terminatedAt:    timestamp("terminated_at"),
    terminationReason: text("termination_reason"),
    relatedQuoteId:  text("related_quote_id"),
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
    updatedAt:       timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_contracts_user").on(t.userId),
    index("idx_contracts_business").on(t.businessId),
    index("idx_contracts_status").on(t.status),
    uniqueIndex("idx_contracts_doc_id").on(t.contractDocId),
  ]
);

// ─── invoice_profiles ─────────────────────────────────────────────────────────
export const invoiceProfiles = pgTable(
  "invoice_profiles",
  {
    id:              serial("id").primaryKey(),
    invoiceId:       text("invoice_id").notNull(),
    userId:          integer("user_id"),
    businessId:      integer("business_id"),
    customerId:      text("customer_id"),
    contractDocId:   text("contract_doc_id"),
    subscriptionContractId: text("subscription_contract_id"),
    title:           text("title"),
    status:          text("status").notNull().default("draft"),
    // draft | sent | viewed | paid | partial | overdue | void | refunded
    lineItems:       jsonb("line_items").default("[]"),
    subtotal:        real("subtotal"),
    discountAmount:  real("discount_amount"),
    taxAmount:       real("tax_amount"),
    total:           real("total"),
    amountPaid:      real("amount_paid").default(0),
    currency:        text("currency").default("USD"),
    dueDate:         timestamp("due_date"),
    paidAt:          timestamp("paid_at"),
    notes:           text("notes"),
    paymentGateway:  text("payment_gateway"),
    // reference only — payment execution is via adapters
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
    updatedAt:       timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_invoice_profiles_user").on(t.userId),
    index("idx_invoice_profiles_business").on(t.businessId),
    index("idx_invoice_profiles_status").on(t.status),
    uniqueIndex("idx_invoice_profiles_id").on(t.invoiceId),
  ]
);

// ─── promotion_rules ─────────────────────────────────────────────────────────
export const promotionRules = pgTable(
  "promotion_rules",
  {
    id:             serial("id").primaryKey(),
    promotionId:    text("promotion_id").notNull(),
    userId:         integer("user_id"),
    businessId:     integer("business_id"),
    title:          text("title").notNull(),
    promotionType:  text("promotion_type").notNull(),
    // flash_sale | seasonal | launch | loyalty | referral | affiliate | clearance | event
    status:         text("status").notNull().default("active"),
    discountType:   text("discount_type").notNull(),
    // percentage | fixed | bogo | free_shipping | gift | custom
    discountValue:  real("discount_value"),
    minimumOrder:   real("minimum_order"),
    appliesTo:      jsonb("applies_to").default("{}"),
    // { type: "all" | "catalog" | "product" | "category", ids: [] }
    startsAt:       timestamp("starts_at"),
    endsAt:         timestamp("ends_at"),
    maxUses:        integer("max_uses"),
    usedCount:      integer("used_count").default(0),
    metadata:       jsonb("metadata").default("{}"),
    createdAt:      timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("idx_promotion_rules_user").on(t.userId),
    index("idx_promotion_rules_business").on(t.businessId),
    uniqueIndex("idx_promotion_rules_id").on(t.promotionId),
  ]
);

// ─── discount_rules ──────────────────────────────────────────────────────────
export const discountRules = pgTable(
  "discount_rules",
  {
    id:             serial("id").primaryKey(),
    discountRuleId: text("discount_rule_id").notNull(),
    userId:         integer("user_id"),
    businessId:     integer("business_id"),
    code:           text("code"),
    title:          text("title").notNull(),
    discountType:   text("discount_type").notNull(),
    // percentage | fixed | free_shipping | buy_x_get_y
    discountValue:  real("discount_value"),
    minimumPurchase: real("minimum_purchase"),
    maximumDiscount: real("maximum_discount"),
    isPublic:       boolean("is_public").default(false),
    isStackable:    boolean("is_stackable").default(false),
    startsAt:       timestamp("starts_at"),
    expiresAt:      timestamp("expires_at"),
    maxUses:        integer("max_uses"),
    usedCount:      integer("used_count").default(0),
    isActive:       boolean("is_active").default(true),
    metadata:       jsonb("metadata").default("{}"),
    createdAt:      timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("idx_discount_rules_user").on(t.userId),
    index("idx_discount_rules_business").on(t.businessId),
    uniqueIndex("idx_discount_rules_id").on(t.discountRuleId),
  ]
);

// ─── tax_profiles ─────────────────────────────────────────────────────────────
export const taxProfiles = pgTable(
  "tax_profiles",
  {
    id:            serial("id").primaryKey(),
    taxProfileId:  text("tax_profile_id").notNull(),
    userId:        integer("user_id"),
    businessId:    integer("business_id"),
    title:         text("title").notNull(),
    taxType:       text("tax_type").notNull(),
    // sales_tax | vat | gst | hst | custom
    defaultRate:   real("default_rate"),
    // percentage, e.g. 8.5 for 8.5%
    isInclusive:   boolean("is_inclusive").default(false),
    // is tax included in listed price
    regionRates:   jsonb("region_rates").default("{}"),
    // { "US-CA": 10.25, "GB": 20.0 }
    exemptions:    jsonb("exemptions").default("[]"),
    taxProvider:   text("tax_provider"),
    // manual | avalara | taxjar | custom — reference only
    isActive:      boolean("is_active").default(true),
    metadata:      jsonb("metadata").default("{}"),
    createdAt:     timestamp("created_at").defaultNow(),
    updatedAt:     timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_tax_profiles_user").on(t.userId),
    index("idx_tax_profiles_business").on(t.businessId),
    uniqueIndex("idx_tax_profiles_id").on(t.taxProfileId),
  ]
);

// ─── shipping_profiles ────────────────────────────────────────────────────────
export const shippingProfiles = pgTable(
  "shipping_profiles",
  {
    id:               serial("id").primaryKey(),
    shippingProfileId: text("shipping_profile_id").notNull(),
    userId:           integer("user_id"),
    businessId:       integer("business_id"),
    title:            text("title").notNull(),
    shippingType:     text("shipping_type").notNull(),
    // free | flat_rate | weight_based | carrier_calculated | local_delivery | digital
    flatRate:         real("flat_rate"),
    currency:         text("currency").default("USD"),
    freeThreshold:    real("free_threshold"),
    // order amount above which shipping is free
    shippingZones:    jsonb("shipping_zones").default("[]"),
    // [{ countries: [], rates: [] }]
    carriers:         jsonb("carriers").default("[]"),
    estimatedDays:    jsonb("estimated_days").default("{}"),
    // { min: 3, max: 7 }
    isActive:         boolean("is_active").default(true),
    metadata:         jsonb("metadata").default("{}"),
    createdAt:        timestamp("created_at").defaultNow(),
    updatedAt:        timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_shipping_profiles_user").on(t.userId),
    index("idx_shipping_profiles_business").on(t.businessId),
    uniqueIndex("idx_shipping_profiles_id").on(t.shippingProfileId),
  ]
);

// ─── revenue_streams ──────────────────────────────────────────────────────────
export const revenueStreams = pgTable(
  "revenue_streams",
  {
    id:               serial("id").primaryKey(),
    streamId:         text("stream_id").notNull(),
    userId:           integer("user_id"),
    businessId:       integer("business_id"),
    title:            text("title").notNull(),
    streamType:       text("stream_type").notNull(),
    // digital_products | physical_products | services | subscriptions | memberships
    // courses | consulting | retainers | licensing | usage_billing | marketplace
    // affiliate | partner | advertising | lead_sales | booking | invoices | other
    status:           text("status").notNull().default("active"),
    // active | projected | inactive | archived
    estimatedMonthlyRevenue: real("estimated_monthly_revenue"),
    currency:         text("currency").default("USD"),
    revenueMetadata:  jsonb("revenue_metadata").default("{}"),
    concentrationRisk: real("concentration_risk").default(0),
    // 0-1, how concentrated revenue is in this stream
    growthVelocity:   real("growth_velocity").default(0),
    averageOrderValue: real("average_order_value"),
    customerLifetimeValue: real("customer_lifetime_value"),
    conversionRate:   real("conversion_rate"),
    tags:             jsonb("tags").default("[]"),
    metadata:         jsonb("metadata").default("{}"),
    createdAt:        timestamp("created_at").defaultNow(),
    updatedAt:        timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_revenue_streams_user").on(t.userId),
    index("idx_revenue_streams_business").on(t.businessId),
    index("idx_revenue_streams_type").on(t.streamType),
    uniqueIndex("idx_revenue_streams_id").on(t.streamId),
  ]
);

// ─── revenue_forecasts ────────────────────────────────────────────────────────
export const revenueForecasts = pgTable(
  "revenue_forecasts",
  {
    id:                    serial("id").primaryKey(),
    forecastId:            text("forecast_id").notNull(),
    userId:                integer("user_id"),
    businessId:            integer("business_id"),
    title:                 text("title").notNull(),
    forecastPeriod:        text("forecast_period").notNull(),
    // monthly | quarterly | annual
    periodStart:           timestamp("period_start").notNull(),
    periodEnd:             timestamp("period_end").notNull(),
    projectedRevenue:      real("projected_revenue"),
    currency:              text("currency").default("USD"),
    confidenceScore:       real("confidence_score").default(0),
    // 0-100
    streamBreakdown:       jsonb("stream_breakdown").default("{}"),
    // { streamId: amount }
    growthAssumptions:     jsonb("growth_assumptions").default("{}"),
    riskFactors:           jsonb("risk_factors").default("[]"),
    opportunityFactors:    jsonb("opportunity_factors").default("[]"),
    expansionOpportunities: jsonb("expansion_opportunities").default("[]"),
    baselineRevenue:       real("baseline_revenue"),
    metadata:              jsonb("metadata").default("{}"),
    createdAt:             timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("idx_revenue_forecasts_user").on(t.userId),
    index("idx_revenue_forecasts_business").on(t.businessId),
    uniqueIndex("idx_revenue_forecasts_id").on(t.forecastId),
  ]
);

// ─── commerce_registry ────────────────────────────────────────────────────────
// Mutable singleton per business — the only table updated in-place
export const commerceRegistry = pgTable(
  "commerce_registry",
  {
    id:                   serial("id").primaryKey(),
    registryId:           text("registry_id").notNull(),
    userId:               integer("user_id"),
    businessId:           integer("business_id"),
    totalCatalogs:        integer("total_catalogs").default(0),
    totalProducts:        integer("total_products").default(0),
    totalServices:        integer("total_services").default(0),
    totalOffers:          integer("total_offers").default(0),
    totalBundles:         integer("total_bundles").default(0),
    totalVariants:        integer("total_variants").default(0),
    totalPricingModels:   integer("total_pricing_models").default(0),
    totalSubscriptions:   integer("total_subscriptions").default(0),
    activeSubscriptions:  integer("active_subscriptions").default(0),
    totalContracts:       integer("total_contracts").default(0),
    totalQuotes:          integer("total_quotes").default(0),
    totalProposals:       integer("total_proposals").default(0),
    totalInvoices:        integer("total_invoices").default(0),
    totalRevenueStreams:   integer("total_revenue_streams").default(0),
    estimatedMonthlyRevenue: real("estimated_monthly_revenue").default(0),
    catalogHealthScore:   real("catalog_health_score").default(0),
    pricingCompletenessScore: real("pricing_completeness_score").default(0),
    checkoutReadinessScore: real("checkout_readiness_score").default(0),
    monetizationScore:    real("monetization_score").default(0),
    // overall commerce health 0-100
    missingMonetization:  jsonb("missing_monetization").default("[]"),
    openOpportunities:    jsonb("open_opportunities").default("[]"),
    governanceMetadata:   jsonb("governance_metadata").default("{}"),
    lastAnalyzedAt:       timestamp("last_analyzed_at"),
    metadata:             jsonb("metadata").default("{}"),
    createdAt:            timestamp("created_at").defaultNow(),
    updatedAt:            timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_commerce_registry_user").on(t.userId),
    uniqueIndex("idx_commerce_registry_business").on(t.businessId),
    uniqueIndex("idx_commerce_registry_id").on(t.registryId),
  ]
);

// ─── commerce_snapshots ───────────────────────────────────────────────────────
export const commerceSnapshots = pgTable(
  "commerce_snapshots",
  {
    id:                   serial("id").primaryKey(),
    snapshotId:           text("snapshot_id").notNull(),
    userId:               integer("user_id"),
    businessId:           integer("business_id"),
    totalCatalogs:        integer("total_catalogs").default(0),
    totalProducts:        integer("total_products").default(0),
    totalServices:        integer("total_services").default(0),
    totalOffers:          integer("total_offers").default(0),
    totalSubscriptions:   integer("total_subscriptions").default(0),
    activeSubscriptions:  integer("active_subscriptions").default(0),
    estimatedMonthlyRevenue: real("estimated_monthly_revenue").default(0),
    monetizationScore:    real("monetization_score").default(0),
    catalogHealthScore:   real("catalog_health_score").default(0),
    pricingCompletenessScore: real("pricing_completeness_score").default(0),
    metadata:             jsonb("metadata").default("{}"),
    createdAt:            timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("idx_commerce_snapshots_user").on(t.userId),
    index("idx_commerce_snapshots_business").on(t.businessId),
    uniqueIndex("idx_commerce_snapshots_id").on(t.snapshotId),
  ]
);

// ─── commerce_diagnostics ─────────────────────────────────────────────────────
export const commerceDiagnostics = pgTable(
  "commerce_diagnostics",
  {
    id:               serial("id").primaryKey(),
    diagnosticId:     text("diagnostic_id").notNull(),
    userId:           integer("user_id"),
    businessId:       integer("business_id"),
    engineName:       text("engine_name").notNull(),
    // catalog | pricing | subscription | checkout | revenue | governance
    severity:         text("severity").notNull(),
    // info | warning | critical
    category:         text("category").notNull(),
    // missing_monetization | weak_pricing | incomplete_catalog | missing_offers
    // customer_opportunity | revenue_concentration | compliance | other
    title:            text("title").notNull(),
    description:      text("description"),
    recommendation:   text("recommendation"),
    affectedObjectId: text("affected_object_id"),
    affectedObjectType: text("affected_object_type"),
    isResolved:       boolean("is_resolved").default(false),
    resolvedAt:       timestamp("resolved_at"),
    metadata:         jsonb("metadata").default("{}"),
    createdAt:        timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("idx_commerce_diagnostics_user").on(t.userId),
    index("idx_commerce_diagnostics_business").on(t.businessId),
    index("idx_commerce_diagnostics_severity").on(t.severity),
    uniqueIndex("idx_commerce_diagnostics_id").on(t.diagnosticId),
  ]
);
