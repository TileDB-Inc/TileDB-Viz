import {
  ArcRotateCamera,
  Color3,
  PointsCloudSystem,
  Scene,
  SceneLoader,
  StandardMaterial,
  MeshBuilder,
  Vector3,
  Texture,
  Camera,
  int,
  Mesh,
  Ray,
  UtilityLayerRenderer,
  FreeCamera,
  KeyboardEventTypes,
  PointerEventTypes,
  HemisphericLight,
  Particle,
  Color4
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Control,
  StackPanel,
  Slider,
  TextBlock
} from 'babylonjs-gui';
import { TileDBVisualization, TileDBVisualizationBaseOptions } from '../base';
import DragGizmos from './utils/dragGizmos';
import { getPointCloud, setPointCloudSwitches, setSceneColors } from './utils';
import pointIsInsideMesh from './utils/pointIsInsideMesh';
import { clearCache } from '../utils/cache';

export type PointCloudMode = 'time' | 'classes' | 'topo' | 'gltf';

export interface PointCloudBBox {
  X: number[];
  Y: number[];
  Z: number[];
}

export interface TileDBPointCloudOptions
  extends TileDBVisualizationBaseOptions {
  /**
   * Optional modes
   * time: add an interactive time slider
   * classes: add an interactive classes slider
   * topo: add a mapbox base layer
   * gltf: add gltf meshes
   */
  mode?: PointCloudMode;
  /**
   * Color scheme
   */
  colorScheme?: string;
  /**
   * Data to render [all modes]
   */
  data: any;
  /**
   * Binary blob of a gltf mesh or an array of gltf meshes [mode='gltf']
   */
  gltfData?: any;
  /**
   * Move the point cloud along the z-axis to better align with the mapbox base layer [mode='topo']
   */
  topoOffset?: number;
  /**
   * Lookup table with the index and names of all classes [mode='classes']
   */
  classes?: { names: string[]; numbers: number[] };
  /**
   * Time offset
   */
  timeOffset?: number;
  /**
   * Size of the points
   */
  pointSize?: number;
  /**
   * Perform clash detection between mesh and point cloud if true
   */
  distanceColors?: boolean;
  /**
   * Blob mpabox image png image as blob
   */
  mapboxImg?: BlobPart;
  /**
   * Rotate the mesh with [alpha,beta,gamma]
   */
  meshRotation?: number[];
  /**
   * Shift the mesh with [x,y,z]
   */
  meshShift?: number[];
  /**
   * Scale the size [x,y,z] of the mesh
   */
  meshScale?: number[];
  /**
   * gltfData is an array with blobs when true
   */
  gltfMulti?: boolean;
  source?: 'dict' | 'cloud';
  showFraction?: number;
  pointShift?: number[];
  rgbMax?: number;
  /**
   * The min and max values of x, y and z
   */
  bbox?: PointCloudBBox;
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
}

/**
 *
 */
export class TileDBPointCloudVisualization extends TileDBVisualization {
  private _utilLayer!: UtilityLayerRenderer;
  private _movedAfterClick = false;
  private _shiftPressed = false;
  private _selected: Array<Mesh> = new Array<Mesh>();
  private _axes: Array<DragGizmos> = new Array<DragGizmos>();
  private _cameras: Array<Camera> = new Array<Camera>();
  private _currCamera: int = 0;
  private _mode?: PointCloudMode;
  private _colorScheme: string;
  private _gltfData: any;
  private _pointSize: number;
  private _timeOffset: number;
  private _classes: { names: string[]; numbers: number[] };
  private _topoOffset: number;
  private _distanceColors: boolean;
  private _gltfMulti: boolean;
  private _meshShift: number[];
  private _meshRotation: number[];
  private _meshScale: number[];
  private _mapboxImg?: BlobPart;
  private _source: string;
  private _data: any;
  private _showFraction?: number;
  private _pointShift?: number[];
  private _rgbMax?: number;
  private _bbox?: PointCloudBBox;
  private _namespace?: string;
  private _arrayName?: string;
  private _token?: string;

  constructor(options: TileDBPointCloudOptions) {
    super(options);
    this._data = options.data;
    this._gltfData = options.gltfData;
    this._mode = options.mode;
    this._colorScheme = options.colorScheme || 'dark';
    this._pointSize = options.pointSize || 1;
    this._timeOffset = options.timeOffset || 0;
    this._classes = options.classes || { numbers: [], names: [] };
    this._topoOffset = options.topoOffset || 0;
    this._distanceColors = options.distanceColors || false;
    this._gltfMulti = options.gltfMulti || false;
    this._meshShift = options.meshShift || [0, 0, 0];
    this._meshRotation = options.meshRotation || [0, 0, 0];
    this._meshScale = options.meshScale || [1, 1, 1];
    this._mapboxImg = options.mapboxImg;
    this._source = options.source || 'dict';
    this._data = options.data;
    this._showFraction = options.showFraction;
    this._pointShift = options.pointShift;
    this._rgbMax = options.rgbMax;
    this._bbox = options.bbox;
    this._namespace = options.namespace;
    this._arrayName = options.arrayName;
    this._token = options.token;
  }

  static async clearCache() {
    await clearCache();
  }

  protected particleLoader =
    (data: any, isTime: boolean, rgbMax: number) =>
    (particle: Particle, i: number) => {
      const distanceColors = this._distanceColors;
      const scene = this._scene;
      const topoOffset = this._topoOffset;
      const scale = this.zScale;
      // Y is up
      particle.position = new Vector3(
        data.X[i],
        (data.Z[i] - topoOffset) * scale,
        data.Y[i]
      );
      if (isTime) {
        particle.color = scene.clearColor;
        particle.position.y = (data.Z[i] - topoOffset) * scale - 100;
      } else {
        particle.color = new Color4(
          data.Red[i] / rgbMax,
          data.Green[i] / rgbMax,
          data.Blue[i] / rgbMax
        );
      }

      if (distanceColors) {
        // check if inside meshes
        particle.color.set(0, 1, 0, 1);
        const meshesLength = scene.meshes.length;

        for (let k = 0; k < meshesLength; k++) {
          const mesh = scene.meshes[k] as Mesh;
          const bounds = mesh.getHierarchyBoundingVectors(true);
          if (pointIsInsideMesh(mesh, bounds, particle.position)) {
            particle.color.set(1, 0, 0, 1);
          }
        }
      }
    };

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(async scene => {
      const main = this;

      const { isTime, isClass, isTopo, isGltf } = setPointCloudSwitches(
        this._mode
      );

      /**
       * Load color scheme colors
       */
      const { backgroundColor, accentColor, secondColor, textColor } =
        setSceneColors(this._colorScheme);

      /**
       * Load point cloud data
       */
      const { data, xmin, xmax, ymin, ymax, zmin, zmax, rgbMax } =
        await getPointCloud({
          source: this._source,
          mode: this._mode,
          data: this._data,
          showFraction: this._showFraction,
          pointShift: this._pointShift,
          rgbMax: this._rgbMax,
          bbox: this._bbox,
          namespace: this._namespace,
          arrayName: this._arrayName,
          token: this._token
        });

      const size_x = xmax - xmin;
      const size_y = ymax - ymin;
      const size_z = zmax - zmin;
      const center_x = xmin + size_x / 2;
      const center_y = ymin + size_y / 2;
      const center_z = zmin + size_z / 2;

      const numCoords = data.X.length;
      const times = data.GpsTime;
      const classification = data.Classification;

      const gltfData = this._gltfData;
      const pointSize = this._pointSize;
      const offset = this._timeOffset;
      const classes = this._classes;
      const topoOffset = this._topoOffset;
      const scale = this.zScale;

      let doClear = false;

      scene.clearColor = backgroundColor;
      let pcs: PointsCloudSystem;

      if (isClass) {
        pcs = new PointsCloudSystem('pcs', pointSize, scene, {
          updatable: isClass
        });
      } else {
        pcs = new PointsCloudSystem('pcs', pointSize, scene, {
          updatable: isTime
        });
      }

      const pcLoader = this.particleLoader(data, isTime, rgbMax);

      const tasks: Promise<any>[] = [];
      if (isGltf) {
        if (this._gltfMulti === false) {
          const blob = new Blob([gltfData]);
          const url = URL.createObjectURL(blob);

          tasks.push(
            SceneLoader.ImportMeshAsync('', url, '', scene, null, '.gltf').then(
              container => {
                container.meshes[0].rotation = new Vector3(
                  this._meshRotation[0],
                  this._meshRotation[1],
                  this._meshRotation[2]
                );
                container.meshes[0].scaling = new Vector3(
                  this._meshScale[0],
                  this._meshScale[1],
                  this._meshScale[2]
                );
                container.meshes[0].position.x =
                  container.meshes[0].position.x + this._meshShift[0];
                container.meshes[0].position.y =
                  container.meshes[0].position.y + this._meshShift[1];
                container.meshes[0].position.z =
                  container.meshes[0].position.z + this._meshShift[2];
              }
            )
          );
        } else if (this._gltfMulti === true) {
          for (let i = 0; i < gltfData.length; i++) {
            const blob = new Blob([gltfData[i]]);
            const url = URL.createObjectURL(blob);

            tasks.push(
              SceneLoader.ImportMeshAsync(
                '',
                url,
                '',
                scene,
                null,
                '.gltf'
              ).then(container => {
                container.meshes[0].rotation = new Vector3(
                  this._meshRotation[0],
                  this._meshRotation[1],
                  this._meshRotation[2]
                );
                container.meshes[0].scaling = new Vector3(
                  this._meshScale[0],
                  this._meshScale[1],
                  this._meshScale[2]
                );
                container.meshes[0].position.x =
                  container.meshes[0].position.x + this._meshShift[0];
                container.meshes[0].position.y =
                  container.meshes[0].position.y + this._meshShift[1];
                container.meshes[0].position.z =
                  container.meshes[0].position.z + this._meshShift[2];
              })
            );
          }
        }
      }

      // needed to force then synchronous
      // because we needed the model loaded
      // for clash detection on pointcloud load.
      await Promise.all(tasks);
      pcs.addPoints(numCoords, pcLoader);
      tasks.push(pcs.buildMeshAsync());
      await Promise.all(tasks);

      if (isTime || isClass) {
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI(
          'UI',
          true,
          scene
        );

        /**
         * Set up sliders
         */
        const panel = new StackPanel();
        panel.width = '220px';
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        advancedTexture.addControl(panel);

        const header = new TextBlock();
        header.height = '30px';
        header.color = textColor;

        const slider = new Slider('Slider');
        slider.minimum = 0;
        slider.step = 1;
        slider.height = '20px';
        slider.width = '200px';
        slider.color = accentColor;
        slider.background = secondColor;

        if (isTime) {
          header.text = 'Time: ' + (offset + times[0]).toFixed(0);

          slider.maximum = times.length - 1;
          slider.value = 0;
        }
        let slider_classes: number[];
        if (isClass) {
          header.text = classes.names[0];

          slider_classes = Array.from(new Set(classification));
          slider.maximum = slider_classes.length - 1;
          slider.value = 0;
        }

        panel.addControl(header);

        /**
         * Set up sliders
         */
        pcs.updateParticle = function (particle_3: any) {
          if (doClear) {
            particle_3.color = scene.clearColor;
            particle_3.position.y =
              (data.Z[particle_3.idx] - topoOffset) * scale - 100;
          } else {
            particle_3.color = new Color3(
              data.Red[particle_3.idx] / rgbMax,
              data.Green[particle_3.idx] / rgbMax,
              data.Blue[particle_3.idx] / rgbMax
            );
            particle_3.position.y =
              (data.Z[particle_3.idx] - topoOffset) * scale;
          }
          return particle_3;
        };

        /**
         * Update slider label when changed
         */
        slider.onValueChangedObservable.add((value: any) => {
          if (isTime) {
            header.text = 'Time: ' + (offset + times[value]).toFixed(0);

            if (value > pcs.counter) {
              doClear = false;
              pcs.setParticles(pcs.counter, value);
            } else {
              doClear = true;
              pcs.setParticles(value, pcs.counter);
            }
            pcs.counter = value;
          }
          if (isClass) {
            const v: number = classes.numbers.indexOf(slider_classes[value]);
            header.text = classes.names[v];

            const start_1: number = classification.indexOf(
              slider_classes[value]
            );
            const finish: number = classification.lastIndexOf(
              slider_classes[value]
            );

            doClear = true;
            pcs.setParticles(0, numCoords);

            doClear = false;
            pcs.setParticles(start_1, finish);
          }
        });

        panel.addControl(slider);
      }
      if (isTopo && this._mapboxImg) {
        const mapboxImg = this._mapboxImg as BlobPart;
        const blob_1 = new Blob([mapboxImg]);
        const url_1 = URL.createObjectURL(blob_1);

        const mat = new StandardMaterial('mat', scene);
        mat.diffuseTexture = new Texture(url_1, scene);
        mat.diffuseTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
        mat.diffuseTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
        mat.specularColor = new Color3(0, 0, 0);
        mat.backFaceCulling = false;

        const options = { xmin: xmin, zmin: ymin, xmax: xmax, zmax: ymax };
        const ground = MeshBuilder.CreateTiledGround(
          'tiled ground',
          options,
          scene
        );
        ground.material = mat;
      }

      /**
       * Create gizmos utility
       */
      main._utilLayer = new UtilityLayerRenderer(scene);

      /**
       * Handle mouse clicks to select/deselect meshes
       */
      scene.onPointerObservable.add(pointerInfo => {
        switch (pointerInfo.type) {
          case PointerEventTypes.POINTERDOWN:
            main._movedAfterClick = false;
            break;
          case PointerEventTypes.POINTERUP:
            if (!main._movedAfterClick) {
              main.pickMesh();
            }
            break;
          case PointerEventTypes.POINTERMOVE:
            main._movedAfterClick = true;
            break;
          case PointerEventTypes.POINTERWHEEL:
            break;
          case PointerEventTypes.POINTERPICK:
            break;
          case PointerEventTypes.POINTERTAP:
            break;
          case PointerEventTypes.POINTERDOUBLETAP:
            break;
        }
      });

      // handle key presses
      scene.onKeyboardObservable.add(kbInfo => {
        switch (kbInfo.type) {
          case KeyboardEventTypes.KEYDOWN:
            // toggle current camera
            if (kbInfo.event.key === 'c') {
              main._cameras[main._currCamera].detachControl();
              main._currCamera = (main._currCamera + 1) % main._cameras.length;
              main._cameras[main._currCamera].attachControl(true);
              const cam_name = main._cameras[main._currCamera].name;
              main._scene.setActiveCameraByName(cam_name);
            }

            // perform clash detection
            if (kbInfo.event.key === '=') {
              this._distanceColors = true;
              pcs = new PointsCloudSystem('pcs', pointSize, scene, {
                updatable: isClass || isTime
              });
              pcs.addPoints(numCoords, pcLoader);
              pcs.buildMeshAsync();
            }

            // perform clash detection
            if (kbInfo.event.key === '-') {
              this._distanceColors = false;
              pcs = new PointsCloudSystem('pcs', pointSize, scene, {
                updatable: isClass || isTime
              });
              pcs.addPoints(numCoords, pcLoader);
              pcs.buildMeshAsync();
            }

            // toggle selected objects wireframe
            if (kbInfo.event.key === 'r') {
              main.toggleSelectedWireframe();
            }

            // focus on selected objects
            if (kbInfo.event.key === 'f') {
              main.focusSelected();
            }

            // show info about selected objects
            if (kbInfo.event.key === 'i') {
              main.infoSelected();
            }

            if (kbInfo.event.key === 'Shift') {
              // shift
              main._shiftPressed = true;
            }

            break;
          case KeyboardEventTypes.KEYUP:
            if (kbInfo.event.key === 'Shift') {
              // shift
              main._shiftPressed = false;
            }
            break;
        }
      });

      /**
       * Set up camera and light
       */
      scene.createDefaultCameraOrLight(true, true, true);

      const light = new HemisphericLight('light1', new Vector3(0, 1, 0), scene);
      light.intensity = 0.8;

      const camera = scene.activeCamera as ArcRotateCamera;
      camera.alpha += Math.PI;
      camera.upperBetaLimit = Math.PI / 2;

      if (this.wheelPrecision > 0) {
        camera.wheelPrecision = this.wheelPrecision;
      }

      camera.setTarget(new Vector3(center_x, center_z, center_y));
      this._cameras.push(camera);

      /**
       * Add second camera
       */
      const camera2 = new FreeCamera(
        'free',
        new Vector3(center_x, center_z, center_y),
        scene
      );
      camera2.minZ = camera.minZ;
      camera2.maxZ = camera.maxZ;
      if (this.moveSpeed > 0) {
        camera2.speed = this.moveSpeed;
      } else {
        camera2.speed = 0.5;
      }
      camera2.keysUp.push(87); // W
      camera2.keysDown.push(83); // D
      camera2.keysLeft.push(65); // A
      camera2.keysRight.push(68); // S
      camera2.keysUpward.push(69); // E
      camera2.keysDownward.push(81); // Q
      this._cameras.push(camera2);

      return scene;
    });
  }

  /**
   * EXTRAS/ helpers
   */
  addAxes(mesh: Mesh): DragGizmos {
    const gizmo = new DragGizmos(mesh, this._utilLayer);
    return gizmo;
  }

  // Select a mesh
  select(mesh: Mesh, toggle: boolean): void {
    if (this._selected.includes(mesh)) {
      if (toggle) {
        this.unselect(mesh);
      }
      return;
    }

    this._selected.push(mesh);
    this._axes.push(this.addAxes(mesh));
  }

  // Unselect a mesh
  unselect(mesh: Mesh): void {
    const index = this._selected.findIndex(e => e === mesh);
    if (index === undefined) {
      return;
    }

    this._axes[index].dispose();
    this._axes.splice(index, 1);
    this._selected.splice(index, 1);
  }

  // Unselect all meshes
  unselectAll(): void {
    for (let i = 0; i < this._selected.length; i++) {
      this._axes[i].dispose();
    }

    this._selected = [];
    this._axes = [];
  }

  // Toggle wireframe on mesh
  toggleMeshWireframe(mesh: Mesh) {
    if (mesh.material) {
      mesh.material.wireframe = !mesh.material.wireframe;
    }

    const children = mesh.getChildMeshes();
    for (let c = 0; c < children.length; c++) {
      this.toggleMeshWireframe(children[c] as Mesh);
    }
  }

  // Toggle wireframe on selected meshes
  toggleSelectedWireframe(): void {
    for (let s = 0; s < this._selected.length; s++) {
      const mesh = this._selected[s] as Mesh;
      this.toggleMeshWireframe(mesh);
    }
  }

  // Focus camera into selected mesh
  focusSelected(): void {
    if (this._selected.length === 0) {
      return;
    }
    const center = new Vector3(0, 0, 0);
    for (let s = 0; s < this._selected.length; s++) {
      center.addInPlace(this._selected[s].position);
    }
    center.scaleInPlace(this._selected.length);
    (this._cameras[this._currCamera] as ArcRotateCamera).setTarget(center);
  }

  // Show info about selected mesh -- just position for now
  infoSelected(): void {
    if (this._selected.length === 0) {
      return;
    }
    for (let s = 0; s < this._selected.length; s++) {
      console.log(this._selected[s].name + ': ' + this._selected[s].position);
    }
  }

  // Pick a mesh
  pickMesh(): void {
    const pick = this._scene.pick(this._scene.pointerX, this._scene.pointerY);
    if (!pick || !pick.ray) {
      return;
    }

    const ray = new Ray(pick.ray.origin, pick.ray.direction, 100000);
    const hit = this._scene.pickWithRay(ray);

    if (hit && hit.pickedMesh) {
      let sel = hit.pickedMesh;
      while (sel.parent) {
        sel = sel.parent as Mesh;
      }
      if (!this._shiftPressed) {
        this.unselectAll();
      }
      this.select(sel as Mesh, true);
    } else {
      this.unselectAll();
    }
  }
}
