import { Engine, Scene, SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';

export interface TileDBVisualizationBaseOptions {
  /**
   * Width of widget canvas
   */
  width: number;
  /**
   * Height of widget canvas
   */
  height: number;
  /**
   * Gets or Set the mouse wheel precision or how fast is the camera zooming.
   */
  wheelPrecision?: number;
  /**
   * When camera view in first-person determines how fast to move
   */
  moveSpeed?: number;
  /**
   * Scale the z values of each point
   */
  zScale?: number;
  /**
   * Show BabylonJS inspector
   */
  inspector?: boolean;
  /**
   * The HTML element to render the canvas
   */
  rootElement: HTMLElement;
}
export class TileDBVisualization {
  canvas?: HTMLCanvasElement;
  engine?: Engine;
  width: number;
  height: number;
  wheelPrecision: number;
  moveSpeed: number;
  zScale: number;
  inspector?: boolean;
  rootElement: HTMLElement;

  constructor(options: TileDBVisualizationBaseOptions) {
    this.width = options.width;
    this.height = options.height;
    this.wheelPrecision = options.wheelPrecision || -1;
    this.moveSpeed = options.moveSpeed || -1;
    this.zScale = options.zScale || 1;
    this.inspector = options.inspector;
    this.rootElement = options.rootElement;
  }

  resizeCanvas(dimensions?: { width: number; height: number }): void {
    if (dimensions) {
      const { width, height } = dimensions;
      this.width = width;
      this.height = height;
    }
    this.canvas?.setAttribute('width', this.width?.toString());
    this.canvas?.setAttribute('height', this.height?.toString());
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
