import { Engine, Scene, SceneLoader } from '@babylonjs/core';

interface Values {
  data: any;
  gltf_data: any;
  topo_offset: number;
  classes: { names: string[]; numbers: number[] };
  time_offset: number;
  point_size: number;
  distance_colors?: boolean;
  mapbox_img: BlobPart;
  mesh_rotation: number[];
  mesh_shift: number[];
  mesh_scale: number[];
  gltf_multi: boolean;
  extents: number[];
  xy_bbox: number[];
}
export interface TileDBVisualizationBaseOptions {
  width: string;
  height: string;
  wheelPrecision: number;
  moveSpeed: number;
  zScale: number;
  inspector: boolean;
  rootElement: HTMLElement;
  values: Values;
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
  _values: Values;

  constructor(options: TileDBVisualizationBaseOptions) {
    this.width = options.width;
    this.height = options.height;
    this.wheelPrecision = options.wheelPrecision;
    this.moveSpeed = options.moveSpeed;
    this.zScale = options.zScale;
    this.inspector = options.inspector;
    this.rootElement = options.rootElement;
    this._values = options.values;
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
