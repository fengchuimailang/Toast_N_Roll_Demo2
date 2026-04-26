import { loadCocosSave, saveCocosSave } from './CocosSaveStorage';

export interface AppSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  vibrationEnabled: boolean;
}

export class SettingsStore {
  public getSettings(): AppSettings {
    return { ...loadCocosSave().settings };
  }

  public updateSettings(patch: Partial<AppSettings>): AppSettings {
    const nextSettings = {
      ...this.getSettings(),
      ...patch,
    };
    saveCocosSave({
      settings: nextSettings,
    });
    return nextSettings;
  }
}
