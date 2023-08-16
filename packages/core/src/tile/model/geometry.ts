import { Mesh, Scene, Nullable, VertexData } from '@babylonjs/core';
import { Events } from '@tiledb-inc/viz-components';
import { GeometryMessage } from '../types';
import { PolygonShaderMaterial } from '../materials/polygonShaderMaterial';

export class Geometry {
  public isLoaded: boolean;
  public isPending: boolean;
  public canEvict: boolean;
  public index: number[];
  public mesh: Nullable<Mesh>;

  private vertexData!: VertexData;
  private scene: Scene;
  private worker!: Worker;

  private namespace: string;
  private token: string;
  private basePath: string;

  private imageCRS: string;
  private geometryCRS: string;
  private geotransformCoefficients: number[];
  private tileSize: number;

  public constructor(
    index: number[],
    tileSize: number,
    imageCRS: string,
    geometryCRS: string,
    geotransformCoefficients: number[],
    namespace: string,
    token: string,
    basePath: string,
    scene: Scene
  ) {
    this.mesh = null;
    this.index = index;
    this.scene = scene;
    this.namespace = namespace;
    this.token = token;
    this.basePath = basePath;
    this.geotransformCoefficients = geotransformCoefficients;
    this.canEvict = false;
    this.isLoaded = false;
    this.isPending = false;
    this.geometryCRS = geometryCRS;
    this.imageCRS = imageCRS;
    this.tileSize = tileSize;
  }

  public load() {
    this.updateLoadingStatus(false);

    const data = {
      index: this.index,
      tileSize: this.tileSize,
      geometryID: '3a141cc1-cd90-4c14-bb8d-0881819b51f2',
      namespace: this.namespace,
      token: this.token,
      basePath: this.basePath,
      attribute: 'wkb_geometry',
      imageCRS: this.imageCRS,
      geometryCRS: this.geometryCRS,
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
        this.mesh.material = PolygonShaderMaterial(
          this.index.toString(),
          this.scene
        );
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
