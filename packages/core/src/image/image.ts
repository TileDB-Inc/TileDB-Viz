import {
  ArcRotateCamera,
  DynamicTexture,
  Scene,
  StandardMaterial,
  Color4,
  MeshBuilder,
  Vector3,
  Texture
} from '@babylonjs/core';
import { TileDBVisualization, TileDBVisualizationBaseOptions } from '../base';
import getTileDBClient from '../utils/getTileDBClient';
import { createBarChart } from './bar-chart';
//import { fetchImageData } from './fetch-image-data';

export interface TileDBImageVisualizationOptions
  extends TileDBVisualizationBaseOptions {
  /**
   * Namespace of the array registered in TileDB Cloud (if mode === "cloud")
   */
  namespace?: string;
  /**
   * Name of the array registered in TileDB Cloud (if mode === "cloud")
   */
  arrayName?: string;
  /**
   * TileDB Cloud api token (if mode === "cloud")
   */
  token?: string;
  /**
   * Path to TileDB config file
   */
  tiledbEnv?: string;
  /**
   * Data to render
   */
  data?: any;
  /**
   * The min and max values of the dimensions (X and Y for now) used to load data from array
   */
  //bbox: { X: number[]; Y: number[] };
  //band: number;
  /**
   * TileDB query buffer size
   */
  bufferSize?: number;
  chartType?: string;
}
export class TileDBImageVisualization extends TileDBVisualization {
  options: TileDBImageVisualizationOptions;
  //private data: any;
  //private options: TileDBImageVisualizationOptions;
  //private bbox = { X: [9500, 14000], Y: [9500, 14000] };
  //bbox: any;
  //private bbox: number[];

  constructor(options: TileDBImageVisualizationOptions) {
    super(options);
    this.options = options;

    // initialize the TileDB client
    if (options.token) {
      getTileDBClient({
        apiKey: options.token
      });
    }
  }

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(scene => {
      // 'interactive', 'bar' or 'mapbox'
      const chartType = this.options.chartType;
      console.log(chartType);

      //const dataType = 'sar';

      //const data = fetchImageData(this.options, dataType);
      //console.log(data);

      let url: string;
      let svg: any;

      const groundMaterial = new StandardMaterial('ground', scene);

      let textureContext: any;
      let myCanvas: HTMLCanvasElement;
      let canvasTexture: DynamicTexture;

      function svgToURL(svg: any) {
        const svgElement = svg.node();
        const clonedSvgElement = svgElement?.outerHTML as BlobPart;
        const blob = new Blob([clonedSvgElement], {
          type: 'image/svg+xml;charset=utf-8'
        });
        url = URL.createObjectURL(blob);
        return url;
      }

      if (chartType === 'bar') {
        svg = createBarChart();
        url = svgToURL(svg);
        groundMaterial.diffuseTexture = new Texture(url, scene);
      } else if (chartType === 'interactive') {
        myCanvas = document.createElement('canvas');
        myCanvas.width = 512;
        myCanvas.height = 512;
        textureContext = myCanvas.getContext('2d');
        canvasTexture = new DynamicTexture('dt', myCanvas, scene);
        groundMaterial.diffuseTexture = canvasTexture;
      }

      //
      //groundMaterial.ambientTexture = new Texture(svg, scene);
      //groundMaterial.ambientColor = new Color3(0.5, 0.5, 0.5);
      //groundMaterial.diffuseColor = new Color3(0.8, 0.8, 0.8);
      //groundMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
      //groundMaterial.specularPower = 32;

      // const xmin = this.bbox.X[0];
      // const xmax = this.bbox.X[1];
      // const ymin = this.bbox.Y[0];
      // const ymax = this.bbox.Y[1];

      // const ground = MeshBuilder.CreateGround(
      //   'ground',
      //   {
      //     height: (xmax - xmin) * 0.005,
      //     width: (ymax - ymin) * 0.005,
      //     subdivisions: 36
      //   },
      //   scene
      // );

      const ground = MeshBuilder.CreateGround(
        'ground',
        {
          height: 6,
          width: 6
          //subdivisions: 400
        },
        scene
      );
      ground.material = groundMaterial;

      // set up camera and light
      scene.createDefaultCameraOrLight(true, true, true);
      scene.clearColor = new Color4(0.95, 0.94, 0.92, 1);

      const camera = scene.activeCamera as ArcRotateCamera;
      camera.panningAxis = new Vector3(1, 1, 0);
      camera.upperBetaLimit = Math.PI / 2;
      camera.panningSensibility = 1;
      camera.panningInertia = 0.2;
      camera._panningMouseButton = 0;

      if (this.wheelPrecision > 0) {
        camera.wheelPrecision = this.wheelPrecision;
      }

      camera.alpha += Math.PI;
      camera.attachControl(this.canvas, false);

      if (chartType === 'interactive') {
        const getRandomArbitrary = (min: number, max: number) => {
          return Math.random() * (max - min) + min;
        };

        scene.onBeforeRenderObservable.add(scene => {
          if (textureContext !== null) {
            textureContext.fillStyle =
              '#' +
              (0x1000000 + Math.random() * 0xffffff).toString(16).substr(1, 6);
            textureContext.beginPath();
            const x = getRandomArbitrary(0, 512);
            const y = getRandomArbitrary(0, 512);
            const radius = getRandomArbitrary(50, 256);
            textureContext.arc(x, y, radius, 0, Math.PI * 2);
            textureContext.fill();
            canvasTexture.update();
          }
        });
      }

      return scene;
    });
  }
}
