import { Engine, Scene, SceneLoader } from '@babylonjs/core';

export interface TileDBVisualizationBaseOptions {
  width: string;
  height: string;
  wheelPrecision: number;
  moveSpeed: number;
  zScale: number;
  inspector: boolean;
  rootElement: HTMLElement;
}
export class TileDBVisualization {
  canvas?: HTMLCanvasElement;
  engine?: Engine;
  width: string;
  height: string;
  wheelPrecision: number;
  moveSpeed: number;
  zScale: number;
  inspector: boolean;
  rootElement: HTMLElement;

  constructor(options: TileDBVisualizationBaseOptions) {
    this.width = options.width;
    this.height = options.height;
    this.wheelPrecision = options.wheelPrecision;
    this.moveSpeed = options.moveSpeed;
    this.zScale = options.zScale;
    this.inspector = options.inspector;
    this.rootElement = options.rootElement;
  }

  resizeCanvas(dimensions?: { width: string; height: string }): void {
    if (dimensions) {
      const { width, height } = dimensions;
      this.width = width;
      this.height = height;
    }
    this.canvas?.setAttribute('width', this.width);
    this.canvas?.setAttribute('height', this.height);
    this.engine?.resize();
  }

  protected async createScene(): Promise<Scene> {
    const scene = new Scene(this.engine as Engine);

    if (this.inspector) {
      scene.debugLayer.show({
        embedMode: true
      });
    }

    return scene;
  }

  render(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.classList.add('renderCanvas');
    this.rootElement.appendChild(this.canvas);

    this.engine = new Engine(this.canvas, true);

    const engine = this.engine;

    SceneLoader.ShowLoadingScreen = false;

    this.resizeCanvas();

    // window resize event handler
    window.addEventListener('resize', () => {
      this.engine?.resize();
    });

    this.createScene().then(scene => {
      engine.runRenderLoop(() => {
        scene.render();
      });
    });
  }
}
