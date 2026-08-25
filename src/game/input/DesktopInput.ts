import { GameInput } from "./GameInput";

const MOVEMENT_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight"]);

interface DesktopInputCallbacks {
  onPointerLockChanged: (locked: boolean) => void;
  onDebugToggle: () => void;
}

export class DesktopInput {
  private readonly pressedKeys = new Set<string>();
  private enabled = false;
  private keyboardEventCount = 0;
  private lastKeyboardEvent = "NONE";

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly input: GameInput,
    private readonly mouseSensitivity: number,
    private readonly callbacks: DesktopInputCallbacks,
  ) {}

  start(): void {
    window.addEventListener("keydown", this.handleKeyDown, true);
    window.addEventListener("keyup", this.handleKeyUp, true);
    window.addEventListener("blur", this.handleBlur);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("pointerlockchange", this.handlePointerLockChange);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  requestPointerLock(): void {
    this.canvas.focus({ preventScroll: true });
    void this.canvas.requestPointerLock();
  }

  getDiagnostics(): Readonly<{ enabled: boolean; eventCount: number; lastEvent: string }> {
    return { enabled: this.enabled, eventCount: this.keyboardEventCount, lastEvent: this.lastKeyboardEvent };
  }

  dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown, true);
    window.removeEventListener("keyup", this.handleKeyUp, true);
    window.removeEventListener("blur", this.handleBlur);
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("pointerlockchange", this.handlePointerLockChange);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    if (document.pointerLockElement === this.canvas) void document.exitPointerLock();
    this.enabled = false;
    this.clearState();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const code = this.normalizeCode(event);
    this.keyboardEventCount += 1;
    this.lastKeyboardEvent = `DOWN ${code || event.key || "UNKNOWN"}`;
    if (code === "F3" && !event.repeat) {
      event.preventDefault();
      this.callbacks.onDebugToggle();
      return;
    }
    if (code === "Escape") {
      this.input.queuePause();
      return;
    }
    if (!MOVEMENT_KEYS.has(code)) return;
    event.preventDefault();
    if (!this.enabled) return;
    this.pressedKeys.add(code);
    if (code === "Space" && !event.repeat) this.input.queueJump();
    this.syncMovement();
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const code = this.normalizeCode(event);
    this.keyboardEventCount += 1;
    this.lastKeyboardEvent = `UP ${code || event.key || "UNKNOWN"}`;
    if (!MOVEMENT_KEYS.has(code)) return;
    event.preventDefault();
    this.pressedKeys.delete(code);
    this.syncMovement();
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.enabled || document.pointerLockElement !== this.canvas) return;
    this.input.addLook(event.movementX * this.mouseSensitivity, event.movementY * this.mouseSensitivity);
  };

  private readonly handlePointerLockChange = (): void => {
    this.enabled = document.pointerLockElement === this.canvas;
    if (!this.enabled) this.clearState();
    this.callbacks.onPointerLockChanged(this.enabled);
  };

  private readonly handleBlur = (): void => this.clearState();

  private readonly handleVisibilityChange = (): void => {
    if (!document.hidden) return;
    this.clearState();
    if (document.pointerLockElement === this.canvas) void document.exitPointerLock();
  };

  private syncMovement(): void {
    this.input.setMovement(
      Number(this.pressedKeys.has("KeyD")) - Number(this.pressedKeys.has("KeyA")),
      Number(this.pressedKeys.has("KeyW")) - Number(this.pressedKeys.has("KeyS")),
    );
    this.input.setSprint(this.pressedKeys.has("ShiftLeft") || this.pressedKeys.has("ShiftRight"));
  }

  private clearState(): void {
    this.pressedKeys.clear();
    this.input.reset();
  }

  private normalizeCode(event: KeyboardEvent): string {
    if (event.code) return event.code;
    const key = event.key.toLowerCase();
    const fallback: Readonly<Record<string, string>> = {
      w: "KeyW",
      a: "KeyA",
      s: "KeyS",
      d: "KeyD",
      " ": "Space",
      shift: "ShiftLeft",
      escape: "Escape",
      f3: "F3",
    };
    return fallback[key] ?? event.key;
  }
}
