import type { FlavorType, IngredientType } from '../types';
import type {
  FlavorDistribution,
  FlavorsData,
  IngredientSpawnConfig,
  LevelConfig,
  PresetIngredientConfig,
} from '../types/level';

const KNOWN_INGREDIENT_TYPES: IngredientType[] = ['wheat', 'flour', 'dough', 'baking', 'toast', 'gift'];
const KNOWN_DIFFICULTIES = new Set<LevelConfig['difficulty']>(['tutorial', 'easy', 'normal', 'hard', 'expert']);

export interface LevelValidationResult {
  valid: boolean;
  errors: string[];
}

export interface LevelValidationOptions {
  expectedLevelId?: number;
  fileLabel?: string;
  knownFlavors?: string[];
}

function prefixMessage(options: LevelValidationOptions, message: string): string {
  if (options.fileLabel) {
    return `${options.fileLabel}: ${message}`;
  }
  return message;
}

function validateDistribution(
  name: string,
  distribution: FlavorDistribution | undefined,
  availableFlavors: Set<string>,
  options: LevelValidationOptions,
  errors: string[],
): void {
  if (!distribution || Object.keys(distribution).length === 0) {
    errors.push(prefixMessage(options, `Missing ${name}`));
    return;
  }

  let total = 0;
  for (const [flavorId, weight] of Object.entries(distribution)) {
    if (!availableFlavors.has(flavorId)) {
      errors.push(prefixMessage(options, `${name} contains unknown flavor "${flavorId}"`));
    }
    if (!Number.isFinite(weight) || weight < 0) {
      errors.push(prefixMessage(options, `${name}.${flavorId} must be a non-negative number`));
    }
    total += weight;
  }

  if (total !== 100) {
    errors.push(prefixMessage(options, `${name} must sum to 100, received ${total}`));
  }
}

function validateSpawnConfig(
  name: string,
  config: IngredientSpawnConfig | undefined,
  availableFlavors: Set<string>,
  options: LevelValidationOptions,
  errors: string[],
): void {
  if (!config) {
    errors.push(prefixMessage(options, `Missing ingredientSpawn.${name}`));
    return;
  }

  if (!Array.isArray(config.tierWeights) || config.tierWeights.length === 0 || config.tierWeights.length > KNOWN_INGREDIENT_TYPES.length) {
    errors.push(prefixMessage(options, `ingredientSpawn.${name}.tierWeights must contain 1-${KNOWN_INGREDIENT_TYPES.length} entries`));
  } else {
    const totalWeight = config.tierWeights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) {
      errors.push(prefixMessage(options, `ingredientSpawn.${name}.tierWeights must contain at least one positive weight`));
    }
    config.tierWeights.forEach((weight, index) => {
      if (!Number.isFinite(weight) || weight < 0) {
        errors.push(prefixMessage(options, `ingredientSpawn.${name}.tierWeights[${index}] must be a non-negative number`));
      }
    });
  }

  if (config.maxTier !== undefined && (!Number.isInteger(config.maxTier) || config.maxTier < 1 || config.maxTier > KNOWN_INGREDIENT_TYPES.length)) {
    errors.push(prefixMessage(options, `ingredientSpawn.${name}.maxTier must be between 1 and ${KNOWN_INGREDIENT_TYPES.length}`));
  }

  validateDistribution(`ingredientSpawn.${name}.flavorDistribution`, config.flavorDistribution, availableFlavors, options, errors);
}

function validatePresetBoard(
  presetBoard: PresetIngredientConfig[][] | undefined,
  rows: number,
  cols: number,
  availableFlavors: Set<string>,
  options: LevelValidationOptions,
  errors: string[],
): void {
  if (!presetBoard) {
    return;
  }

  if (presetBoard.length !== rows) {
    errors.push(prefixMessage(options, `presetBoard row count must match gridSize.rows (${rows})`));
    return;
  }

  for (let row = 0; row < presetBoard.length; row++) {
    const currentRow = presetBoard[row];
    if (currentRow.length !== cols) {
      errors.push(prefixMessage(options, `presetBoard row ${row} must contain ${cols} cells`));
      continue;
    }

    for (let col = 0; col < currentRow.length; col++) {
      const ingredient = currentRow[col];
      if (!KNOWN_INGREDIENT_TYPES.includes(ingredient.type)) {
        errors.push(prefixMessage(options, `presetBoard[${row}][${col}] has unknown type "${ingredient.type}"`));
      }
      if (!availableFlavors.has(ingredient.flavor)) {
        errors.push(prefixMessage(options, `presetBoard[${row}][${col}] has unknown flavor "${ingredient.flavor}"`));
      }
    }
  }
}

export function getKnownFlavorIds(flavorsData: FlavorsData): string[] {
  return flavorsData.flavors.map((flavor) => flavor.flavorId);
}

export function validateLevelConfig(config: LevelConfig, options: LevelValidationOptions = {}): LevelValidationResult {
  const errors: string[] = [];
  const knownFlavors = options.knownFlavors ?? (['original', 'matcha', 'strawberry'] satisfies FlavorType[]);
  const knownFlavorSet = new Set(knownFlavors);

  if (!Number.isInteger(config.levelId) || config.levelId < 0) {
    errors.push(prefixMessage(options, 'levelId must be an integer >= 0'));
  }
  if (options.expectedLevelId !== undefined && config.levelId !== options.expectedLevelId) {
    errors.push(prefixMessage(options, `levelId ${config.levelId} does not match file expectation ${options.expectedLevelId}`));
  }
  if (!config.levelName?.trim()) {
    errors.push(prefixMessage(options, 'Missing levelName'));
  }
  if (!config.description?.trim()) {
    errors.push(prefixMessage(options, 'Missing description'));
  }
  if (!KNOWN_DIFFICULTIES.has(config.difficulty)) {
    errors.push(prefixMessage(options, `Unknown difficulty "${config.difficulty}"`));
  }

  const rows = config.gridSize?.rows;
  const cols = config.gridSize?.cols;
  if (!Number.isInteger(rows) || !Number.isInteger(cols)) {
    errors.push(prefixMessage(options, 'gridSize.rows and gridSize.cols must be integers'));
  } else {
    if (rows < 5 || rows > 7 || cols < 5 || cols > 7) {
      errors.push(prefixMessage(options, 'gridSize must stay within 5x5 to 7x7'));
    }
    if (rows !== cols) {
      errors.push(prefixMessage(options, 'gridSize must remain square for the current renderer and input system'));
    }
  }

  const prevLevel = config.unlockCondition?.prevLevel;
  if (!Number.isInteger(prevLevel) || prevLevel < 0) {
    errors.push(prefixMessage(options, 'unlockCondition.prevLevel must be an integer >= 0'));
  } else if (config.levelId === 0) {
    if (prevLevel !== 0) {
      errors.push(prefixMessage(options, 'Debug level 0 must use unlockCondition.prevLevel = 0'));
    }
  } else if (prevLevel !== config.levelId - 1) {
    errors.push(prefixMessage(options, `unlockCondition.prevLevel must equal ${config.levelId - 1}`));
  }

  if (!config.flavors || config.flavors.available.length === 0) {
    errors.push(prefixMessage(options, 'Missing flavors.available'));
  }

  const availableFlavors = new Set(config.flavors?.available ?? []);
  for (const flavorId of availableFlavors) {
    if (!knownFlavorSet.has(flavorId)) {
      errors.push(prefixMessage(options, `Unknown flavor "${flavorId}"`));
    }
  }

  validateDistribution('flavors.distribution', config.flavors?.distribution, availableFlavors, options, errors);
  if (config.flavors?.refillBias) {
    validateDistribution('flavors.refillBias', config.flavors.refillBias, availableFlavors, options, errors);
  }

  validateSpawnConfig('initial', config.ingredientSpawn?.initial, availableFlavors, options, errors);
  validateSpawnConfig('refill', config.ingredientSpawn?.refill, availableFlavors, options, errors);

  if (!config.customers) {
    errors.push(prefixMessage(options, 'Missing customers config'));
  } else {
    if (!Number.isInteger(config.customers.totalCount) || config.customers.totalCount <= 0) {
      errors.push(prefixMessage(options, 'customers.totalCount must be a positive integer'));
    }
    if (!Number.isFinite(config.customers.basePatience) || config.customers.basePatience <= 0) {
      errors.push(prefixMessage(options, 'customers.basePatience must be > 0'));
    }
    if (!Number.isFinite(config.customers.queuePatienceOffset) || config.customers.queuePatienceOffset < 0) {
      errors.push(prefixMessage(options, 'customers.queuePatienceOffset must be >= 0'));
    }
    if (!Number.isInteger(config.customers.entryGraceTurns) || config.customers.entryGraceTurns < 0) {
      errors.push(prefixMessage(options, 'customers.entryGraceTurns must be an integer >= 0'));
    }
    const [minDemand, maxDemand] = config.customers.demandCountRange ?? [];
    if (!Number.isInteger(minDemand) || !Number.isInteger(maxDemand) || minDemand <= 0 || maxDemand < minDemand) {
      errors.push(prefixMessage(options, 'customers.demandCountRange must be [min, max] integers with 0 < min <= max'));
    }
    if (!Array.isArray(config.customers.allowedFlavors) || config.customers.allowedFlavors.length === 0) {
      errors.push(prefixMessage(options, 'customers.allowedFlavors must contain at least one flavor'));
    } else {
      for (const flavorId of config.customers.allowedFlavors) {
        if (!availableFlavors.has(flavorId)) {
          errors.push(prefixMessage(options, `customers.allowedFlavors contains unknown flavor "${flavorId}"`));
        }
      }
    }
  }

  if (!config.starRatings) {
    errors.push(prefixMessage(options, 'Missing starRatings'));
  } else {
    const { oneStar, twoStars, threeStars } = config.starRatings;
    if (!(oneStar > 0 && twoStars > oneStar && threeStars > twoStars)) {
      errors.push(prefixMessage(options, 'starRatings must be strictly increasing positive numbers'));
    }
  }

  if (config.tutorial?.enabled && config.tutorial.steps.length === 0) {
    errors.push(prefixMessage(options, 'tutorial.steps must not be empty when tutorial is enabled'));
  }
  if (config.levelId === 1 && !config.tutorial?.enabled) {
    errors.push(prefixMessage(options, 'Level 1 must enable tutorial config'));
  }

  if (config.levelId === 0) {
    if (!config.presetBoard) {
      errors.push(prefixMessage(options, 'Debug level 0 must define presetBoard'));
    }
    if (!config.debug?.hidden || config.debug.trackProgress !== false) {
      errors.push(prefixMessage(options, 'Debug level 0 must be hidden and must not track formal progress'));
    }
  }

  validatePresetBoard(config.presetBoard, rows ?? 0, cols ?? 0, availableFlavors, options, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}
