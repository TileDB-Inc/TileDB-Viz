import { Engine, Scene, SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';
import { RERENDER_EVT } from '../constants';
import pubSub from '../utils/pubSub';

export interface TileDBVisualizationBaseOptions {
  /**
   * Width of widget canvas in pixels
   */
  width?: string;
  /**
   * Height of widget canvas in pixels
   */
  height?: string;
  /**
   * Gets or Set the mouse wheel precision or how fast is the camera zooming.
   */
  wheelPrecision?: number;
  /**
   * When camera view in first-person determines how fast to move
   */
  moveSpeed?: number;
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
  width: string;
  height: string;
  canvas?: HTMLCanvasElement;
  engine?: Engine;
  wheelPrecision: number;
  moveSpeed: number;
  inspector?: boolean;
  rootElement: HTMLElement;

  constructor(options: TileDBVisualizationBaseOptions) {
    this.width = options.width || '100%';
    this.height = options.height || '100%';
    this.wheelPrecision = options.wheelPrecision || -1;
    this.moveSpeed = options.moveSpeed || -1;
    this.inspector = options.inspector || false;
    this.rootElement = options.rootElement;

    pubSub.removeAllListeners(RERENDER_EVT);
  }

  rerenderCanvas = async () => {
    this.createScene();
  };

  resizeCanvas(dimensions?: { width: string; height: string }): void {
    if (dimensions) {
      const { width, height } = dimensions;
      this.width = width;
      this.height = height;
      this.canvas?.setAttribute('width', width);
      this.canvas?.setAttribute('height', height);
    }
    this.engine?.resize();
  }

  destroy() {
    this.engine?.dispose();
    this.canvas?.remove();
    pubSub.removeAllListeners(RERENDER_EVT);
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
    const canvas = document.createElement('canvas');
    canvas.style.width = this.width;
    canvas.style.height = this.height;
    this.canvas = canvas;
    this.canvas.setAttribute('width', this.width);
    this.canvas.setAttribute('height', this.height);
    pubSub.subscribe(RERENDER_EVT, this.rerenderCanvas);

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
