import { declareExtensionPoint } from "../cognitive-foundation/index.js";

export function declareUBPEExtensionPoints(): void {
  const points = [
    { id: "ubpe.process.created",        description: "New business process defined in the canonical process layer",      declaredBy: "unified-business-process" },
    { id: "ubpe.stage.progressed",       description: "Process stage advanced or completed",                              declaredBy: "unified-business-process" },
    { id: "ubpe.rule.applied",           description: "Business rule evaluated and applied to a process",                 declaredBy: "unified-business-process" },
    { id: "ubpe.dependency.mapped",      description: "Process-to-process dependency edge recorded",                     declaredBy: "unified-business-process" },
    { id: "ubpe.bottleneck.detected",    description: "Optimization engine detected a bottleneck or SLA risk",            declaredBy: "unified-business-process" },
    { id: "ubpe.template.registered",    description: "Reusable process template registered",                            declaredBy: "unified-business-process" },
    { id: "ubpe.snapshot.captured",      description: "Platform-wide process intelligence snapshot recorded",            declaredBy: "unified-business-process" },
    { id: "ubpe.maintenance.completed",  description: "UBPE maintenance cycle completed",                               declaredBy: "unified-business-process" },
  ];
  for (const p of points) declareExtensionPoint(p);
}
