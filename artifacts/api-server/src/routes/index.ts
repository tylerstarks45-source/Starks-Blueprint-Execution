import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
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
import contactRouter from "./contact";
import userToolSelectionsRouter from "./user-tool-selections";
import buildEngineRouter from "./build-engine";
import subscriptionsRouter from "./subscriptions";
import creditsRouter from "./credits";
import adminAiRouter from "./admin-ai";
import dashboardRouter from "./dashboard";
import aiOrchestratorRouter from "./ai-orchestrator";
import skillsRouter from "./skills";
import connectorsRouter from "./connectors";
import runtimeRouter from "./runtime";
import chatSessionsRouter from "./chat-sessions";
import browserAgentRouter from "./browser-agent";
import ashToolsRouter from "./ash-tools";
import mediaGenRouter from "./media-gen";
import landingPagesRouter from "./landing-pages";
import userAffiliateLinksRouter from "./user-affiliate-links";
import emailMarketingRouter from "./email-marketing";
import domainsRouter from "./domains";
import publicPagesRouter from "./public-pages";
import scheduledTasksRouter from "./scheduled-tasks";
import revenueProvidersRouter from "./revenue-providers";
import publishingRouter from "./publishing";
import webhooksRouter from "./webhooks";
import abTestsRouter from "./ab-tests";
import referralsRouter from "./referrals";
import clientsRouter from "./clients";
import whiteLabelRouter from "./white-label";
import leaderboardRouter from "./leaderboard";
import researchRouter from "./research";
import developerRouter from "./developer";
import analyticsRouter from "./analytics";
import socialRouter from "./social";
import socialOAuthRouter from "./social-oauth";
import businessesRouter from "./businesses";
import businessHealthRouter from "./business-health";
import businessRecommendationsRouter from "./business-recommendations";
import approvalsRouter from "./approvals";
import monitoringRouter from "./monitoring";
import logsRouter from "./logs";
import executiveBrainRouter from "./executive-brain";
import executiveContextRouter from "./executive-context";
import executiveJudgmentRouter from "./executive-judgment";
import executiveGoalRouter from "./executive-goal";
import executivePlanRouter from "./executive-plan";
import executiveExecutionRouter from "./executive-execution";
import executiveObservationRouter from "./executive-observation";
import executiveReflectionRouter from "./executive-reflection";
import executiveLearningRouter from "./executive-learning";
import executiveGovernanceRouter from "./executive-governance";
import businessGraphRouter from "./business-graph";
import businessIntelligenceRouter from "./business-intelligence";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(contactRouter);
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
router.use(userToolSelectionsRouter);
router.use(buildEngineRouter);
router.use(subscriptionsRouter);
router.use(creditsRouter);
router.use(adminAiRouter);
router.use(dashboardRouter);
router.use(aiOrchestratorRouter);
router.use(skillsRouter);
router.use(connectorsRouter);
router.use(runtimeRouter);
router.use(chatSessionsRouter);
router.use(browserAgentRouter);
router.use(ashToolsRouter);
router.use(mediaGenRouter);
router.use(landingPagesRouter);
router.use(userAffiliateLinksRouter);
router.use(emailMarketingRouter);
router.use(domainsRouter);
router.use(publicPagesRouter);
router.use(scheduledTasksRouter);
router.use(revenueProvidersRouter);
router.use(publishingRouter);
router.use(webhooksRouter);
router.use(abTestsRouter);
router.use(referralsRouter);
router.use(clientsRouter);
router.use(whiteLabelRouter);
router.use(leaderboardRouter);
router.use(researchRouter);
router.use(developerRouter);
router.use(analyticsRouter);
router.use(socialRouter);
router.use(socialOAuthRouter);
// businessIntelligenceRouter must be mounted before businessesRouter: it
// defines GET /businesses/cross-business-summary, which would otherwise be
// shadowed by businesses.ts's GET /businesses/:id (Express would match
// "cross-business-summary" as :id and never reach the BI handler).
router.use(businessIntelligenceRouter);
router.use(businessesRouter);
router.use(businessHealthRouter);
router.use(businessRecommendationsRouter);
router.use(approvalsRouter);
router.use(monitoringRouter);
router.use(logsRouter);
router.use(executiveBrainRouter);
// Build 006: Executive Context Engine — context management, snapshots, diagnostics
router.use(executiveContextRouter);
// Build 007: Executive Judgment Engine — evaluate, compare, explain, risk, opportunity
router.use(executiveJudgmentRouter);
// Build 008: Executive Goal Engine — CRUD, hierarchy, priority, conflicts, progress, metrics
router.use(executiveGoalRouter);
// Build 009: Executive Planning Engine — generate, milestone, steps, history, dependencies, scoring
router.use(executivePlanRouter);
// Build 010: Executive Execution Engine — state machine, coordinator, steps, history, recovery, adapters
router.use(executiveExecutionRouter);
// Build 011: Executive Observation Engine — ingest, chains, signals, trends, anomalies, correlations
router.use("/api/executive-observation", executiveObservationRouter);
// Build 012: Executive Reflection Engine — cases, timelines, reports, factors, scores, evidence
router.use("/api/executive-reflection", executiveReflectionRouter);
// Build 013: Executive Principle Learning Engine — principles, patterns, graph, reports
router.use("/api/executive-learning", executiveLearningRouter);
// Build 014: Executive Governance & Adaptation Engine — policies, profiles, plans, rollback
router.use("/api/executive-governance", executiveGovernanceRouter);
// Build 015: Business Graph Engine — nodes, edges, KPIs, health, dependencies
router.use("/api/business-graph", businessGraphRouter);

export default router;
