import { createInitialGeneralScores, type GeneralScores } from "../../data/scoring";
import { isGeneralId, type GeneralId } from "../../data/generals";

const STORAGE_KEY = "starrworld.profile.v1";

export interface PlayerSettings {
  musicVolume: number;
  effectsVolume: number;
}

export interface PersistedProfile {
  selectedGeneralId: GeneralId | null;
  unlockedChapter: number;
  generalScores: GeneralScores;
  settings: PlayerSettings;
}

export function createDefaultProfile(): PersistedProfile {
  return {
    selectedGeneralId: null,
    unlockedChapter: 1,
    generalScores: createInitialGeneralScores(),
    settings: { musicVolume: 0.7, effectsVolume: 0.8 },
  };
}

export class LocalProfileStore {
  load(): PersistedProfile {
    try {
      const rawProfile = window.localStorage.getItem(STORAGE_KEY);
      if (!rawProfile) return createDefaultProfile();

      const parsed = JSON.parse(rawProfile) as Partial<PersistedProfile>;
      const defaults = createDefaultProfile();
      const selectedGeneralId = isGeneralId(parsed.selectedGeneralId)
        ? parsed.selectedGeneralId
        : null;
      const unlockedChapter =
        typeof parsed.unlockedChapter === "number"
          ? Math.min(16, Math.max(1, Math.floor(parsed.unlockedChapter)))
          : defaults.unlockedChapter;

      return {
        ...defaults,
        selectedGeneralId,
        unlockedChapter,
        generalScores: { ...defaults.generalScores, ...parsed.generalScores },
        settings: { ...defaults.settings, ...parsed.settings },
      };
    } catch {
      return createDefaultProfile();
    }
  }

  save(profile: PersistedProfile): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }
}

