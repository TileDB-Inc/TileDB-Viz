import { Mesh, Scene, Nullable, VertexData } from '@babylonjs/core';
import { Events } from '@tiledb-inc/viz-components';
import { GeometryMessage } from '../types';
import { PolygonShaderMaterial } from '../materials/polygonShaderMaterial';
import { LineShaderMaterial } from '../materials/lineShaderMaterial';
import { GeometryMetadata } from '../../types';

export class Geometry {
  public isLoaded: boolean;
  public isPending: boolean;
  public canEvict: boolean;
  public index: number[];
  public mesh: Nullable<Mesh>;

  private vertexData!: VertexData;
  private scene: Scene;
  private worker!: Worker;

  private geometryID: string;
  private namespace: string;
  private token: string;
  private basePath: string;

  private imageCRS: string;
  private geometryMetadata: GeometryMetadata;
  private geotransformCoefficients: number[];
  private tileSize: number;

  public constructor(
    index: number[],
    geometryID: string,
    tileSize: number,
    geometryMetadata: GeometryMetadata,
    imageCRS: string,
    geotransformCoefficients: number[],
    namespace: string,
    token: string,
    basePath: string,
    scene: Scene
  ) {
    this.mesh = null;
    this.index = index;
    this.scene = scene;
    this.geometryID = geometryID;
    this.namespace = namespace;
    this.token = token;
    this.basePath = basePath;
    this.geotransformCoefficients = geotransformCoefficients;
    this.canEvict = false;
    this.isLoaded = false;
    this.isPending = false;
    this.geometryMetadata = geometryMetadata;
    this.imageCRS = imageCRS;
    this.tileSize = tileSize;
  }

  public load() {
    this.updateLoadingStatus(false);

    const data = {
      index: this.index,
      tileSize: this.tileSize,
      geometryID: this.geometryID,
      namespace: this.namespace,
      token: this.token,
      basePath: this.basePath,
      attribute: this.geometryMetadata.attribute,
      type: this.geometryMetadata.type,
      imageCRS: this.imageCRS,
      geometryCRS: this.geometryMetadata.crs,
      geotransformCoefficients: this.geotransformCoefficients
    } as GeometryMessage;

    this.worker = new Worker(
      new URL('../worker/tiledb.geometry.worker', import.meta.url),
      {
        type: 'module'
      }
    );

    this.worker.onmessage = (event: any) => {
      this.worker.terminate();
      this.mesh?.dispose();

      if (event.data.positions.length !== 0) {
        this.vertexData = new VertexData();
        this.vertexData.positions = event.data.positions;
        this.vertexData.indices = event.data.indices;

        this.mesh = new Mesh(this.index.toString(), this.scene);
        this.vertexData.applyToMesh(this.mesh, false);

        this.mesh.position.addInPlaceFromFloats(0, -10, 0);

        switch (this.geometryMetadata.type) {
          case 'LineString':
            this.mesh.material = LineShaderMaterial(
              this.index.toString(),
              this.scene
            );
            break;
          case 'Polygon':
            this.mesh.material = PolygonShaderMaterial(
              this.index.toString(),
              this.scene
            );
            break;
          default:
            console.warn(`Unknown geometry type "${event.data.type}"`);
            break;
        }
      }

      this.updateLoadingStatus(true);

      this.isLoaded = true;
      this.isPending = false;
    };

    this.isLoaded = false;
    this.isPending = true;

    this.worker.postMessage(data);
  }

  public dispose() {
    if (!this.isLoaded) {
      this.worker.terminate();
      this.updateLoadingStatus(true);
    }

    this.mesh?.dispose(false, true);
  }

  private updateLoadingStatus(loaded: boolean) {
    window.dispatchEvent(
      new CustomEvent(Events.ENGINE_INFO_UPDATE, {
        bubbles: true,
        detail: {
          type: 'LOADING_TILE',
          loaded
        }
      })
    );
  }
}
