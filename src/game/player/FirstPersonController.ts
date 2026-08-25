import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Ray } from "@babylonjs/core/Culling/ray";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Observer } from "@babylonjs/core/Misc/observable";
import type { Scene } from "@babylonjs/core/scene";
import type { GameInput, InputSnapshot } from "../input/GameInput";

export const MOVEMENT_CONFIG = {
  walkSpeed: 4.6,
  sprintMultiplier: 1.65,
  mouseSensitivity: 0.002,
  jumpStrength: 7.2,
  gravity: -20,
  playerHeight: 1.75,
  collisionRadius: 0.42,
  fieldOfView: 1.15,
  maxLookAngle: Math.PI * 0.48,
  groundProbeDistance: 0.13,
} as const;

export type MovementState = "IDLE" | "WALK" | "SPRINT" | "AIRBORNE";

export interface ControllerDiagnostics {
  readonly position: Vector3;
  readonly movementState: MovementState;
  readonly grounded: boolean;
  readonly active: boolean;
  readonly deltaSeconds: number;
  readonly movementVector: Vector3;
  readonly input: InputSnapshot;
}

export class FirstPersonController {
  readonly camera: UniversalCamera;

  private verticalVelocity = 0;
  private grounded = false;
  private active = false;
  private deltaSeconds = 0;
  private movementState: MovementState = "IDLE";
  private readonly movementVector = Vector3.Zero();
  private beforeRenderObserver: Observer<Scene> | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly engine: Engine,
    private readonly input: GameInput,
    spawnPosition: Vector3,
    spawnYaw: number,
  ) {
    this.camera = new UniversalCamera("player-camera", spawnPosition.clone(), scene);
    this.camera.rotation.set(0, spawnYaw, 0);
    this.camera.fov = MOVEMENT_CONFIG.fieldOfView;
    this.camera.minZ = 0.05;
    this.camera.inertia = 0;
    this.camera.checkCollisions = true;
    this.camera.ellipsoid.set(
      MOVEMENT_CONFIG.collisionRadius,
      MOVEMENT_CONFIG.playerHeight / 2,
      MOVEMENT_CONFIG.collisionRadius,
    );
    this.camera.ellipsoidOffset.set(0, -MOVEMENT_CONFIG.playerHeight / 2, 0);
    scene.activeCamera = this.camera;
  }

  start(): void {
    this.beforeRenderObserver = this.scene.onBeforeRenderObservable.add(() => this.update());
  }

  setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      this.input.reset();
      this.movementVector.setAll(0);
    }
  }

  getDiagnostics(): ControllerDiagnostics {
    return {
      position: this.camera.position,
      movementState: this.movementState,
      grounded: this.grounded,
      active: this.active,
      deltaSeconds: this.deltaSeconds,
      movementVector: this.movementVector,
      input: this.input.getSnapshot(),
    };
  }

  dispose(): void {
    if (this.beforeRenderObserver) this.scene.onBeforeRenderObservable.remove(this.beforeRenderObserver);
    this.input.reset();
    this.camera.dispose();
  }

  private update(): void {
    this.deltaSeconds = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
    this.grounded = this.checkGrounded();
    if (!this.active) {
      this.movementVector.setAll(0);
      this.movementState = this.grounded ? "IDLE" : "AIRBORNE";
      return;
    }

    const look = this.input.consumeLook();
    this.camera.rotation.y += look.x;
    this.camera.rotation.x = Math.max(
      -MOVEMENT_CONFIG.maxLookAngle,
      Math.min(MOVEMENT_CONFIG.maxLookAngle, this.camera.rotation.x + look.y),
    );
    this.camera.rotation.z = 0;

    if (this.grounded && this.verticalVelocity < 0) this.verticalVelocity = -0.5;
    if (this.grounded && this.input.consumeJump()) {
      this.verticalVelocity = MOVEMENT_CONFIG.jumpStrength;
      this.grounded = false;
    }
    this.verticalVelocity += MOVEMENT_CONFIG.gravity * this.deltaSeconds;

    const state = this.input.getSnapshot();
    const localDirection = new Vector3(state.moveX, 0, state.moveY);
    if (localDirection.lengthSquared() > 1) localDirection.normalize();
    const direction = Vector3.TransformNormal(localDirection, Matrix.RotationY(this.camera.rotation.y));
    const moving = direction.lengthSquared() > 0.0001;
    const speed = MOVEMENT_CONFIG.walkSpeed * (state.sprint && moving ? MOVEMENT_CONFIG.sprintMultiplier : 1);
    const movement = direction.scale(speed * this.deltaSeconds);
    movement.y = this.verticalVelocity * this.deltaSeconds;
    this.movementVector.copyFrom(movement);
    this.camera.cameraDirection.addInPlace(movement);

    this.movementState = !this.grounded ? "AIRBORNE" : !moving ? "IDLE" : state.sprint ? "SPRINT" : "WALK";
  }

  private checkGrounded(): boolean {
    const ray = new Ray(
      this.camera.position,
      Vector3.Down(),
      MOVEMENT_CONFIG.playerHeight + MOVEMENT_CONFIG.groundProbeDistance,
    );
    return Boolean(this.scene.pickWithRay(ray, (mesh) => mesh.checkCollisions && mesh.isEnabled())?.hit);
  }
}
