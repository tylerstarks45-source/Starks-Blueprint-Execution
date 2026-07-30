// ─── Executive Goal Engine — Public Surface (Build 008) ──────────────────────

export * from "./types";
export * from "./goal-services";
export {
  declareGoalExtensionPoints,
  registerGoalHook,
  fireGoalHooks,
  GOAL_EXTENSION_POINT_IDS,
} from "./goal-extension-points";
