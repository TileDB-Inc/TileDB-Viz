import {
  Scene,
  Observer,
  Nullable,
  KeyboardInfo,
  KeyboardEventTypes,
  PointerInfo,
  PointerEventTypes,
  UtilityLayerRenderer,
  Mesh,
  VertexData,
  EventState,
  VertexBuffer
} from '@babylonjs/core';
import { ScreenSpaceLineMaterial } from '../materials/screenSpaceLineMaterial';
import { getCamera } from './camera-utils';

enum PickingMode {
  NONE = 0,
  SINGLE = 1,
  LASSO = 3
}

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
      constraints?: { path?: number[]; tiles?: number[][] }
    ): void;
  }[];

  private mode: PickingMode;
  private scene: Scene;
  private utilityLayer: UtilityLayerRenderer;

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

  constructor(scene: Scene) {
    this.mode = PickingMode.NONE;
    this.scene = scene;
    this.utilityLayer = new UtilityLayerRenderer(this.scene, false);
    this.utilityLayer.setRenderCamera(getCamera(this.scene, 'Main')!);
    this.selectionRenderVertexData = new VertexData();
    this.selectionRenderMesh = new Mesh(
      'selection',
      this.utilityLayer.utilityLayerScene
    );
    this.selectionRenderMesh.alwaysSelectAsActiveMesh = true;
    this.selectionRenderMesh.material = ScreenSpaceLineMaterial(
      this.utilityLayer.utilityLayerScene
    );
    this.pickCallbacks = [];

    this.singleHandler = null;
    this.lassoHandler = null;

    this.selectionBuffer = [];
    this.selectionRenderPositions = [];
    this.selectionRenderIndices = [];
    this.selectionBbox = [];
    this.selectedTiles = new Set<string>();
    this.active = false;

    this.scene.onKeyboardObservable.add((keyboardInfo: KeyboardInfo) => {
      switch (keyboardInfo.type) {
        case KeyboardEventTypes.KEYUP:
          if (!keyboardInfo.event.shiftKey) {
            break;
          }

          if (
            keyboardInfo.event.code === 'Digit1' &&
            this.mode !== PickingMode.SINGLE
          ) {
            this.mode = PickingMode.SINGLE;

            this.scene.onPointerObservable.remove(this.lassoHandler);

            this.singleHandler = this.scene.onPointerObservable.add(
              this.singlePicker.bind(this),
              undefined,
              true
            );
          } else if (
            keyboardInfo.event.code === 'Digit3' &&
            this.mode !== PickingMode.LASSO
          ) {
            this.mode = PickingMode.LASSO;

            this.scene.onPointerObservable.remove(this.singleHandler);

            this.lassoHandler = this.scene.onPointerObservable.add(
              this.lassoPicker.bind(this),
              undefined,
              true
            );
          } else if (keyboardInfo.event.code === 'Digit0') {
            this.mode = PickingMode.NONE;

            this.scene.onPointerObservable.remove(this.singleHandler);
            this.scene.onPointerObservable.remove(this.lassoHandler);
          }
          break;
      }
    });
  }

  private singlePicker(pointerInfo: PointerInfo, state: EventState): void {
    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERTAP: {
        const [x, y] = [
          pointerInfo.event.offsetX,
          this.scene.getEngine().getRenderHeight() - pointerInfo.event.offsetY
        ];

        this.selectionBbox = [
          Number.MAX_VALUE,
          Number.MAX_VALUE,
          -Number.MAX_VALUE,
          -Number.MAX_VALUE
        ];

        this.selectionBbox[0] = Math.min(this.selectionBbox[0], Math.round(x));
        this.selectionBbox[1] = Math.min(this.selectionBbox[1], Math.round(y));
        this.selectionBbox[2] = Math.max(this.selectionBbox[2], Math.round(x));
        this.selectionBbox[3] = Math.max(this.selectionBbox[3], Math.round(y));

        const tile = pointerInfo.pickInfo?.pickedMesh?.name
          .split(',')
          .map(x => Number.parseInt(x));

        this.pickCallbacks.forEach(callback =>
          callback(this.selectionBbox, { tiles: tile ? [tile] : undefined })
        );

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
        this.pickCallbacks.forEach(callback =>
          callback(this.selectionBbox, { path: this.selectionBuffer })
        );
        this.selectionRenderMesh.removeVerticesData(VertexBuffer.PositionKind);
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
          ) > 6
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
          this.selectionRenderIndices.push(
            this.selectionRenderPositions.length / 3
          );
          this.selectionRenderPositions.push(x, y, 0);

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
        }
        break;
      }
    }
  }

  public dispose() {
    this.scene.onPointerObservable.remove(this.singleHandler);
    this.scene.onPointerObservable.remove(this.lassoHandler);
  }
}
