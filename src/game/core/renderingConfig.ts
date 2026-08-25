export type QualityLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RenderingConfig {
  readonly quality: QualityLevel;
  readonly hardwareScalingLevel: number;
  readonly shadowsEnabled: boolean;
  readonly particlesMultiplier: number;
  readonly drawDistance: number;
  readonly effectsEnabled: boolean;
  readonly textureQuality: number;
}

export const MOBILE_RENDERING_CONFIG: RenderingConfig = {
  quality: "LOW",
  hardwareScalingLevel: 1.35,
  shadowsEnabled: false,
  particlesMultiplier: 0.5,
  drawDistance: 60,
  effectsEnabled: false,
  textureQuality: 0.5,
};

export const DESKTOP_RENDERING_CONFIG: RenderingConfig = {
  quality: "MEDIUM",
  hardwareScalingLevel: 1,
  shadowsEnabled: false,
  particlesMultiplier: 0.75,
  drawDistance: 80,
  effectsEnabled: false,
  textureQuality: 1,
};
