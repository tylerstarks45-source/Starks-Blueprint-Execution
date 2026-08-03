// ─────────────────────────────────────────────────────────────────────────────
// Build 053 — BEB Extension Points (8)
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation";

export function declareBEBExtensionPoints(): void {
  declareExtensionPoint({
    id:          "beb.experience.created",
    description: "Fires when a new business experience is created",
    declaredBy:  "business-experience-builder",
  });
  declareExtensionPoint({
    id:          "beb.page.created",
    description: "Fires when a new experience page is created",
    declaredBy:  "business-experience-builder",
  });
  declareExtensionPoint({
    id:          "beb.theme.applied",
    description: "Fires when a theme is applied to an experience",
    declaredBy:  "business-experience-builder",
  });
  declareExtensionPoint({
    id:          "beb.seo.analyzed",
    description: "Fires when SEO analysis is run on an experience",
    declaredBy:  "business-experience-builder",
  });
  declareExtensionPoint({
    id:          "beb.template.registered",
    description: "Fires when an experience or page template is registered",
    declaredBy:  "business-experience-builder",
  });
  declareExtensionPoint({
    id:          "beb.snapshot.captured",
    description: "Fires when a BEB platform snapshot is captured",
    declaredBy:  "business-experience-builder",
  });
  declareExtensionPoint({
    id:          "beb.publishing.prepared",
    description: "Fires when an experience passes publishing preparation validation",
    declaredBy:  "business-experience-builder",
  });
  declareExtensionPoint({
    id:          "beb.maintenance.completed",
    description: "Fires when BEB maintenance cycle completes",
    declaredBy:  "business-experience-builder",
  });
}
