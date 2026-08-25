export const GamePhase = {
  TITLE: "TITLE",
  GENERAL_SELECTION: "GENERAL_SELECTION",
  BRIEFING: "BRIEFING",
  GAMEPLAY: "GAMEPLAY",
  PUZZLE: "PUZZLE",
  HIDDEN_MESSAGE: "HIDDEN_MESSAGE",
  COMPLETION: "COMPLETION",
  CHAPTER_SELECT: "CHAPTER_SELECT",
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

const ALLOWED_TRANSITIONS: Readonly<Record<GamePhase, readonly GamePhase[]>> = {
  TITLE: [GamePhase.GENERAL_SELECTION],
  GENERAL_SELECTION: [GamePhase.TITLE, GamePhase.BRIEFING],
  BRIEFING: [GamePhase.GENERAL_SELECTION, GamePhase.GAMEPLAY],
  GAMEPLAY: [GamePhase.PUZZLE],
  PUZZLE: [GamePhase.HIDDEN_MESSAGE],
  HIDDEN_MESSAGE: [GamePhase.COMPLETION],
  COMPLETION: [GamePhase.CHAPTER_SELECT],
  CHAPTER_SELECT: [GamePhase.BRIEFING],
};

export function canTransition(from: GamePhase, to: GamePhase): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

