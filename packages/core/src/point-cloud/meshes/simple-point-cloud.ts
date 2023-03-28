import {
  Mesh,
  Scene,
  EngineStore,
  Material,
  Color3,
  VertexData,
  VertexBuffer,
  IDisposable,
  StandardMaterial
} from '@babylonjs/core';

export class SimplePointsCloudSystem implements IDisposable {
  /**
   * The PCS name. This name is also given to the underlying mesh.
   */
  public name: string;

  /**
   * The PCS mesh. It's a standard BJS Mesh, so all the methods from the Mesh class are available.
   */
  public mesh?: Mesh;

  /**
   * The PCS total number of particles. Read only. Use PCS.counter instead if you need to set your own value.
   */
  public nbParticles = 0;

  /**
   * @internal
   */
  public _size: number; //size of each point particle

  private _scene: Scene;
  private _positions32?: Float32Array;
  private _colors32?: Float32Array;
  private _uvs32?: Float32Array;

  /**
   * Gets the particle positions computed by the Point Cloud System
   */
  public get positions() {
    return this._positions32;
  }

  /**
   * Gets the particle colors computed by the Point Cloud System
   */
  public get colors() {
    return this._colors32;
  }

  /**
   * Gets the particle uvs computed by the Point Cloud System
   */
  public get uvs() {
    return this._uvs32;
  }

  /**
   * Creates a PCS (Points Cloud System) object
   * @param name (String) is the PCS name, this will be the underlying mesh name
   * @param pointSize (number) is the size for each point. Has no effect on a WebGPU engine.
   * @param scene (Scene) is the scene in which the PCS is added
   */
  constructor(name: string, pointSize: number, scene: Scene) {
    this.name = name;
    this._size = pointSize;
    this._scene = scene || EngineStore.LastCreatedScene;
  }

  public buildMeshFromBuffer(
    positions: Float32Array,
    colors?: Float32Array,
    uvs?: Float32Array,
    material?: Material
  ): void {
    const vertexData = new VertexData();

    this._positions32 = positions;
    vertexData.set(this._positions32, VertexBuffer.PositionKind);

    if (uvs && uvs.length > 0) {
      this._uvs32 = uvs;
      vertexData.set(this._uvs32, VertexBuffer.UVKind);
    }
    let ec = 0; //emissive color value 0 for UVs, 1 for color
    if (colors && colors.length > 0) {
      ec = 1;
      this._colors32 = colors;
      vertexData.set(this._colors32, VertexBuffer.ColorKind);
    }

    const mesh = new Mesh(this.name, this._scene);
    vertexData.applyToMesh(mesh, false);
    this.mesh = mesh;

    let mat = material;

    if (!mat) {
      mat = new StandardMaterial('point cloud material', this._scene);
      (<StandardMaterial>mat).emissiveColor = new Color3(ec, ec, ec);
      (<StandardMaterial>mat).disableLighting = true;
      (<StandardMaterial>mat).pointsCloud = true;
      (<StandardMaterial>mat).pointSize = this._size;
    }
    mesh.material = mat;
  }

  public dispose(): void {
    this.mesh?.dispose();
    (<any>this._positions32) = null;
    (<any>this._colors32) = null;
    (<any>this._uvs32) = null;
  }
}
