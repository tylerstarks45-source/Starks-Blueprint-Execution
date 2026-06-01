import { Router, type IRouter } from "express";
import healthRouter from "./health";
import blueprintCategoriesRouter from "./blueprint-categories";
import blueprintsRouter from "./blueprints";
import toolCategoriesRouter from "./tool-categories";
import toolsRouter from "./tools";
import affiliateLinksRouter from "./affiliate-links";
import usersRouter from "./users";
import systemInstancesRouter from "./system-instances";
import buildSessionsRouter from "./build-sessions";
import buildProgressRouter from "./build-progress";
import buildOutputsRouter from "./build-outputs";
import userMemoryRouter from "./user-memory";
import userCredentialsRouter from "./user-credentials";
import openrouterRouter from "./openrouter";
import adminRouter from "./admin";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(blueprintCategoriesRouter);
router.use(blueprintsRouter);
router.use(toolCategoriesRouter);
router.use(toolsRouter);
router.use(affiliateLinksRouter);
router.use(usersRouter);
router.use(systemInstancesRouter);
router.use(buildSessionsRouter);
router.use(buildProgressRouter);
router.use(buildOutputsRouter);
router.use(userMemoryRouter);
router.use(userCredentialsRouter);
router.use(openrouterRouter);
router.use(adminRouter);
router.use(notificationsRouter);

export default router;
