import {
  ArcRotateCamera,
  Color3,
  Scene,
  StandardMaterial,
  Color4,
  MeshBuilder,
  Vector3,
  Texture
  //Texture
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
}
export class TileDBImageVisualization extends TileDBVisualization {
  //private data: any;
  //private options: TileDBImageVisualizationOptions;
  //private bbox = { X: [9500, 14000], Y: [9500, 14000] };
  //bbox: any;
  //private bbox: number[];

  constructor(options: TileDBImageVisualizationOptions) {
    super(options);
    //this.options = options;

    // initialize the TileDB client
    if (options.token) {
      getTileDBClient({
        apiKey: options.token
      });
    }
  }

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(scene => {
      //const data = this.data;
      //const bbox = this.bbox;

      // load data from array
      // if mapbox

      // if sar

      // if weather
      //const data2 = fetchImageData(this.options);
      //console.log('data2 :' + data2);

      // process data with D3 into a svg and convert to objectURL
      const svg = createBarChart();
      const svgElement = svg.node();
      const clonedSvgElement = svgElement?.outerHTML as BlobPart;
      const blob = new Blob([clonedSvgElement], {
        type: 'image/svg+xml;charset=utf-8'
      });
      const url = URL.createObjectURL(blob);

      // set up camera and light
      scene.createDefaultCameraOrLight(true, true, true);
      scene.clearColor = new Color4(0.95, 0.94, 0.92, 1);

      const groundMaterial = new StandardMaterial('ground', scene);
      groundMaterial.diffuseTexture = new Texture(url, scene);
      //groundMaterial.diffuseTexture = texture;
      //groundMaterial.diffuseTexture = new Texture(blobURL, scene);
      //groundMaterial.ambientTexture = new Texture(svg, scene);
      groundMaterial.ambientColor = new Color3(0.5, 0.5, 0.5);
      groundMaterial.diffuseColor = new Color3(0.8, 0.8, 0.8);
      groundMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
      groundMaterial.specularPower = 32;

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
          height: 1,
          width: 1,
          subdivisions: 400
        },
        scene
      );
      ground.material = groundMaterial;

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

      return scene;
    });
  }
}
