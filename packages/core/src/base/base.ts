import { Engine, Scene, SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';
import { RERENDER_EVT } from '../constants';
import pubSub from '../utils/pubSub';

export interface TileDBVisualizationBaseOptions {
  /**
   * Width of the widget canvas
   */
  width?: number;
  /**
   * Height of the widget canvas
   */
  height?: number;
  /**
   * Gets or Set the mouse wheel precision or how fast the camera is zooming.
   */
  wheelPrecision?: number;
  /**
   * Show the BabylonJS inspector
   */
  inspector?: boolean;
  /**
   * The HTML element to render the canvas
   */
  rootElement: HTMLElement;
}
export class TileDBVisualization {
  width: string | number;
  height: string | number;
  canvas?: HTMLCanvasElement;
  engine?: Engine;
  wheelPrecision: number;
  inspector?: boolean;
  rootElement: HTMLElement;

  constructor(options: TileDBVisualizationBaseOptions) {
    this.width = options.width || '100%';
    this.height = options.height || '100%';
    this.wheelPrecision = options.wheelPrecision || -1;
    this.inspector = options.inspector;
    this.rootElement = options.rootElement;

    pubSub.removeAllListeners(RERENDER_EVT);
  }

  rerenderCanvas = async () => {
    this.createScene();
  };

  resizeCanvas(dimensions?: { width: number; height: number }): void {
    const width = dimensions?.width || this.width;
    const height = dimensions?.height || this.height;
    if (dimensions) {
      this.width = dimensions.width;
      this.height = dimensions.height;
    }
    this.canvas?.setAttribute('width', width.toString());
    this.canvas?.setAttribute('height', height.toString());
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
    canvas.style.width = this.width.toString();
    canvas.style.height = this.height.toString();
    this.canvas = canvas;
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
