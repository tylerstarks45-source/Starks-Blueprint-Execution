// ─────────────────────────────────────────────────────────────────────────────
// Build 052 — UCE Extension Points (8)
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation";

export function declareUCEExtensionPoints(): void {
  declareExtensionPoint({
    id:          "uce.canvas.created",
    description: "Fires when a new canvas is registered in the registry",
    declaredBy:  "universal-canvas-engine",
  });
  declareExtensionPoint({
    id:          "uce.session.started",
    description: "Fires when a canvas editing session begins",
    declaredBy:  "universal-canvas-engine",
  });
  declareExtensionPoint({
    id:          "uce.history.recorded",
    description: "Fires when a canvas operation is appended to history",
    declaredBy:  "universal-canvas-engine",
  });
  declareExtensionPoint({
    id:          "uce.layer.registered",
    description: "Fires when a canvas layer is created",
    declaredBy:  "universal-canvas-engine",
  });
  declareExtensionPoint({
    id:          "uce.renderer.registered",
    description: "Fires when a canvas renderer is registered",
    declaredBy:  "universal-canvas-engine",
  });
  declareExtensionPoint({
    id:          "uce.snapshot.captured",
    description: "Fires when a UCE platform snapshot is captured",
    declaredBy:  "universal-canvas-engine",
  });
  declareExtensionPoint({
    id:          "uce.layout.applied",
    description: "Fires when alignment, distribution, or snap layout is applied to a selection",
    declaredBy:  "universal-canvas-engine",
  });
  declareExtensionPoint({
    id:          "uce.maintenance.completed",
    description: "Fires when the UCE maintenance cycle completes",
    declaredBy:  "universal-canvas-engine",
  });
}
