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
  Axis,
  Camera,
  int,
  Mesh,
  Ray,
  UtilityLayerRenderer,
  FreeCamera,
  KeyboardEventTypes,
  PointerEventTypes,
  HemisphericLight
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Control,
  StackPanel,
  Slider,
  TextBlock
} from 'babylonjs-gui';
import { TileDBVisualization, TileDBVisualizationBaseOptions } from '../base';
import { DragGizmos } from '../utils/drag_gizmos';
import { getPointCloud, setPointCloudSwitches, setSceneColors } from './utils';

export interface TileDBPointCloudOptions
  extends TileDBVisualizationBaseOptions {
  /**
   * Optional modes
   * time: add an interactive time slider 
   * classes: add an interactive classes slider
   * topo: add a mapbox base layer
   * gltf: add gltf meshes
   */
  mode: 'time' | 'classes' | 'topo' | 'gltf';
  /**
   * Color scheme
   */
  color_scheme: string;
  /**
   * Data to render [all modes]
   */
  data: any;
  /**
   * Binary blob of a gltf mesh or an array of gltf meshes [mode='gltf']
   */
  gltf_data: any;
  /**
   * Move the point cloud along the z-axis to better align with the mapbox base layer [mode='topo']
   */
  topo_offset: number;
  /**
   * Lookup table with the index and names of all classes [mode='classes']
   */
  classes: { names: string[]; numbers: number[] };
  /**
   * Time offset
   */
  time_offset: number;
  /**
   * Size of the points
   */
  point_size: number;
  /**
   * Perform clash detection between mesh and point cloud if true
   */
  distance_colors?: boolean;
  /**
   * Blob mpabox image png image as blob
   */
  mapbox_img: BlobPart;
  /**
   * Rotate the mesh with [alpha,beta,gamma]
   */
  mesh_rotation: number[];
  /**
   * Shift the mesh with [x,y,z]
   */
  mesh_shift: number[];
  /**
   * Scale the size [x,y,z] of the mesh
   */
  mesh_scale: number[];
  /**
   * gltf_data is an array with blobs when true
   */
  gltf_multi: boolean;
  /**
   * The extends (min/max) of each mbrs
   */
  extents: number[];
  /**
   * The min and max values of x and y
   */
  xy_bbox: number[];
}

/**
* 
*/
export class TileDBPointCloudVisualization extends TileDBVisualization {
  private _scene!: Scene;
  private _util_layer!: UtilityLayerRenderer;
  private _moved_after_click = false;
  private _shift_pressed = false;
  private _selected: Array<Mesh> = new Array<Mesh>();
  private _axes: Array<DragGizmos> = new Array<DragGizmos>();
  private _cameras: Array<Camera> = new Array<Camera>();
  private _curr_camera: int = 0;
  private _mode: TileDBPointCloudOptions['mode'];
  private _color_scheme: TileDBPointCloudOptions['color_scheme'];

  constructor(options: TileDBPointCloudOptions) {
    super(options);
    this._mode = options.mode;
    this._color_scheme = options.color_scheme;
  }

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(async scene => {
      const main = this;
      this._scene = scene;

      const { isTime, isClass, isTopo, isGltf } = setPointCloudSwitches(
        this._mode
      );

      /**
       * Load color scheme colors 
       */  
      const { backgroundColor, accentColor, secondColor, textColor } =
        setSceneColors(this._color_scheme);

      /**
       * Load point cloud data 
       */  
      const { data, xmin, xmax, ymin, ymax, zmin, zmax, rgbMax } =
        await getPointCloud(this._values).then(results => {
          return results;
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

      const gltfData = this._values.gltf_data;
      const pointSize = this._values.point_size;
      const offset = this._values.time_offset;
      const classes = this._values.classes;
      const topo_offset = this._values.topo_offset;
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
      const distance_colors = this._values.distance_colors;

      const pcLoader = (particle: any, i: number, _: string) => {
        // Y is up
        particle.position = new Vector3(
          data.X[i],
          (data.Z[i] - topo_offset) * scale,
          data.Y[i]
        );
        if (isTime) {
          particle.color = scene.clearColor;
          particle.position.y = (data.Z[i] - topo_offset) * scale - 100;
        } else {
          particle.color = new Color3(
            data.Red[i] / rgbMax,
            data.Green[i] / rgbMax,
            data.Blue[i] / rgbMax
          );
        }

        if (distance_colors) {
          // check if inside meshes
          let minDist = 999999999999;
          particle.color.set(0, 1, 0, 1);

          for (let i = 0; i < scene.meshes.length; i++) {
            const mesh = scene.meshes[i] as Mesh;
            const bounds = scene.meshes[i].getHierarchyBoundingVectors(true);
            if (main.pointIsInsideMesh(mesh, bounds, particle.position)) {
              particle.color.set(1, 0, 0, 1);
              minDist = 1;
            } else {
              // find minimum distance
              const dist = Math.max(
                1,
                particle.position
                  .subtract(scene.meshes[i].position)
                  .lengthSquared() * 0.0004
              );
              if (dist < minDist) {
                minDist = dist;
              }
            }
          }
        }
      };

      const tasks: Promise<any>[] = [];

      if (isGltf) {
        if (this._values.gltf_multi === false) {
          const blob = new Blob([gltfData]);
          const url = URL.createObjectURL(blob);

          tasks.push(
            SceneLoader.ImportMeshAsync('', url, '', scene, null, '.gltf').then(
              container => {
                container.meshes[0].rotation = new Vector3(
                  this._values.mesh_rotation[0],
                  this._values.mesh_rotation[1],
                  this._values.mesh_rotation[2]
                );
                container.meshes[0].scaling = new Vector3(
                  this._values.mesh_scale[0],
                  this._values.mesh_scale[1],
                  this._values.mesh_scale[2]
                );
                container.meshes[0].position.x =
                  container.meshes[0].position.x + this._values.mesh_shift[0];
                container.meshes[0].position.y =
                  container.meshes[0].position.y + this._values.mesh_shift[1];
                container.meshes[0].position.z =
                  container.meshes[0].position.z + this._values.mesh_shift[2];
              }
            )
          );
        } else if (this._values.gltf_multi === true) {
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
                  this._values.mesh_rotation[0],
                  this._values.mesh_rotation[1],
                  this._values.mesh_rotation[2]
                );
                container.meshes[0].scaling = new Vector3(
                  this._values.mesh_scale[0],
                  this._values.mesh_scale[1],
                  this._values.mesh_scale[2]
                );
                container.meshes[0].position.x =
                  container.meshes[0].position.x + this._values.mesh_shift[0];
                container.meshes[0].position.y =
                  container.meshes[0].position.y + this._values.mesh_shift[1];
                container.meshes[0].position.z =
                  container.meshes[0].position.z + this._values.mesh_shift[2];
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
              (data.Z[particle_3.idx] - topo_offset) * scale - 100;
          } else {
            particle_3.color = new Color3(
              data.Red[particle_3.idx] / rgbMax,
              data.Green[particle_3.idx] / rgbMax,
              data.Blue[particle_3.idx] / rgbMax
            );
            particle_3.position.y =
              (data.Z[particle_3.idx] - topo_offset) * scale;
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
       
      if (isTopo) {
        /**
         * Display a mapbox map as an image on TiledGround
         */ 
        const mapbox_img = this._values.mapbox_img;
        const blob_1 = new Blob([mapbox_img]);
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
      main._util_layer = new UtilityLayerRenderer(scene);

      /**
       * Handle mouse clicks to select/deselect meshes
       */  
      scene.onPointerObservable.add(pointerInfo => {
        switch (pointerInfo.type) {
          case PointerEventTypes.POINTERDOWN:
            main._moved_after_click = false;
            break;
          case PointerEventTypes.POINTERUP:
            if (!main._moved_after_click) {
              main.pickMesh();
            }
            break;
          case PointerEventTypes.POINTERMOVE:
            main._moved_after_click = true;
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
              main._cameras[main._curr_camera].detachControl();
              main._curr_camera =
                (main._curr_camera + 1) % main._cameras.length;
              main._cameras[main._curr_camera].attachControl(true);
              const cam_name = main._cameras[main._curr_camera].name;
              main._scene.setActiveCameraByName(cam_name);
            }

            // perform clash detection
            if (kbInfo.event.key === '=') {
              this._values.distance_colors = true;
              pcs = new PointsCloudSystem('pcs', pointSize, scene, {
                updatable: isClass || isTime
              });
              pcs.addPoints(numCoords, pcLoader);
              pcs.buildMeshAsync();
            }

            // perform clash detection
            if (kbInfo.event.key === '-') {
              this._values.distance_colors = false;
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
              main._shift_pressed = true;
            }

            break;
          case KeyboardEventTypes.KEYUP:
            if (kbInfo.event.key === 'Shift') {
              // shift
              main._shift_pressed = false;
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
    const gizmo = new DragGizmos(mesh, this._util_layer);
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
    (this._cameras[this._curr_camera] as ArcRotateCamera).setTarget(center);
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
      if (!this._shift_pressed) {
        this.unselectAll();
      }
      this.select(sel as Mesh, true);
    } else {
      this.unselectAll();
    }
  }

  pointIsInsideMesh(
    mesh: Mesh,
    boundInfo: { min: Vector3; max: Vector3 },
    point: Vector3
  ): boolean {
    const max = boundInfo.max.add(mesh.position);
    const min = boundInfo.min.add(mesh.position);
    const diameter = max.subtract(min).length() * 2;

    if (point.x < min.x || point.x > max.x) {
      return false;
    }

    if (point.y < min.y || point.y > max.y) {
      return false;
    }

    if (point.z < min.z || point.z > max.z) {
      return false;
    }

    const directions: Vector3[] = [
      new Vector3(0, 1, 0),
      //new Vector3(0, -1, 0),
      new Vector3(-0.89, 0.45, 0),
      new Vector3(0.89, 0.45, 0)
    ];

    const ray = new Ray(point, Axis.X, diameter);

    for (let c = 0; c < directions.length; c++) {
      ray.direction = directions[c];
      if (!ray.intersectsMesh(mesh).hit) {
        return false;
      }
    }

    return true;
  }
}
