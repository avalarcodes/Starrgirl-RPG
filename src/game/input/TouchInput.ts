import { GameInput } from "./GameInput";

const TOUCH_LOOK_SENSITIVITY = 0.004;

export class TouchInput {
  private movementPointer: number | null = null;
  private lookPointer: number | null = null;
  private lookX = 0;
  private lookY = 0;
  private enabled = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly input: GameInput,
  ) {}

  start(): void {
    this.root.querySelector("[data-joystick]")?.addEventListener("pointerdown", this.handleJoystickStart);
    this.root.querySelector("[data-look-area]")?.addEventListener("pointerdown", this.handleLookStart);
    this.root.querySelector("[data-jump]")?.addEventListener("pointerdown", this.handleJump);
    this.root.querySelector("[data-touch-pause]")?.addEventListener("pointerdown", this.handlePause);
    window.addEventListener("pointermove", this.handlePointerMove, { passive: false });
    window.addEventListener("pointerup", this.handlePointerEnd);
    window.addEventListener("pointercancel", this.handlePointerEnd);
    window.addEventListener("blur", this.handleBlur);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.clear();
  }

  dispose(): void {
    this.root.querySelector("[data-joystick]")?.removeEventListener("pointerdown", this.handleJoystickStart);
    this.root.querySelector("[data-look-area]")?.removeEventListener("pointerdown", this.handleLookStart);
    this.root.querySelector("[data-jump]")?.removeEventListener("pointerdown", this.handleJump);
    this.root.querySelector("[data-touch-pause]")?.removeEventListener("pointerdown", this.handlePause);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerEnd);
    window.removeEventListener("pointercancel", this.handlePointerEnd);
    window.removeEventListener("blur", this.handleBlur);
    this.clear();
  }

  private readonly handleJoystickStart = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (!this.enabled || this.movementPointer !== null) return;
    pointer.preventDefault();
    this.movementPointer = pointer.pointerId;
    (pointer.currentTarget as HTMLElement).setPointerCapture(pointer.pointerId);
    this.updateJoystick(pointer);
  };

  private readonly handleLookStart = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (!this.enabled || this.lookPointer !== null) return;
    pointer.preventDefault();
    this.lookPointer = pointer.pointerId;
    this.lookX = pointer.clientX;
    this.lookY = pointer.clientY;
    (pointer.currentTarget as HTMLElement).setPointerCapture(pointer.pointerId);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.enabled) return;
    if (event.pointerId === this.movementPointer) {
      event.preventDefault();
      this.updateJoystick(event);
    }
    if (event.pointerId === this.lookPointer) {
      event.preventDefault();
      this.input.addLook(
        (event.clientX - this.lookX) * TOUCH_LOOK_SENSITIVITY,
        (event.clientY - this.lookY) * TOUCH_LOOK_SENSITIVITY,
      );
      this.lookX = event.clientX;
      this.lookY = event.clientY;
    }
  };

  private readonly handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerId === this.movementPointer) {
      this.movementPointer = null;
      this.input.setMovement(0, 0);
      this.input.setSprint(false);
      this.updateKnob(0, 0);
    }
    if (event.pointerId === this.lookPointer) this.lookPointer = null;
  };

  private readonly handleJump = (event: Event): void => {
    event.preventDefault();
    if (this.enabled) this.input.queueJump();
  };

  private readonly handlePause = (event: Event): void => {
    event.preventDefault();
    if (this.enabled) this.input.queuePause();
  };

  private readonly handleBlur = (): void => this.clear();

  private updateJoystick(event: PointerEvent): void {
    const joystick = this.root.querySelector<HTMLElement>("[data-joystick]");
    if (!joystick) return;
    const bounds = joystick.getBoundingClientRect();
    const radius = bounds.width * 0.36;
    let x = event.clientX - (bounds.left + bounds.width / 2);
    let y = event.clientY - (bounds.top + bounds.height / 2);
    const length = Math.hypot(x, y);
    if (length > radius) {
      x = (x / length) * radius;
      y = (y / length) * radius;
    }
    this.input.setMovement(x / radius, -y / radius);
    this.input.setSprint(Math.hypot(x, y) / radius > 0.88);
    this.updateKnob(x, y);
  }

  private updateKnob(x: number, y: number): void {
    const knob = this.root.querySelector<HTMLElement>("[data-joystick-knob]");
    if (knob) knob.style.transform = `translate(${x}px, ${y}px)`;
  }

  private clear(): void {
    this.movementPointer = null;
    this.lookPointer = null;
    this.input.reset();
    this.updateKnob(0, 0);
  }
}
