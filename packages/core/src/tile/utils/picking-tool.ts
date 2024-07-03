import {
  Scene,
  Observer,
  Nullable,
  PointerInfo,
  PointerEventTypes,
  UtilityLayerRenderer,
  Mesh,
  VertexData,
  EventState,
  VertexBuffer,
  Camera,
  Matrix
} from '@babylonjs/core';
import {
  ScreenSpaceLineMaterial,
  ScreenSpaceLineMaterialWebGPU
} from '../materials/screenSpaceLineMaterial';
import { getCamera } from './camera-utils';
import {
  ButtonProps,
  Commands,
  Events,
  GUIEvent
} from '@tiledb-inc/viz-components';
import { PickingMode } from '@tiledb-inc/viz-common';
import { Manager } from '../model/manager';
import { Tile } from '../model/tile';
import { TileContent } from '../model/tileContent';

export function screenToWorldSpaceBbox(scene: Scene, bbox: number[]) {
  // calculate world space bbox to use for geometry query
  const camera = getCamera(scene, 'Main');

  const screenBbox = [
    scene.getEngine().getRenderWidth(),
    scene.getEngine().getRenderHeight()
  ];
  const offset = [
    (camera?.target.x ?? 0) + (camera?.orthoLeft ?? 0),
    -(camera?.target.z ?? 0) + (camera?.orthoTop ?? 0)
  ];
  const worldBbox = [
    (camera?.orthoRight ?? 0) - (camera?.orthoLeft ?? 0),
    (camera?.orthoTop ?? 0) - (camera?.orthoBottom ?? 0)
  ];

  const selectionWorldBbox = new Array(4);
  [selectionWorldBbox[0], selectionWorldBbox[2]] = [
    offset[0] + (bbox[0] / screenBbox[0]) * worldBbox[0],
    offset[0] + (bbox[2] / screenBbox[0]) * worldBbox[0]
  ];
  [selectionWorldBbox[1], selectionWorldBbox[3]] = [
    offset[1] - (bbox[1] / screenBbox[1]) * worldBbox[1],
    offset[1] - (bbox[3] / screenBbox[1]) * worldBbox[1]
  ];

  return selectionWorldBbox;
}

export class PickingTool {
  public pickCallbacks: {
    (
      bbox: number[],
      constraints?: {
        path?: number[];
        tiles?: number[][];
        enclosureMeshPositions?: Float32Array;
        enclosureMeshIndices?: Int32Array;
      }
    ): void;
  }[];

  private mode: PickingMode;
  private scene: Scene;
  private utilityLayer: UtilityLayerRenderer;
  private camera: Camera;

  private selectionBbox: number[];
  private selectionBuffer: number[];

  private lassoHandler: Nullable<Observer<PointerInfo>>;
  private singleHandler: Nullable<Observer<PointerInfo>>;

  private selectionRenderPositions: number[];
  private selectionRenderIndices: number[];
  private selectionRenderMesh: Mesh;
  private selectionRenderVertexData: VertexData;
  private selectedTiles: Set<string>;

  private active: boolean;
  public managers: Manager<Tile<TileContent>>[] = [];

  constructor(scene: Scene) {
    this.camera = getCamera(scene, 'Main')!;
    this.mode = PickingMode.NONE;
    this.scene = scene;
    this.utilityLayer = new UtilityLayerRenderer(this.scene, false);
    this.utilityLayer.setRenderCamera(this.camera);
    this.selectionRenderVertexData = new VertexData();
    this.selectionRenderMesh = new Mesh(
      'selection',
      this.utilityLayer.utilityLayerScene
    );
    this.selectionRenderMesh.alwaysSelectAsActiveMesh = true;
    this.selectionRenderMesh.material = scene.getEngine().isWebGPU
      ? ScreenSpaceLineMaterialWebGPU(this.utilityLayer.utilityLayerScene)
      : ScreenSpaceLineMaterial(this.utilityLayer.utilityLayerScene);
    this.pickCallbacks = [];

    this.singleHandler = null;
    this.lassoHandler = null;

    this.selectionBuffer = [];
    this.selectionRenderPositions = [];
    this.selectionRenderIndices = [];
    this.selectionBbox = [];
    this.selectedTiles = new Set<string>();
    this.active = false;

    window.addEventListener(
      Events.BUTTON_CLICK,
      this.buttonHandler.bind(this) as any,
      {
        capture: true
      }
    );
  }

  private buttonHandler(event: CustomEvent<GUIEvent<ButtonProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== 'picking-tool') {
      return;
    }

    switch (event.detail.props.command) {
      case Commands.PICKING_TOOL_SELECT:
        this.mode = event.detail.props.data as PickingMode;
        if (this.mode === PickingMode.SINGLE) {
          this.scene.onPointerObservable.remove(this.lassoHandler);
          this.singleHandler = this.scene.onPointerObservable.add(
            this.singlePicker.bind(this),
            undefined,
            true
          );
        } else if (this.mode === PickingMode.LASSO) {
          this.scene.onPointerObservable.remove(this.singleHandler);
          this.lassoHandler = this.scene.onPointerObservable.add(
            this.lassoPicker.bind(this),
            undefined,
            true
          );
        } else {
          this.scene.onPointerObservable.remove(this.singleHandler);
          this.scene.onPointerObservable.remove(this.lassoHandler);
        }
        break;
    }
  }

  private singlePicker(pointerInfo: PointerInfo, state: EventState): void {
    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERTAP: {
        const pickingRay = this.scene.createPickingRay(
          this.scene.pointerX,
          this.scene.pointerY,
          Matrix.Identity(),
          this.camera
        );

        const tiles = [];

        // Find intersecting tiles
        for (const manager of this.managers) {
          for (const tile of manager.tiles.values()) {
            if (pickingRay.intersectsBox(tile.boundingInfo.boundingBox)) {
              tiles.push(tile);

              console.log(tile.id);

              if (tile.data?.intersector) {
                tile.data.intersector.intersect(pickingRay);
              } else {
                console.log(
                  pickingRay.intersectsMeshes(tile.data?.meshes ?? [])
                );
              }
            }
          }
        }

        // this.selectionBbox = [
        //   Number.MAX_VALUE,
        //   Number.MAX_VALUE,
        //   -Number.MAX_VALUE,
        //   -Number.MAX_VALUE
        // ];

        // this.selectionBbox[0] = Math.min(this.selectionBbox[0], Math.round(x));
        // this.selectionBbox[1] = Math.min(this.selectionBbox[1], Math.round(y));
        // this.selectionBbox[2] = Math.max(this.selectionBbox[2], Math.round(x));
        // this.selectionBbox[3] = Math.max(this.selectionBbox[3], Math.round(y));

        // const tile = pointerInfo.pickInfo?.pickedMesh?.name
        //   .split(',')
        //   .map(x => Number.parseInt(x));

        // this.pickCallbacks.forEach(callback =>
        //   callback(this.selectionBbox, { tiles: tile ? [tile] : undefined })
        // );

        break;
      }
    }
  }

  private lassoPicker(pointerInfo: PointerInfo, state: EventState): void {
    state.skipNextObservers = true;

    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERDOWN: {
        this.active = true;
        this.selectionBbox = [
          Number.MAX_VALUE,
          Number.MAX_VALUE,
          -Number.MAX_VALUE,
          -Number.MAX_VALUE
        ];
        this.selectionBuffer = [];
        this.selectionRenderPositions = [];
        this.selectionRenderIndices = [];
        this.selectedTiles.clear();
        this.selectionRenderMesh.removeVerticesData(VertexBuffer.PositionKind);
        break;
      }
      case PointerEventTypes.POINTERUP: {
        this.active = false;

        if (this.selectionBuffer.length < 4) {
          this.selectionRenderMesh.removeVerticesData(
            VertexBuffer.PositionKind
          );
          break;
        }

        const vertexCount = this.selectionBuffer.length / 2;

        // 3D shape extrusion
        // We need 3 number per vertex and we will double the vertices το create the other side
        const position = new Float32Array(6 * vertexCount);
        const indices = new Int32Array(6 * vertexCount);

        for (let idx = 0; idx < vertexCount; ++idx) {
          const ray = this.scene.createPickingRay(
            this.selectionBuffer[2 * idx],
            this.scene.getEngine().getRenderHeight() -
              this.selectionBuffer[2 * idx + 1],
            Matrix.Identity(),
            this.camera
          );

          position[3 * idx] = ray.origin.x;
          position[3 * idx + 1] = ray.origin.y;
          position[3 * idx + 2] = ray.origin.z;

          ray.origin.addInPlace(
            ray.direction.multiplyByFloats(5000, 5000, 5000)
          );

          position[3 * idx + 3 * vertexCount] = ray.origin.x;
          position[3 * idx + 1 + 3 * vertexCount] = ray.origin.y;
          position[3 * idx + 2 + 3 * vertexCount] = ray.origin.z;

          // Face A
          indices[6 * idx] = idx;
          indices[6 * idx + 1] = idx + vertexCount;
          indices[6 * idx + 2] = (idx + 1) % vertexCount;

          // Face B
          indices[6 * idx + 3] = (idx + 1) % vertexCount;
          indices[6 * idx + 4] = idx + vertexCount;
          indices[6 * idx + 5] = ((idx + 1) % vertexCount) + vertexCount;
        }

        const mesh = new Mesh('Selection mesh', this.scene);
        const vertexData = new VertexData();
        vertexData.positions = position;
        vertexData.indices = indices;

        vertexData.applyToMesh(mesh);
        mesh.visibility = 0;

        // this.pickCallbacks.forEach(callback =>
        //   callback(this.selectionBbox, {
        //     path: this.selectionBuffer,
        //     enclosureMeshPositions: mesh.getVerticesData(
        //       VertexBuffer.PositionKind,
        //       true,
        //       true
        //     ) as Float32Array,
        //     enclosureMeshIndices: mesh.getIndices(true, true) as Int32Array
        //   })
        // );
        // this.selectionRenderMesh.removeVerticesData(VertexBuffer.PositionKind);

        break;
      }
      case PointerEventTypes.POINTERMOVE: {
        if (!this.active) {
          break;
        }

        const [x, y] = [
          pointerInfo.event.offsetX,
          this.scene.getEngine().getRenderHeight() - pointerInfo.event.offsetY
        ];

        const index = this.selectionBuffer.length;

        if (
          index === 0 ||
          Math.abs(
            (x - this.selectionBuffer[index - 2]) *
              (y - this.selectionBuffer[index - 1])
          ) > 12
        ) {
          this.selectionBuffer.push(x, y);

          this.selectionBbox[0] = Math.min(
            this.selectionBbox[0],
            Math.round(x)
          );
          this.selectionBbox[1] = Math.min(
            this.selectionBbox[1],
            Math.round(y)
          );
          this.selectionBbox[2] = Math.max(
            this.selectionBbox[2],
            Math.round(x)
          );
          this.selectionBbox[3] = Math.max(
            this.selectionBbox[3],
            Math.round(y)
          );

          // Lasso rendering
          // To ensure compatibility with WebGPU we nned to close the line loop manually
          // and then remove the loop close elements after setting the vertex buffers

          this.selectionRenderIndices.push(
            this.selectionRenderPositions.length / 3
          );
          this.selectionRenderPositions.push(x, y, 0);

          this.selectionRenderIndices.push(
            this.selectionRenderPositions.length / 3
          );
          this.selectionRenderPositions.push(
            this.selectionRenderPositions[0],
            this.selectionRenderPositions[1],
            0
          );

          this.selectionRenderVertexData.positions = Float32Array.from(
            this.selectionRenderPositions
          );
          this.selectionRenderVertexData.indices = Int32Array.from(
            this.selectionRenderIndices
          );

          this.selectionRenderVertexData.applyToMesh(
            this.selectionRenderMesh,
            false
          );

          this.selectionRenderIndices.pop();
          this.selectionRenderPositions.pop();
          this.selectionRenderPositions.pop();
          this.selectionRenderPositions.pop();
        }
        break;
      }
    }
  }

  public dispose() {
    window.removeEventListener(
      Events.BUTTON_CLICK,
      this.buttonHandler.bind(this) as any,
      {
        capture: true
      }
    );

    this.scene.onPointerObservable.remove(this.singleHandler);
    this.scene.onPointerObservable.remove(this.lassoHandler);
  }
}
