import express from 'express';
import SystemPlanner from '../../services/ai/SystemPlanner.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const planner = new SystemPlanner();
const planStore = new Map();

// POST /create - Create execution plan from blueprint
router.post('/create', async (req, res) => {
  const { blueprint } = req.body;

  if (!blueprint) {
    return res.status(400).json({
      error: 'Blueprint is required',
      code: 'MISSING_BLUEPRINT',
    });
  }

  try {
    const plan = planner.createExecutionPlan(blueprint);
    planStore.set(plan.id, plan);

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      planId: plan.id,
      blueprintId: plan.blueprintId,
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        stepCount: plan.steps.length,
        executionOrder: plan.executionOrder,
        estimatedDuration: plan.estimatedDuration,
        createdAt: plan.createdAt,
      },
    };

    logger.info(`Execution plan created: ${plan.id}`);
    res.json(response);
  } catch (error) {
    logger.error('Plan creation error:', error.message);
    throw error;
  }
});

// POST /validate - Validate execution plan structure
router.post('/validate', async (req, res) => {
  const { plan } = req.body;

  if (!plan) {
    return res.status(400).json({
      error: 'Plan is required',
      code: 'MISSING_PLAN',
    });
  }

  try {
    const validation = planner.validatePlanStructure(plan);
    const dependencies = planner.validatePlanDependencies(plan);

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      planId: plan.id,
      validation: {
        structureValid: validation.valid,
        dependenciesValid: dependencies.valid,
        errors: [...validation.errors, ...dependencies.errors],
        warnings: [...validation.warnings, ...dependencies.warnings],
      },
    };

    logger.info(`Plan validation completed: ${plan.id}`);
    res.json(response);
  } catch (error) {
    logger.error('Plan validation error:', error.message);
    throw error;
  }
});

// GET /:id - Retrieve plan by ID from in-memory store
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      error: 'Plan ID is required',
      code: 'MISSING_PLAN_ID',
    });
  }

  const plan = planStore.get(id);
  if (!plan) {
    return res.status(404).json({
      error: 'Plan not found',
      code: 'PLAN_NOT_FOUND',
      planId: id,
    });
  }

  try {
    const summary = planner.getPlanSummary(plan);

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        blueprintId: plan.blueprintId,
        blueprintVersion: plan.blueprintVersion,
        stepCount: plan.steps.length,
        executionOrder: plan.executionOrder,
        estimatedDuration: plan.estimatedDuration,
        createdAt: plan.createdAt,
      },
      summary,
    };

    logger.info(`Plan retrieved: ${id}`);
    res.json(response);
  } catch (error) {
    logger.error('Plan retrieval error:', error.message);
    throw error;
  }
});

export default router;