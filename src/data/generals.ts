export const GENERAL_IDS = ["starrgirl", "katara", "norscar", "cobra"] as const;

export type GeneralId = (typeof GENERAL_IDS)[number];

export interface GeneralDefinition {
  readonly id: GeneralId;
  readonly displayName: string;
  readonly descriptor: string;
  readonly portraitPath: string;
  readonly modelPath: string;
  readonly symbol: string;
}

export const GENERALS: readonly GeneralDefinition[] = [
  {
    id: "starrgirl",
    displayName: "Starrgirl",
    descriptor: "Starrworld General",
    portraitPath: "/assets/portraits/starrgirl-placeholder.webp",
    modelPath: "/assets/characters/starrgirl-placeholder.glb",
    symbol: "★",
  },
  {
    id: "katara",
    displayName: "Katara",
    descriptor: "Starrworld General",
    portraitPath: "/assets/portraits/katara-placeholder.webp",
    modelPath: "/assets/characters/katara-placeholder.glb",
    symbol: "K",
  },
  {
    id: "norscar",
    displayName: "Norscar",
    descriptor: "Starrworld General",
    portraitPath: "/assets/portraits/norscar-placeholder.webp",
    modelPath: "/assets/characters/norscar-placeholder.glb",
    symbol: "N",
  },
  {
    id: "cobra",
    displayName: "Cobra",
    descriptor: "Starrworld General",
    portraitPath: "/assets/portraits/cobra-placeholder.webp",
    modelPath: "/assets/characters/cobra-placeholder.glb",
    symbol: "C",
  },
];

export function isGeneralId(value: unknown): value is GeneralId {
  return typeof value === "string" && GENERAL_IDS.some((id) => id === value);
}

