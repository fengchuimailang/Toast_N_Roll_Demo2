import type { LevelProgressData } from '../domain/types/level';
import { loadCocosSave, saveCocosSave } from './CocosSaveStorage';

export class LevelProgressStore {
  private maxLevelId = 50;
  private readonly data: LevelProgressData;
  private totalCoins: number;
  private totalGifts: number;

  public constructor() {
    const save = loadCocosSave();
    this.data = {
      currentLevel: this.normalizeLevel(save.progress.currentLevel),
      unlockedLevels: this.normalizeUnlockedLevels(save.progress.unlockedLevels),
      levelStars: { ...save.progress.levelStars },
      levelScores: { ...save.progress.levelScores },
    };
    this.totalCoins = Math.max(0, Math.floor(save.progress.totalCoins ?? 0));
    this.totalGifts = Math.max(0, Math.floor(save.progress.totalGifts ?? 0));
  }

  public getCurrentLevel(): number {
    return this.data.currentLevel;
  }

  public getMaxLevelId(): number {
    return this.maxLevelId;
  }

  public configureMaxLevel(maxLevelId: number): void {
    const normalizedMaxLevelId = Number.isFinite(maxLevelId)
      ? Math.max(1, Math.floor(maxLevelId))
      : 1;

    if (normalizedMaxLevelId === this.maxLevelId) {
      return;
    }

    this.maxLevelId = normalizedMaxLevelId;
    this.data.currentLevel = this.normalizeLevel(this.data.currentLevel);
    this.data.unlockedLevels = this.normalizeUnlockedLevels(this.data.unlockedLevels);

    const filteredStars: Record<number, number> = {};
    const filteredScores: Record<number, number> = {};
    for (const [rawLevelId, stars] of Object.entries(this.data.levelStars)) {
      const levelId = this.normalizeLevel(Number(rawLevelId));
      filteredStars[levelId] = Math.max(filteredStars[levelId] ?? 0, stars);
    }
    for (const [rawLevelId, score] of Object.entries(this.data.levelScores)) {
      const levelId = this.normalizeLevel(Number(rawLevelId));
      filteredScores[levelId] = Math.max(filteredScores[levelId] ?? 0, score);
    }
    this.data.levelStars = filteredStars;
    this.data.levelScores = filteredScores;
    this.persist();
  }

  public setCurrentLevel(levelId: number): void {
    const normalizedLevelId = this.normalizeLevel(levelId);
    if (!this.isLevelUnlocked(normalizedLevelId)) {
      return;
    }

    this.data.currentLevel = normalizedLevelId;
    this.persist();
  }

  public isLevelUnlocked(levelId: number): boolean {
    return this.data.unlockedLevels.includes(this.normalizeLevel(levelId));
  }

  public getUnlockedLevels(): number[] {
    return [...this.data.unlockedLevels];
  }

  public getLevelStars(levelId: number): number {
    return this.data.levelStars[this.normalizeLevel(levelId)] ?? 0;
  }

  public getLevelScore(levelId: number): number {
    return this.data.levelScores[this.normalizeLevel(levelId)] ?? 0;
  }

  public getProgressSnapshot(): LevelProgressData {
    return {
      currentLevel: this.data.currentLevel,
      unlockedLevels: [...this.data.unlockedLevels],
      levelStars: { ...this.data.levelStars },
      levelScores: { ...this.data.levelScores },
    };
  }

  public getTotalCoins(): number {
    return this.totalCoins;
  }

  public getTotalGifts(): number {
    return this.totalGifts;
  }

  public addRunRewards(coins: number, gifts: number): void {
    const normalizedCoins = Number.isFinite(coins) ? Math.max(0, Math.floor(coins)) : 0;
    const normalizedGifts = Number.isFinite(gifts) ? Math.max(0, Math.floor(gifts)) : 0;
    if (normalizedCoins === 0 && normalizedGifts === 0) {
      return;
    }

    this.totalCoins += normalizedCoins;
    this.totalGifts += normalizedGifts;
    this.persist();
  }

  public unlockLevel(levelId: number): void {
    const normalizedLevelId = this.normalizeLevel(levelId);
    if (this.data.unlockedLevels.includes(normalizedLevelId)) {
      return;
    }

    this.data.unlockedLevels.push(normalizedLevelId);
    this.data.unlockedLevels.sort((a, b) => a - b);
    this.persist();
  }

  public completeLevel(levelId: number, stars: number, score: number): void {
    const normalizedLevelId = this.normalizeLevel(levelId);
    this.data.levelStars[normalizedLevelId] = Math.max(this.data.levelStars[normalizedLevelId] ?? 0, stars);
    this.data.levelScores[normalizedLevelId] = Math.max(this.data.levelScores[normalizedLevelId] ?? 0, score);
    this.unlockLevel(normalizedLevelId + 1);
    this.setCurrentLevel(Math.min(normalizedLevelId + 1, this.maxLevelId));
    this.persist();
  }

  private persist(): void {
    saveCocosSave({
      progress: {
        currentLevel: this.data.currentLevel,
        unlockedLevels: [...this.data.unlockedLevels],
        levelStars: { ...this.data.levelStars },
        levelScores: { ...this.data.levelScores },
        totalCoins: this.totalCoins,
        totalGifts: this.totalGifts,
      },
    });
  }

  private normalizeUnlockedLevels(levels: number[]): number[] {
    const normalized = Array.from(new Set(levels.map((levelId) => this.normalizeLevel(levelId)).concat([1])));
    normalized.sort((a, b) => a - b);
    return normalized;
  }

  private normalizeLevel(levelId: number): number {
    if (!Number.isFinite(levelId)) {
      return 1;
    }

    return Math.min(Math.max(Math.floor(levelId), 1), this.maxLevelId);
  }
}
