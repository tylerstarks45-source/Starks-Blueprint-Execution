// ── Build 047: Unified Workspace & Project System — types ────────────────────

export const UWPS_THROTTLE_CYCLES = 330; // EB integration — run init every 330 cycles

export const UWPS_EP_IDS = {
  BUSINESS_ORG:       "uwps.business_organization",
  PROJECT_LIFECYCLE:  "uwps.project_lifecycle",
  ASSET_REGISTRY:     "uwps.asset_registry",
  ASSET_RELATIONSHIPS:"uwps.asset_relationships",
  WORKSPACE_ACTIVITY: "uwps.workspace_activity",
  PROJECT_HEALTH:     "uwps.project_health",
  SEARCH:             "uwps.search",
  ADVISORY:           "uwps.advisory",
} as const;

export type AssetType =
  | "website" | "landing_page" | "saas" | "workflow" | "automation"
  | "knowledge_base" | "crm" | "api" | "database" | "dashboard"
  | "ai_agent" | "prompt_library" | "documentation" | "marketing_campaign"
  | "brand_kit" | "logo" | "image" | "video" | "document" | "source_code";

export type ProjectType =
  | "website" | "crm" | "automation" | "dashboard" | "saas" | "custom";

export type ProjectPhase =
  | "planning" | "building" | "testing" | "launched";

export type ProjectStatus =
  | "active" | "archived" | "completed" | "suspended";

export type AssetStatus =
  | "draft" | "active" | "deprecated" | "archived";

export type DeploymentStatus =
  | "undeployed" | "deployed" | "staging" | "failed";

export type RelationshipType =
  | "depends_on" | "uses" | "extends" | "replaces" | "references" | "generates" | "deploys_to" | "documents";

export type WorkspaceType =
  | "business" | "personal" | "team";

export interface BusinessWorkspace {
  id:            number;
  userId:        number;
  businessId:    number | null;
  orgId:         number | null;
  workspaceName: string;
  workspaceType: WorkspaceType;
  status:        string;
  configuration: Record<string, unknown>;
  createdAt:     Date;
  updatedAt:     Date;
}

export interface BusinessProject {
  id:          number;
  userId:      number;
  workspaceId: number | null;
  businessId:  number | null;
  projectName: string;
  projectType: ProjectType;
  description: string;
  status:      ProjectStatus;
  phase:       ProjectPhase;
  tags:        string[];
  templateId:  number | null;
  metadata:    Record<string, unknown>;
  createdAt:   Date;
  updatedAt:   Date;
}

export interface ProjectAsset {
  id:               number;
  userId:           number;
  projectId:        number;
  businessId:       number | null;
  workspaceId:      number | null;
  assetName:        string;
  assetType:        AssetType;
  assetStatus:      AssetStatus;
  currentVersion:   string;
  deploymentStatus: DeploymentStatus;
  externalRef:      string | null;
  checksum:         string | null;
  sizeBytes:        number | null;
  metadata:         Record<string, unknown>;
  createdAt:        Date;
  updatedAt:        Date;
}

export interface AssetRelationship {
  id:               number;
  sourceAssetId:    number;
  targetAssetId:    number;
  relationshipType: RelationshipType;
  strength:         "required" | "optional" | "informational";
  metadata:         Record<string, unknown>;
  createdAt:        Date;
}

export interface ProjectHealthScore {
  projectId:          number;
  overallScore:       number;
  completenessScore:  number;
  activityScore:      number;
  dependencyScore:    number;
  deploymentScore:    number;
  documentationScore: number;
  automationScore:    number;
  missingAssets:      string[];
  healthWarnings:     string[];
  recommendations:    string[];
  computedAt:         Date;
}

export interface ProjectRegistryEntry {
  projectId:    number;
  userId:       number;
  businessId:   number | null;
  workspaceId:  number | null;
  projectName:  string;
  projectType:  string;
  status:       string;
  assetCount:   number;
  healthScore:  number;
  lastActivity: Date | null;
  updatedAt:    Date;
}

export interface UWPSSummary {
  userId?:           number;
  totalBusinesses:   number;
  totalWorkspaces:   number;
  totalProjects:     number;
  totalAssets:       number;
  activeProjects:    number;
  deployedAssets:    number;
  avgHealthScore:    number;
  projectsSummary:   ProjectRegistryEntry[];
  recentActivity:    number;
  lawApplied:        boolean;
}

// ── Project Template definitions ──────────────────────────────────────────────

export interface ProjectTemplate {
  id:             number;
  templateName:   string;
  templateType:   string;
  description:    string;
  requiredAssets: AssetType[];
  optionalAssets: AssetType[];
  defaultPhase:   ProjectPhase;
  isBuiltin:      boolean;
  metadata:       Record<string, unknown>;
  createdAt:      Date;
}

// Built-in template asset requirements
export const BUILTIN_TEMPLATES: Array<{
  templateName: string;
  templateType: string;
  description:  string;
  requiredAssets: AssetType[];
  optionalAssets: AssetType[];
}> = [
  {
    templateName:   "Website Project",
    templateType:   "website",
    description:    "Standard website project with branding and content assets",
    requiredAssets: ["website", "brand_kit"],
    optionalAssets: ["landing_page", "documentation", "marketing_campaign", "logo", "image"],
  },
  {
    templateName:   "CRM Project",
    templateType:   "crm",
    description:    "Customer relationship management project with automation",
    requiredAssets: ["crm"],
    optionalAssets: ["workflow", "automation", "dashboard", "documentation"],
  },
  {
    templateName:   "Automation Project",
    templateType:   "automation",
    description:    "Workflow and automation project",
    requiredAssets: ["automation"],
    optionalAssets: ["workflow", "ai_agent", "prompt_library", "documentation"],
  },
  {
    templateName:   "SaaS Project",
    templateType:   "saas",
    description:    "Full SaaS product with all required assets",
    requiredAssets: ["saas", "database", "api"],
    optionalAssets: ["website", "dashboard", "documentation", "brand_kit", "ai_agent", "automation"],
  },
  {
    templateName:   "Dashboard Project",
    templateType:   "dashboard",
    description:    "Business intelligence and analytics dashboard",
    requiredAssets: ["dashboard"],
    optionalAssets: ["database", "api", "documentation", "automation"],
  },
];
