// ─── Build 013: Executive Learning Extension Points ───────────────────────────

import { declareExtensionPoint } from "../cognitive-foundation/index";
import { LEARNING_EXTENSION_POINT_IDS } from "./types";

export function declareLearningExtensionPoints(): void {
  declareExtensionPoint({
    id: LEARNING_EXTENSION_POINT_IDS.PRINCIPLE_DISCOVERED,
    description: "A new Executive Principle has been extracted from a pattern.",
    declaredBy: "executive-principle-learning-engine",
  });

  declareExtensionPoint({
    id: LEARNING_EXTENSION_POINT_IDS.PRINCIPLE_VALIDATED,
    description: "An Executive Principle has passed validation and entered the Principle Library.",
    declaredBy: "executive-principle-learning-engine",
  });

  declareExtensionPoint({
    id: LEARNING_EXTENSION_POINT_IDS.PRINCIPLE_DEPRECATED,
    description: "An Executive Principle has been deprecated due to sustained contradiction.",
    declaredBy: "executive-principle-learning-engine",
  });

  declareExtensionPoint({
    id: LEARNING_EXTENSION_POINT_IDS.PRINCIPLE_CONTRADICTION,
    description: "New evidence contradicts a standing Executive Principle.",
    declaredBy: "executive-principle-learning-engine",
  });

  declareExtensionPoint({
    id: LEARNING_EXTENSION_POINT_IDS.PRINCIPLE_CONFIDENCE_UPDATED,
    description: "The confidence score of an Executive Principle has changed.",
    declaredBy: "executive-principle-learning-engine",
  });

  declareExtensionPoint({
    id: LEARNING_EXTENSION_POINT_IDS.LEARNING_CYCLE_COMPLETED,
    description: "A full learning cycle has completed (pattern → principle → validation).",
    declaredBy: "executive-principle-learning-engine",
  });

  declareExtensionPoint({
    id: LEARNING_EXTENSION_POINT_IDS.PRINCIPLE_GRAPH_UPDATED,
    description: "The Executive Principle Graph has new or updated edges.",
    declaredBy: "executive-principle-learning-engine",
  });

  declareExtensionPoint({
    id: LEARNING_EXTENSION_POINT_IDS.LEARNING_REPORT_PRODUCED,
    description: "A Learning Report summarizing the cycle has been persisted.",
    declaredBy: "executive-principle-learning-engine",
  });
}
