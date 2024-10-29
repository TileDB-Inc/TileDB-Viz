import {
  AbstractEngine,
  Engine,
  Scene,
  SceneLoader,
  WebGPUEngine
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';
import { RERENDER_EVT } from '../constants';
import pubSub from '../utils/pubSub';
import '@tiledb-inc/viz-components';
import { waitUntilElementVisible } from '../utils/ui-helpers';

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

  engineAPI?: 'WEBGL' | 'WEBGPU';
}

export class TileDBVisualization {
  width: string;
  height: string;
  canvas?: HTMLCanvasElement;
  engine?: AbstractEngine;
  wheelPrecision: number;
  moveSpeed: number;
  inspector?: boolean;
  rootElement: HTMLElement;
  engineAPI: 'WEBGL' | 'WEBGPU';

  constructor(options: TileDBVisualizationBaseOptions) {
    this.width = options.width || '100%';
    this.height = options.height || '100%';
    this.wheelPrecision = options.wheelPrecision || -1;
    this.moveSpeed = options.moveSpeed || -1;
    this.inspector = options.inspector || false;
    this.rootElement = options.rootElement;
    this.engineAPI = options.engineAPI ?? 'WEBGL';

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
    this.engine?.resize(true);
  }

  destroy() {
    this.engine?.dispose();
    this.canvas?.remove();
    pubSub.removeAllListeners(RERENDER_EVT);
  }

  protected async createScene(): Promise<Scene> {
    const scene = new Scene(this.engine as Engine, { useClonedMeshMap: true });

    if (this.inspector) {
      scene.debugLayer.show({
        embedMode: true
      });
    }

    return scene;
  }

  render(): void {
    const canvas = document.createElement('canvas');
    let wrapperDiv = this.rootElement.firstChild as HTMLElement | null;

    if (!wrapperDiv) {
      wrapperDiv = document.createElement('div');
      wrapperDiv.id = 'tdb-viz-wrapper';
      wrapperDiv.style.position = 'relative';
      if (this.width) {
        wrapperDiv.style.width = this.width;
      } else {
        wrapperDiv.style.width = '100%';
      }
    }

    canvas.style.width = this.width;
    canvas.style.height = this.height;

    this.canvas = canvas;
    this.canvas.setAttribute('width', this.width);
    this.canvas.setAttribute('height', this.height);
    pubSub.subscribe(RERENDER_EVT, this.rerenderCanvas);
    wrapperDiv.appendChild(this.canvas);

    const loadingScreen = document.createElement('div');
    loadingScreen.innerHTML =
      '<loading-screen id="viewer-loading-screen"></loading-screen>';

    this.rootElement.appendChild(wrapperDiv);
    this.rootElement.appendChild(loadingScreen);

    waitUntilElementVisible('viewer-loading-screen', 1000, 100).then(loaded => {
      if (!loaded) {
        // HTML element failed to load. Remove it and emit a warning
        console.warn('Loading screen component failed to load');
        this.rootElement.removeChild(loadingScreen);
      }

      if (this.engineAPI === 'WEBGL') {
        this.engine = new Engine(canvas, true);
        this.engine.doNotHandleContextLost = true;

        const engine = this.engine as Engine;
        engine.disableUniformBuffers = false;

        SceneLoader.ShowLoadingScreen = false;

        this.resizeCanvas();

        // window resize event handler
        window.addEventListener('resize', () => {
          this.engine?.resize(true);
        });

        this.createScene().then(scene => {
          engine.runRenderLoop(() => {
            scene.render();
          });
        });
      } else {
        this.engine = new WebGPUEngine(canvas);
        const engine = this.engine as WebGPUEngine;

        engine.initAsync().then(() => {
          SceneLoader.ShowLoadingScreen = false;

          this.resizeCanvas();

          // window resize event handler
          window.addEventListener('resize', () => {
            this.engine?.resize(true);
          });

          this.createScene().then(scene => {
            engine.runRenderLoop(() => {
              scene.render();
            });
          });
        });
      }
    });
  }
}
