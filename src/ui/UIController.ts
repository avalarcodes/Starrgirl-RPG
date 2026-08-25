import { CHAPTERS } from "../data/chapters";
import { GENERALS, type GeneralId } from "../data/generals";
import { GamePhase } from "../game/core/GamePhase";
import type { GameState } from "../game/state/GameState";

interface UIActions {
  onChapterMode: () => void;
  onGeneralSelected: (generalId: GeneralId) => void;
  onContinue: () => void;
  onBeginMission: () => void;
  onEnterGameplay: () => void;
  onResumeGameplay: () => void;
  onExitGameplay: () => void;
}

export class UIController {
  private touchMode = false;
  private debugVisible = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly actions: UIActions,
  ) {}

  configureGameplay(touchMode: boolean, debugVisible: boolean): void {
    this.touchMode = touchMode;
    this.debugVisible = debugVisible;
  }

  render(state: Readonly<GameState>): void {
    switch (state.currentPhase) {
      case GamePhase.TITLE:
        this.renderTitle();
        break;
      case GamePhase.GENERAL_SELECTION:
        this.renderGeneralSelection(state.selectedGeneralId);
        break;
      case GamePhase.BRIEFING:
        this.renderBriefing();
        break;
      case GamePhase.GAMEPLAY:
        this.renderGameplay();
        break;
      default:
        this.root.replaceChildren();
    }
  }

  private renderTitle(): void {
    this.root.innerHTML = `
      <main class="screen screen--title">
        <div class="eyebrow">THE SUCCESSION TRIALS</div>
        <h1>STARRWORLD</h1>
        <p class="lede">Choose your General. Earn the Crown.</p>
        <div class="menu-actions">
          <button class="button button--primary" data-action="chapter-mode">CHAPTER MODE</button>
          <button class="button button--locked" disabled>
            <span>SURVIVAL MODE</span>
            <small>LOCKED · Complete Chapter Mode to unlock</small>
          </button>
        </div>
      </main>`;

    this.root.querySelector("[data-action='chapter-mode']")?.addEventListener("click", this.actions.onChapterMode);
  }

  private renderGeneralSelection(selectedGeneralId: GeneralId | null): void {
    const cards = GENERALS.map(
      (general) => `
        <button
          class="general-card${general.id === selectedGeneralId ? " is-selected" : ""}"
          data-general-id="${general.id}"
          aria-pressed="${general.id === selectedGeneralId}"
        >
          <span class="general-symbol general-symbol--${general.id}">${general.symbol}</span>
          <span class="general-name">${general.displayName}</span>
          <span class="general-role">${general.descriptor}</span>
          <span class="selection-mark">SELECTED</span>
        </button>`,
    ).join("");

    this.root.innerHTML = `
      <main class="screen screen--selection">
        <div class="eyebrow">SUCCESSION TRIAL ENTRY</div>
        <h2>CHOOSE YOUR STARR GENERAL</h2>
        <div class="general-grid">${cards}</div>
        <button class="button button--primary continue-button" data-action="continue" ${selectedGeneralId ? "" : "disabled"}>
          CONTINUE
        </button>
      </main>`;

    this.root.querySelectorAll<HTMLElement>("[data-general-id]").forEach((card) => {
      card.addEventListener("click", () => {
        const generalId = card.dataset.generalId as GeneralId;
        this.actions.onGeneralSelected(generalId);
      });
    });
    this.root.querySelector("[data-action='continue']")?.addEventListener("click", this.actions.onContinue);
  }

  private renderBriefing(): void {
    const chapter = CHAPTERS[0];
    if (!chapter) return;

    this.root.innerHTML = `
      <main class="screen screen--briefing">
        <section class="briefing-card">
          <div class="eyebrow">CHAPTER ${chapter.number}</div>
          <h2>${chapter.title.toUpperCase()}</h2>
          <div class="divider" aria-hidden="true"></div>
          <p>The first trial awaits. Recover every fragment and return with the message hidden within.</p>
          <button class="button button--primary" data-action="begin-mission">BEGIN MISSION</button>
        </section>
      </main>`;

    this.root.querySelector("[data-action='begin-mission']")?.addEventListener("click", this.actions.onBeginMission);
  }

  setGameplayActive(active: boolean, hasEntered: boolean): void {
    const prompt = this.root.querySelector<HTMLElement>("[data-gameplay-prompt]");
    if (!prompt) return;
    prompt.classList.toggle("is-hidden", active);
    const title = prompt.querySelector<HTMLElement>("[data-prompt-title]");
    const initialHelp = prompt.querySelector<HTMLElement>("[data-initial-help]");
    const pauseActions = prompt.querySelector<HTMLElement>("[data-pause-actions]");
    if (title) title.textContent = hasEntered ? "PAUSED" : `${this.touchMode ? "TAP" : "CLICK"} TO ENTER STARRWORLD`;
    initialHelp?.classList.toggle("is-hidden", hasEntered);
    pauseActions?.classList.toggle("is-hidden", !hasEntered);
    if (hasEntered) prompt.dataset.entered = "true";
    this.root.querySelector("[data-touch-controls]")?.classList.toggle("is-disabled", !active);
  }

  toggleDebug(): void {
    this.root.querySelector("[data-debug]")?.classList.toggle("is-hidden");
  }

  updateDebug(lines: readonly string[]): void {
    const debug = this.root.querySelector<HTMLElement>("[data-debug]");
    if (debug) debug.textContent = lines.join("\n");
  }

  private renderGameplay(): void {
    const touchControls = this.touchMode
      ? `<div class="touch-controls is-disabled" data-touch-controls>
          <div class="touch-look-area" data-look-area aria-label="Drag to look"></div>
          <div class="touch-joystick" data-joystick aria-label="Movement joystick">
            <div class="touch-joystick__knob" data-joystick-knob></div>
          </div>
          <button class="touch-button touch-button--jump" data-jump type="button">JUMP</button>
          <button class="touch-button touch-button--pause" data-touch-pause type="button" aria-label="Pause">Ⅱ</button>
        </div>`
      : "";
    this.root.innerHTML = `
      <main class="gameplay-ui">
        <div class="crosshair" aria-hidden="true"></div>
        <pre class="debug-readout${this.debugVisible ? "" : " is-hidden"}" data-debug>INITIALIZING…</pre>
        ${touchControls}
        <aside class="orientation-message">
          <strong>ROTATE YOUR DEVICE</strong>
          <span>Starrworld plays best in landscape.</span>
        </aside>
        <div class="pointer-prompt" data-gameplay-prompt>
          <strong data-prompt-title>${this.touchMode ? "TAP TO ENTER STARRWORLD" : "CLICK TO ENTER STARRWORLD"}</strong>
          <span data-initial-help>${this.touchMode ? "Tap to begin · Use both thumbs to move and look" : "WASD to move · Space to jump · Shift to sprint"}</span>
          <div class="pause-actions is-hidden" data-pause-actions>
            <button class="button button--primary" data-action="resume">RESUME</button>
            <button class="button" data-action="exit-gameplay">EXIT TO MENU</button>
          </div>
        </div>
      </main>`;

    this.root.querySelector("[data-gameplay-prompt]")?.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-action='exit-gameplay']")) return;
      if (target.closest("[data-action='resume']")) this.actions.onResumeGameplay();
      else this.actions.onEnterGameplay();
    });
    this.root.querySelector("[data-action='exit-gameplay']")?.addEventListener("click", this.actions.onExitGameplay);
  }
}
