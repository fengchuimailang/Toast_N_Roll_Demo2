interface ProgressSaveData {
  currentLevel: number;
  unlockedLevels: number[];
  levelStars: Record<number, number>;
  levelScores: Record<number, number>;
  totalCoins: number;
  totalGifts: number;
}

interface InventorySaveData {
  remove: number;
  shuffle: number;
  magnet: number;
  unlockStatus: {
    remove: boolean;
    shuffle: boolean;
    magnet: boolean;
  };
}

interface SettingsSaveData {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  vibrationEnabled: boolean;
}

interface CocosSaveData {
  version: string;
  timestamp: number;
  progress: ProgressSaveData;
  inventory: InventorySaveData;
  achievements: string[];
  settings: SettingsSaveData;
}

type SavePatch = Partial<Omit<CocosSaveData, 'progress' | 'inventory' | 'settings'>> & {
  progress?: Partial<ProgressSaveData>;
  inventory?: Partial<Omit<InventorySaveData, 'unlockStatus'>> & {
    unlockStatus?: Partial<InventorySaveData['unlockStatus']>;
  };
  settings?: Partial<SettingsSaveData>;
};

const SAVE_KEY = 'toast_n_roll_save';
const SAVE_VERSION = '1.0.0';

const DEFAULT_SAVE: CocosSaveData = {
  version: SAVE_VERSION,
  timestamp: Date.now(),
  progress: {
    currentLevel: 1,
    unlockedLevels: [1],
    levelStars: {},
    levelScores: {},
    totalCoins: 0,
    totalGifts: 0,
  },
  inventory: {
    remove: 0,
    shuffle: 0,
    magnet: 0,
    unlockStatus: {
      remove: false,
      shuffle: false,
      magnet: false,
    },
  },
  achievements: [],
  settings: {
    musicEnabled: true,
    sfxEnabled: true,
    vibrationEnabled: true,
  },
};

function normalizeSave(data: Partial<CocosSaveData>): CocosSaveData {
  const legacySettings = (data.settings ?? {}) as Partial<SettingsSaveData> & { showHints?: boolean };
  return {
    ...DEFAULT_SAVE,
    ...data,
    progress: {
      ...DEFAULT_SAVE.progress,
      ...data.progress,
    },
    inventory: {
      ...DEFAULT_SAVE.inventory,
      ...data.inventory,
      unlockStatus: {
        ...DEFAULT_SAVE.inventory.unlockStatus,
        ...data.inventory?.unlockStatus,
      },
    },
    settings: {
      ...DEFAULT_SAVE.settings,
      ...legacySettings,
      vibrationEnabled: legacySettings.vibrationEnabled ?? legacySettings.showHints ?? DEFAULT_SAVE.settings.vibrationEnabled,
    },
    version: SAVE_VERSION,
    timestamp: Date.now(),
  };
}

export function loadCocosSave(): CocosSaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return normalizeSave({});
    }

    const parsed = JSON.parse(raw) as CocosSaveData;
    if (parsed.version !== SAVE_VERSION) {
      return normalizeSave({});
    }

    return normalizeSave(parsed);
  } catch (error) {
    console.error('[CocosSaveStorage] Failed to load save', error);
    return normalizeSave({});
  }
}

export function saveCocosSave(patch: SavePatch): void {
  try {
    const current = loadCocosSave();
    const nextSave = normalizeSave({
      ...current,
      ...patch,
      progress: {
        ...current.progress,
        ...patch.progress,
      },
      inventory: {
        ...current.inventory,
        ...patch.inventory,
        unlockStatus: {
          ...current.inventory.unlockStatus,
          ...patch.inventory?.unlockStatus,
        },
      },
      settings: {
        ...current.settings,
        ...patch.settings,
      },
    });
    localStorage.setItem(SAVE_KEY, JSON.stringify(nextSave));
  } catch (error) {
    console.error('[CocosSaveStorage] Failed to save data', error);
  }
}
