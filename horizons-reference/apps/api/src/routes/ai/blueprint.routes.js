import express from 'express';
import BlueprintAnalyzer from '../../services/BlueprintAnalyzer.js';
import BlueprintParser from '../../services/ai/BlueprintParser.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const analyzer = new BlueprintAnalyzer();
const parser = new BlueprintParser();

// POST /analyze - Analyze blueprint structure
router.post('/analyze', async (req, res) => {
  const { blueprint } = req.body;

  if (!blueprint) {
    return res.status(400).json({
      error: 'Blueprint is required',
      code: 'MISSING_BLUEPRINT',
    });
  }

  try {
    const analysis = analyzer.analyzeBlueprint(blueprint);

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      analysisId: analysis.id,
      blueprintId: analysis.blueprintId,
      analysis: {
        metadata: analysis.metadata,
        format: analysis.format,
        complexity: analysis.complexity,
        dependencies: analysis.dependencies,
        report: analysis.report,
      },
    };

    logger.info(`Blueprint analyzed: ${analysis.id}`);
    res.json(response);
  } catch (error) {
    logger.error('Blueprint analysis error:', error.message);
    throw error;
  }
});

// POST /validate - Validate blueprint format
router.post('/validate', async (req, res) => {
  const { blueprint } = req.body;

  if (!blueprint) {
    return res.status(400).json({
      error: 'Blueprint is required',
      code: 'MISSING_BLUEPRINT',
    });
  }

  try {
    const validation = analyzer.validateBlueprintFormat(blueprint);

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      blueprintId: blueprint.id,
      validation: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
    };

    logger.info(`Blueprint validation completed: ${blueprint.id}`);
    res.json(response);
  } catch (error) {
    logger.error('Blueprint validation error:', error.message);
    throw error;
  }
});

// GET /requirements - Extract requirements from blueprint
router.post('/requirements', async (req, res) => {
  const { blueprint } = req.body;

  if (!blueprint) {
    return res.status(400).json({
      error: 'Blueprint is required',
      code: 'MISSING_BLUEPRINT',
    });
  }

  try {
    const metadata = analyzer.extractBlueprintMetadata(blueprint);
    const dependencies = analyzer.identifyBlueprintDependencies(blueprint);

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      blueprintId: blueprint.id,
      requirements: {
        models: blueprint.requirements?.models || [],
        capabilities: blueprint.requirements?.capabilities || [],
        resources: blueprint.requirements?.resources || [],
        constraints: blueprint.requirements?.constraints || {},
      },
      metadata,
      dependencies,
    };

    logger.info(`Blueprint requirements extracted: ${blueprint.id}`);
    res.json(response);
  } catch (error) {
    logger.error('Blueprint requirements extraction error:', error.message);
    throw error;
  }
});

export default router;