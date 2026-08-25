import "./styles.css";
import { Game } from "./game/core/Game";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const uiRoot = document.querySelector<HTMLElement>("#ui-root");

if (!canvas || !uiRoot) {
  throw new Error("Starrworld could not find its required page elements.");
}

const game = new Game(canvas, uiRoot);
game.start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.dispose());
}
