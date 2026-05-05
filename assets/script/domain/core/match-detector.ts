/**
 * 三连检测系统
 * 检测横竖三连并处理消除和合成
 *
 * 合成规则：
 * - 每个独立的有效匹配组都会生成1个高一级食材
 * - 同一轮出现多个匹配组时，所有匹配组同时结算
 */

import type { Cell, GridPosition, Ingredient } from '../types';
import { advanceIngredient } from './ingredient';

export interface MatchGroup {
  matches: GridPosition[];             // 当前匹配组内的格子
  mergePosition: GridPosition | null;  // 当前匹配组的合成位置
  advancedIngredient: Ingredient | null; // 当前匹配组的高级食材
  matchedIngredients: Ingredient[];    // 当前匹配组参与口味计算的食材
}

export interface MatchResult {
  matches: GridPosition[]; // 所有需要消除的位置
  groups: MatchGroup[];    // 当前轮需要同时结算的匹配组
}

export class MatchDetector {
  private lastSwapPositions: { from: GridPosition; to: GridPosition } | null = null;

  /**
   * 设置最后一次交换的位置
   */
  setLastSwap(from: GridPosition, to: GridPosition): void {
    this.lastSwapPositions = { from, to };
  }

  /**
   * 清除交换位置记录
   */
  clearLastSwap(): void {
    this.lastSwapPositions = null;
  }

  detectMatches(grid: Cell[][]): MatchResult {
    const gridSize = grid.length;
    const horizontalMatches = this.detectHorizontalMatches(grid, gridSize);
    const verticalMatches = this.detectVerticalMatches(grid, gridSize);
    const matchedLines = [...horizontalMatches, ...verticalMatches];

    if (matchedLines.length === 0) {
      return { matches: [], groups: [] };
    }

    const groups = this.buildMatchGroups(grid, matchedLines);
    const matches = groups
      .flatMap((group) => group.matches)
      .sort((a, b) => a.row - b.row || a.col - b.col);

    return { matches, groups };
  }

  /**
   * 确定合成位置
   * 优先在交换的两个位置中找，如果都不在匹配中，则取匹配的中心位置
   */
  private determineMergePosition(matches: GridPosition[]): GridPosition | null {
    if (matches.length === 0) return null;

    // 检查交换位置是否在匹配中
    if (this.lastSwapPositions) {
      const fromKey = `${this.lastSwapPositions.from.row},${this.lastSwapPositions.from.col}`;
      const toKey = `${this.lastSwapPositions.to.row},${this.lastSwapPositions.to.col}`;

      const matchSet = new Set(matches.map(p => `${p.row},${p.col}`));

      // 优先使用 from 位置
      if (matchSet.has(fromKey)) {
        return this.lastSwapPositions.from;
      }
      // 其次使用 to 位置
      if (matchSet.has(toKey)) {
        return this.lastSwapPositions.to;
      }
    }

    // 如果交换位置都不在匹配中，取匹配的中心位置
    const centerIndex = Math.floor(matches.length / 2);
    return matches[centerIndex];
  }

  private detectHorizontalMatches(grid: Cell[][], gridSize: number): GridPosition[][] {
    const matches: GridPosition[][] = [];

    for (let row = 0; row < gridSize; row++) {
      let count = 1;
      let currentType = grid[row][0].ingredient?.type;

      for (let col = 1; col < gridSize; col++) {
        const ingredientType = grid[row][col].ingredient?.type;

        if (ingredientType && ingredientType === currentType) {
          count++;
        } else {
          if (count >= 3 && currentType) {
            const matchLine: GridPosition[] = [];
            for (let i = col - count; i < col; i++) {
              matchLine.push({ row, col: i });
            }
            matches.push(matchLine);
          }
          count = 1;
          currentType = ingredientType;
        }
      }

      if (count >= 3 && currentType) {
        const matchLine: GridPosition[] = [];
        for (let i = gridSize - count; i < gridSize; i++) {
          matchLine.push({ row, col: i });
        }
        matches.push(matchLine);
      }
    }

    return matches;
  }

  private detectVerticalMatches(grid: Cell[][], gridSize: number): GridPosition[][] {
    const matches: GridPosition[][] = [];

    for (let col = 0; col < gridSize; col++) {
      let count = 1;
      let currentType = grid[0][col].ingredient?.type;

      for (let row = 1; row < gridSize; row++) {
        const ingredientType = grid[row][col].ingredient?.type;

        if (ingredientType && ingredientType === currentType) {
          count++;
        } else {
          if (count >= 3 && currentType) {
            const matchLine: GridPosition[] = [];
            for (let i = row - count; i < row; i++) {
              matchLine.push({ row: i, col });
            }
            matches.push(matchLine);
          }
          count = 1;
          currentType = ingredientType;
        }
      }

      if (count >= 3 && currentType) {
        const matchLine: GridPosition[] = [];
        for (let i = gridSize - count; i < gridSize; i++) {
          matchLine.push({ row: i, col });
        }
        matches.push(matchLine);
      }
    }

    return matches;
  }

  private buildMatchGroups(grid: Cell[][], matchedLines: GridPosition[][]): MatchGroup[] {
    const matchedPositions = new Map<string, GridPosition>();

    for (const line of matchedLines) {
      for (const pos of line) {
        matchedPositions.set(`${pos.row},${pos.col}`, pos);
      }
    }

    const groups: MatchGroup[] = [];
    const visited = new Set<string>();

    for (const pos of matchedPositions.values()) {
      const key = `${pos.row},${pos.col}`;
      if (visited.has(key)) {
        continue;
      }

      const component = this.collectConnectedMatches(grid, pos, matchedPositions);
      component.forEach((matchPos) => visited.add(`${matchPos.row},${matchPos.col}`));

      const mergePosition = this.determineMergePosition(component);
      const matchedIngredients = component
        .map((matchPos) => grid[matchPos.row][matchPos.col].ingredient)
        .filter((ingredient): ingredient is Ingredient => ingredient !== null);

      let advancedIngredient: Ingredient | null = null;
      let finalMergePosition: GridPosition | null = mergePosition;

      if (mergePosition) {
        const sourceIngredient = grid[mergePosition.row][mergePosition.col].ingredient;
        if (sourceIngredient) {
          advancedIngredient = advanceIngredient(sourceIngredient);
        } else {
          finalMergePosition = null;
        }
      }

      groups.push({
        matches: component,
        mergePosition: finalMergePosition,
        advancedIngredient,
        matchedIngredients,
      });
    }

    return groups;
  }

  private collectConnectedMatches(
    grid: Cell[][],
    start: GridPosition,
    matchedPositions: Map<string, GridPosition>
  ): GridPosition[] {
    const startIngredient = grid[start.row][start.col].ingredient;
    if (!startIngredient) {
      return [];
    }

    const queue: GridPosition[] = [start];
    const visited = new Set<string>([`${start.row},${start.col}`]);
    const component: GridPosition[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);

      const neighbors: GridPosition[] = [
        { row: current.row - 1, col: current.col },
        { row: current.row + 1, col: current.col },
        { row: current.row, col: current.col - 1 },
        { row: current.row, col: current.col + 1 },
      ];

      for (const neighbor of neighbors) {
        const key = `${neighbor.row},${neighbor.col}`;
        if (visited.has(key) || !matchedPositions.has(key)) {
          continue;
        }

        const ingredient = grid[neighbor.row][neighbor.col].ingredient;
        if (!ingredient || ingredient.type !== startIngredient.type) {
          continue;
        }

        visited.add(key);
        queue.push(matchedPositions.get(key)!);
      }
    }

    return component.sort((a, b) => a.row - b.row || a.col - b.col);
  }

  findPossibleMoves(grid: Cell[][]): Array<{ from: GridPosition; to: GridPosition }> {
    const moves: Array<{ from: GridPosition; to: GridPosition }> = [];
    const gridSize = grid.length;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (col < gridSize - 1) {
          if (this.wouldMatch(grid, { row, col }, { row, col: col + 1 })) {
            moves.push({ from: { row, col }, to: { row, col: col + 1 } });
          }
        }
        if (row < gridSize - 1) {
          if (this.wouldMatch(grid, { row, col }, { row: row + 1, col })) {
            moves.push({ from: { row, col }, to: { row: row + 1, col } });
          }
        }
      }
    }

    return moves;
  }

  private wouldMatch(grid: Cell[][], pos1: GridPosition, pos2: GridPosition): boolean {
    // Create a shallow copy of the grid to avoid mutating the original
    const testGrid = grid.map(row => row.map(cell => ({ ...cell })));
    
    // Swap ingredients in the test grid
    const temp = testGrid[pos1.row][pos1.col].ingredient;
    testGrid[pos1.row][pos1.col].ingredient = testGrid[pos2.row][pos2.col].ingredient;
    testGrid[pos2.row][pos2.col].ingredient = temp;

    const matches = this.detectMatches(testGrid);
    return matches.matches.length > 0;
  }
}
