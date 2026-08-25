import type { GeneralId } from "../../data/generals";
import { GamePhase, type GamePhase as GamePhaseValue } from "../core/GamePhase";

export interface GameState {
  selectedGeneralId: GeneralId | null;
  currentChapter: number;
  unlockedChapter: number;
  score: number;
  health: number;
  ammo: number;
  puzzlePiecesCollected: number;
  puzzlePiecesRequired: number;
  currentPhase: GamePhaseValue;
}

export function createInitialGameState(): GameState {
  return {
    selectedGeneralId: null,
    currentChapter: 1,
    unlockedChapter: 1,
    score: 0,
    health: 100,
    ammo: 30,
    puzzlePiecesCollected: 0,
    puzzlePiecesRequired: 3,
    currentPhase: GamePhase.TITLE,
  };
}

