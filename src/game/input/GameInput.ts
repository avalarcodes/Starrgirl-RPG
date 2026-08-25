export interface InputSnapshot {
  readonly moveX: number;
  readonly moveY: number;
  readonly sprint: boolean;
}

export interface LookDelta {
  readonly x: number;
  readonly y: number;
}

export class GameInput {
  private moveX = 0;
  private moveY = 0;
  private lookX = 0;
  private lookY = 0;
  private jumpQueued = false;
  private pauseQueued = false;
  private sprint = false;

  setMovement(x: number, y: number): void {
    this.moveX = Math.max(-1, Math.min(1, x));
    this.moveY = Math.max(-1, Math.min(1, y));
  }

  addLook(x: number, y: number): void {
    this.lookX += x;
    this.lookY += y;
  }

  setSprint(active: boolean): void {
    this.sprint = active;
  }

  queueJump(): void {
    this.jumpQueued = true;
  }

  queuePause(): void {
    this.pauseQueued = true;
  }

  getSnapshot(): InputSnapshot {
    return { moveX: this.moveX, moveY: this.moveY, sprint: this.sprint };
  }

  consumeLook(): LookDelta {
    const look = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return look;
  }

  consumeJump(): boolean {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }

  consumePause(): boolean {
    const queued = this.pauseQueued;
    this.pauseQueued = false;
    return queued;
  }

  reset(): void {
    this.moveX = 0;
    this.moveY = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.jumpQueued = false;
    this.pauseQueued = false;
    this.sprint = false;
  }
}

