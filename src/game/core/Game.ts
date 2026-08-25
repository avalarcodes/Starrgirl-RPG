import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import "@babylonjs/core/Meshes/instancedMesh";
import { Scene } from "@babylonjs/core/scene";
import type { GeneralId } from "../../data/generals";
import { UIController } from "../../ui/UIController";
import { FirstPersonController } from "../player/FirstPersonController";
import { GameInput } from "../input/GameInput";
import { DesktopInput } from "../input/DesktopInput";
import { TouchInput } from "../input/TouchInput";
import { ChapterOneScene, CHAPTER_ONE_SPAWN } from "../world/ChapterOneScene";
import { DESKTOP_RENDERING_CONFIG, MOBILE_RENDERING_CONFIG } from "./renderingConfig";
import { canTransition, GamePhase, type GamePhase as GamePhaseValue } from "./GamePhase";
import { createInitialGameState, type GameState } from "../state/GameState";
import { LocalProfileStore, type PersistedProfile } from "../state/persistence";

export class Game {
  private readonly engine: Engine;
  private readonly menuScene: Scene;
  private activeScene: Scene;
  private chapterOneScene: ChapterOneScene | null = null;
  private playerController: FirstPersonController | null = null;
  private gameInput: GameInput | null = null;
  private desktopInput: DesktopInput | null = null;
  private touchInput: TouchInput | null = null;
  private gameplayStarted = false;
  private readonly touchMode: boolean;
  private readonly state: GameState;
  private readonly profileStore = new LocalProfileStore();
  private readonly profile: PersistedProfile;
  private readonly ui: UIController;
  private readonly handleResize = (): void => this.engine.resize();

  constructor(private readonly canvas: HTMLCanvasElement, private readonly uiRoot: HTMLElement) {
    this.profile = this.profileStore.load();
    this.state = {
      ...createInitialGameState(),
      selectedGeneralId: this.profile.selectedGeneralId,
      unlockedChapter: this.profile.unlockedChapter,
    };

    this.touchMode = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    this.canvas.tabIndex = 0;
    const renderingConfig = this.touchMode ? MOBILE_RENDERING_CONFIG : DESKTOP_RENDERING_CONFIG;
    this.engine = new Engine(this.canvas, true, { antialias: true });
    this.engine.setHardwareScalingLevel(renderingConfig.hardwareScalingLevel);
    this.menuScene = this.createScene(this.canvas);
    this.activeScene = this.menuScene;
    this.ui = new UIController(uiRoot, {
      onChapterMode: () => this.transitionTo(GamePhase.GENERAL_SELECTION),
      onGeneralSelected: (generalId) => this.selectGeneral(generalId),
      onContinue: () => this.continueToBriefing(),
      onBeginMission: () => this.beginMission(),
      onEnterGameplay: () => this.enterGameplay(),
      onResumeGameplay: () => this.enterGameplay(),
      onExitGameplay: () => this.exitGameplay(),
    });
    const debugRequested = new URLSearchParams(window.location.search).get("debug") === "1";
    this.ui.configureGameplay(this.touchMode, !this.touchMode || debugRequested);
  }

  start(): void {
    window.addEventListener("resize", this.handleResize);
    this.ui.render(this.state);
    this.engine.runRenderLoop(() => {
      if (this.gameInput?.consumePause()) this.pauseGameplay();
      this.activeScene.render();
      this.updateDiagnostics();
    });
  }

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    this.engine.stopRenderLoop();
    this.playerController?.dispose();
    this.desktopInput?.dispose();
    this.touchInput?.dispose();
    this.chapterOneScene?.dispose();
    this.menuScene.dispose();
    this.engine.dispose();
  }

  private transitionTo(nextPhase: GamePhaseValue): void {
    if (!canTransition(this.state.currentPhase, nextPhase)) return;
    this.state.currentPhase = nextPhase;
    this.ui.render(this.state);
  }

  private selectGeneral(generalId: GeneralId): void {
    if (this.state.currentPhase !== GamePhase.GENERAL_SELECTION) return;
    this.state.selectedGeneralId = generalId;
    this.profile.selectedGeneralId = generalId;
    this.profileStore.save(this.profile);
    this.ui.render(this.state);
  }

  private continueToBriefing(): void {
    if (!this.state.selectedGeneralId) return;
    this.transitionTo(GamePhase.BRIEFING);
  }

  private beginMission(): void {
    if (!canTransition(this.state.currentPhase, GamePhase.GAMEPLAY)) return;
    this.state.currentPhase = GamePhase.GAMEPLAY;
    this.menuScene.activeCamera?.detachControl();
    this.chapterOneScene = new ChapterOneScene(this.engine);
    this.activeScene = this.chapterOneScene.scene;
    this.gameInput = new GameInput();
    this.playerController = new FirstPersonController(
      this.activeScene,
      this.engine,
      this.gameInput,
      CHAPTER_ONE_SPAWN.position,
      CHAPTER_ONE_SPAWN.yaw,
    );
    this.ui.render(this.state);
    if (this.touchMode) {
      this.touchInput = new TouchInput(this.uiRoot, this.gameInput);
      this.touchInput.start();
    } else {
      this.desktopInput = new DesktopInput(
        this.canvas,
        this.gameInput,
        0.002,
        {
          onPointerLockChanged: (locked) => {
            if (locked) this.activateGameplay();
            else if (this.gameplayStarted) this.pauseGameplay();
          },
          onDebugToggle: () => this.ui.toggleDebug(),
        },
      );
      this.desktopInput.start();
    }
    this.playerController.start();
    this.ui.setGameplayActive(false, false);
  }

  private updateDiagnostics(): void {
    if (!this.playerController || this.state.currentPhase !== GamePhase.GAMEPLAY) return;
    const diagnostics = this.playerController.getDiagnostics();
    const { x, y, z } = diagnostics.position;
    const movement = diagnostics.movementVector;
    const input = diagnostics.input;
    const desktop = this.desktopInput?.getDiagnostics();
    this.ui.updateDebug([
      `FPS       ${this.engine.getFps().toFixed(0)}`,
      `POSITION  ${x.toFixed(2)}  ${y.toFixed(2)}  ${z.toFixed(2)}`,
      `MOVEMENT  ${diagnostics.movementState}`,
      `PLATFORM  ${this.touchMode ? "TOUCH" : "DESKTOP"}`,
      `ACTIVE    ${diagnostics.active ? "TRUE" : "FALSE"}`,
      `GROUNDED  ${diagnostics.grounded ? "TRUE" : "FALSE"}`,
      `DELTA     ${(diagnostics.deltaSeconds * 1000).toFixed(2)} MS`,
      `WALK SPD  4.60`,
      `VECTOR    ${movement.x.toFixed(3)}  ${movement.y.toFixed(3)}  ${movement.z.toFixed(3)}`,
      `INPUT     ${input.moveX.toFixed(2)}  ${input.moveY.toFixed(2)}`,
      `SPRINT    ${input.sprint ? "TRUE" : "FALSE"}`,
      ...(desktop
        ? [`KEY INPUT ${desktop.enabled ? "ENABLED" : "DISABLED"}`, `KEY EVENTS ${desktop.eventCount} · ${desktop.lastEvent}`]
        : []),
      "F3        TOGGLE DEBUG",
    ]);
  }

  private exitGameplay(): void {
    if (this.state.currentPhase !== GamePhase.GAMEPLAY) return;
    this.gameplayStarted = false;
    this.desktopInput?.dispose();
    this.desktopInput = null;
    this.touchInput?.dispose();
    this.touchInput = null;
    this.playerController?.dispose();
    this.playerController = null;
    this.chapterOneScene?.dispose();
    this.chapterOneScene = null;
    this.gameInput = null;
    this.activeScene = this.menuScene;
    this.menuScene.activeCamera?.attachControl(this.canvas, false);
    this.state.currentPhase = GamePhase.TITLE;
    this.ui.render(this.state);
  }

  private enterGameplay(): void {
    if (this.state.currentPhase !== GamePhase.GAMEPLAY) return;
    if (this.touchMode) this.activateGameplay();
    else this.desktopInput?.requestPointerLock();
  }

  private activateGameplay(): void {
    this.gameplayStarted = true;
    this.playerController?.setActive(true);
    this.touchInput?.setEnabled(true);
    this.ui.setGameplayActive(true, true);
  }

  private pauseGameplay(): void {
    if (this.state.currentPhase !== GamePhase.GAMEPLAY || !this.gameplayStarted) return;
    this.playerController?.setActive(false);
    this.touchInput?.setEnabled(false);
    if (!this.touchMode && document.pointerLockElement === this.canvas) void document.exitPointerLock();
    this.ui.setGameplayActive(false, true);
  }

  private createScene(canvas: HTMLCanvasElement): Scene {
    const scene = new Scene(this.engine);
    scene.clearColor = new Color4(0.015, 0.008, 0.035, 1);

    const camera = new ArcRotateCamera("overview-camera", -Math.PI / 2, Math.PI / 3, 18, Vector3.Zero(), scene);
    camera.attachControl(canvas, false);
    camera.lowerRadiusLimit = 12;
    camera.upperRadiusLimit = 24;
    camera.wheelPrecision = 80;

    const ambientLight = new HemisphericLight("celestial-fill", new Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.65;
    ambientLight.diffuse = new Color3(0.48, 0.31, 0.82);
    ambientLight.groundColor = new Color3(0.03, 0.015, 0.06);

    const keyLight = new DirectionalLight("violet-key", new Vector3(-0.5, -1, 0.4), scene);
    keyLight.intensity = 0.75;
    keyLight.diffuse = new Color3(0.72, 0.55, 1);

    const platform = MeshBuilder.CreateCylinder("trial-platform", { height: 0.55, diameter: 12, tessellation: 48 }, scene);
    platform.position.y = -1.6;
    const platformMaterial = new StandardMaterial("platform-material", scene);
    platformMaterial.diffuseColor = new Color3(0.075, 0.035, 0.14);
    platformMaterial.specularColor = new Color3(0.3, 0.18, 0.5);
    platform.material = platformMaterial;

    const starMaterial = new StandardMaterial("star-material", scene);
    starMaterial.emissiveColor = new Color3(0.62, 0.48, 0.95);
    starMaterial.disableLighting = true;
    const starSource = MeshBuilder.CreateSphere("star-source", { diameter: 0.055, segments: 4 }, scene);
    starSource.material = starMaterial;
    starSource.isVisible = false;

    for (let index = 0; index < 72; index += 1) {
      const star = starSource.createInstance(`star-${index}`);
      const angle = index * 2.399;
      const radius = 11 + ((index * 17) % 18);
      star.position.set(Math.cos(angle) * radius, ((index * 29) % 22) - 7, Math.sin(angle) * radius);
      const scale = 0.7 + (index % 4) * 0.25;
      star.scaling.setAll(scale);
    }

    return scene;
  }
}
