import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import "@babylonjs/core/Meshes/instancedMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";

export const CHAPTER_ONE_SPAWN = {
  position: new Vector3(0, 1.78, -20),
  yaw: 0,
} as const;

export class ChapterOneScene {
  readonly scene: Scene;

  constructor(engine: Engine) {
    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0.012, 0.006, 0.028, 1);
    this.scene.collisionsEnabled = true;
    this.buildLighting();
    this.buildArena();
    this.buildStars();
  }

  dispose(): void {
    this.scene.dispose();
  }

  private buildLighting(): void {
    const ambient = new HemisphericLight("arena-fill", new Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.72;
    ambient.diffuse = new Color3(0.48, 0.35, 0.78);
    ambient.groundColor = new Color3(0.035, 0.018, 0.06);

    const key = new DirectionalLight("arena-key", new Vector3(-0.4, -1, -0.25), this.scene);
    key.position = new Vector3(12, 18, -12);
    key.intensity = 0.8;
    key.diffuse = new Color3(0.72, 0.58, 1);
  }

  private buildArena(): void {
    const floorMaterial = this.createMaterial("floor", new Color3(0.055, 0.035, 0.09));
    const wallMaterial = this.createMaterial("walls", new Color3(0.11, 0.055, 0.18));
    const accentMaterial = this.createMaterial("accents", new Color3(0.28, 0.1, 0.48), new Color3(0.12, 0.03, 0.22));
    const platformMaterial = this.createMaterial("platforms", new Color3(0.09, 0.08, 0.15));
    const guideMaterial = this.createMaterial("spawn-guides", new Color3(0.22, 0.08, 0.38), new Color3(0.16, 0.035, 0.27));

    this.box("floor", new Vector3(48, 1, 48), new Vector3(0, -0.5, 0), floorMaterial);
    this.box("spawn-pad", new Vector3(5, 0.04, 5), new Vector3(0, 0.01, -20), guideMaterial, false);
    this.box("left-guide", new Vector3(0.18, 0.02, 25), new Vector3(-3, 0.01, -7), guideMaterial, false);
    this.box("right-guide", new Vector3(0.18, 0.02, 25), new Vector3(3, 0.01, -7), guideMaterial, false);

    this.box("north-wall", new Vector3(48, 5, 1), new Vector3(0, 2.5, 24), wallMaterial);
    this.box("south-wall", new Vector3(48, 5, 1), new Vector3(0, 2.5, -24), wallMaterial);
    this.box("east-wall", new Vector3(1, 5, 48), new Vector3(24, 2.5, 0), wallMaterial);
    this.box("west-wall", new Vector3(1, 5, 48), new Vector3(-24, 2.5, 0), wallMaterial);

    this.box("center-barrier", new Vector3(10, 3, 1), new Vector3(0, 1.5, -5), wallMaterial);
    this.box("left-pillar", new Vector3(2.4, 5, 2.4), new Vector3(-10, 2.5, 2), accentMaterial);
    this.box("right-pillar", new Vector3(2.4, 5, 2.4), new Vector3(10, 2.5, 2), accentMaterial);
    this.box("cover-a", new Vector3(3, 2.5, 3), new Vector3(-16, 1.25, -10), platformMaterial);
    this.box("cover-b", new Vector3(4, 1.5, 2), new Vector3(15, 0.75, -6), platformMaterial);
    this.box("cover-c", new Vector3(2, 3.5, 5), new Vector3(-15, 1.75, 12), platformMaterial);

    this.box("elevated-platform", new Vector3(12, 1, 10), new Vector3(12, 3.5, 14), platformMaterial);
    const ramp = this.box("elevated-ramp", new Vector3(6, 0.7, 12), new Vector3(12, 1.45, 5), accentMaterial);
    ramp.rotation.x = -Math.atan2(3, 10);

    this.box("low-platform", new Vector3(8, 1, 6), new Vector3(-6, 1, 14), platformMaterial);
    this.box("step-one", new Vector3(4, 0.5, 2), new Vector3(-6, 0.25, 9.5), accentMaterial);
    this.box("step-two", new Vector3(4, 1, 2), new Vector3(-6, 0.5, 11.2), accentMaterial);
  }

  private buildStars(): void {
    const starMaterial = this.createMaterial("stars", Color3.Black(), new Color3(0.58, 0.42, 0.9));
    starMaterial.disableLighting = true;
    const source = MeshBuilder.CreateSphere("arena-star-source", { diameter: 0.07, segments: 3 }, this.scene);
    source.material = starMaterial;
    source.isVisible = false;

    for (let index = 0; index < 90; index += 1) {
      const star = source.createInstance(`arena-star-${index}`);
      const angle = index * 2.399;
      const radius = 27 + ((index * 13) % 15);
      star.position.set(Math.cos(angle) * radius, 7 + ((index * 19) % 20), Math.sin(angle) * radius);
      star.scaling.setAll(0.7 + (index % 3) * 0.35);
    }
  }

  private box(name: string, size: Vector3, position: Vector3, material: StandardMaterial, collidable = true) {
    const mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, this.scene);
    mesh.position.copyFrom(position);
    mesh.material = material;
    mesh.checkCollisions = collidable;
    return mesh;
  }

  private createMaterial(name: string, diffuse: Color3, emissive = Color3.Black()): StandardMaterial {
    const material = new StandardMaterial(`${name}-material`, this.scene);
    material.diffuseColor = diffuse;
    material.emissiveColor = emissive;
    material.specularColor = new Color3(0.18, 0.12, 0.28);
    return material;
  }
}
