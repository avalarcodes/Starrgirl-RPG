import { GENERAL_IDS, type GeneralId } from "./generals";

export type GeneralScores = Record<GeneralId, number>;

export function createInitialGeneralScores(): GeneralScores {
  return Object.fromEntries(GENERAL_IDS.map((id) => [id, 0])) as GeneralScores;
}

