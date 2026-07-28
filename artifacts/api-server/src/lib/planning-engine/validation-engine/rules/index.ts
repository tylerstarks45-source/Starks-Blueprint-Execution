import type { ValidationRule } from "../types";
import { credentialRule } from "./credential-rule";
import { integrationRule } from "./integration-rule";
import { apiRequirementRule } from "./api-requirement-rule";
import { toolRequirementRule } from "./tool-requirement-rule";
import { fileRequirementRule } from "./file-requirement-rule";
import { approvalRule } from "./approval-rule";

// ─── Rule registry ──────────────────────────────────────────────────────────
// To add a new validation rule: write a file implementing `ValidationRule`
// and add it to this array. The engine core (../index.ts) never changes.
export const ALL_VALIDATION_RULES: ValidationRule[] = [
  credentialRule,
  integrationRule,
  apiRequirementRule,
  toolRequirementRule,
  fileRequirementRule,
  approvalRule,
];
