import {
  Scene,
  ArcRotateCamera,
  Vector3,
  UniformBuffer,
  Vector4,
  Frustum
} from '@babylonjs/core';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { Manager, TileStatus, TileState } from '../manager';
import { PointTile, PointUpdateOptions } from './point';
import {
  PointShape,
  colorScheme,
  DataRequest,
  RequestType,
  PointMessage,
  PointResponse,
  BaseResponse,
  PointInfoMessage,
  InfoResponse
} from '../../types';
import { hexToRgb } from '../../utils/helpers';
import { inv, MathArray, matrix, max, min, multiply } from 'mathjs';
import { PriorityQueue } from '../../../point-cloud/utils/priority-queue';
import {
  encodeMorton,
  Moctree,
  MoctreeBlock
} from '../../../point-cloud/octree';
import {
  ButtonProps,
  Events,
  GUIEvent,
  Commands,
  SliderProps,
  SelectProps
} from '@tiledb-inc/viz-components';
import {
  AddOctreeNodeOperation,
  IntersectOperation,
  PointCloudMetadata,
  InitializeOctreeOperation,
  OperationResult,
  IntersectionResult,
  Feature,
  FeatureType
} from '@tiledb-inc/viz-common';
import { PickingTool } from '../../utils/picking-tool';
import { constructOctree } from './utils';
import proj4 from 'proj4';

interface PointOptions {
  metadata: PointCloudMetadata;
  transformationCoefficients: number[];
  namespace: string;
  baseCRS?: string;
}

export class PointManager extends Manager<PointTile> {
  private pointOptions!: UniformBuffer;
  private metadata: PointCloudMetadata;
  private transformationCoefficients: number[];
  private activeFeature: Feature;
  private blockQueue: PriorityQueue;
  private octree: Moctree;
  private pointBudget: number;
  private screenSizeLimit: number;
  private namespace: string;
  private pickingTool: PickingTool;
  private baseCRS?: string;
  private styleOptions = {
    pointShape: PointShape.CIRCLE,
    pointSize: 4,
    pointOpacity: 1,
    color: new Vector4(1, 0, 0.498, 1),

    // This array is shared by reference so changing a value
    // should automatically update the uniform value
    colorScheme: Float32Array.from(
      colorScheme
        .map(x => [...Object.values(hexToRgb(x)!), 255])
        .flatMap(x => x)
        .map(x => x / 255)
    ),

    // This map is shared by reference and will be updated
    // automatically for all geometry tiles.
    // It is only used when the active attribute is changed
    groupState: new Map<string, Map<number, number>>()
  };

  constructor(
    scene: Scene,
    workerPool: WorkerPool,
    pickingTool: PickingTool,
    options: PointOptions
  ) {
    super(scene, workerPool, 0, 0, 0);

    this.nonce = 0;
    this.blockQueue = new PriorityQueue(100);
    this.metadata = options.metadata;
    this.transformationCoefficients = options.transformationCoefficients;
    this.activeFeature = this.metadata.features[0];
    this.initializeUniformBuffer();
    this.pointBudget = 100_000;
    this.screenSizeLimit = 10;
    this.namespace = options.namespace;
    this.baseCRS = options.baseCRS;
    this.pickingTool = pickingTool;

    // To be in accordance with the image layer the UP direction align with
    // the Y-axis and flips the Z direction. This means during block selection the camera should be flipped in the Z-direction.
    // TODO: Add the default rotations back to the 4D matrix
    const affineMatrix = matrix([
      [
        options.transformationCoefficients[1],
        0,
        0,
        options.transformationCoefficients[0]
      ],
      [
        0,
        options.transformationCoefficients[5],
        0,
        options.transformationCoefficients[3]
      ],
      [0, 0, options.transformationCoefficients[1], 0],
      [0, 0, 0, 1]
    ] as MathArray);

    let minPoint = [
      this.metadata.minPoint.x,
      this.metadata.minPoint.y,
      this.metadata.minPoint.z,
      1
    ];

    let maxPoint = [
      this.metadata.maxPoint.x,
      this.metadata.maxPoint.y,
      this.metadata.maxPoint.z,
      1
    ];

    if (
      options.baseCRS &&
      options.metadata.crs &&
      options.baseCRS !== options.metadata.crs
    ) {
      const converter = proj4(options.metadata.crs, options.baseCRS);

      minPoint = [...converter.forward(minPoint.slice(0, 3)), 1];
      maxPoint = [...converter.forward(maxPoint.slice(0, 3)), 1];
    }

    const affineInverted = inv(affineMatrix);

    const minPointTransformed = multiply(affineInverted, minPoint);
    const maxPointTransformed = multiply(affineInverted, maxPoint);

    // Type info is wrong since min and max when applied to 2D arrays with 0 as the selected dimension will return back an array
    [minPoint, maxPoint] = [
      matrix(
        min(
          [
            minPointTransformed.toArray(),
            maxPointTransformed.toArray()
          ] as number[][],
          0
        ) as any
      ).toArray() as number[],
      matrix(
        max(
          [
            minPointTransformed.toArray(),
            maxPointTransformed.toArray()
          ] as number[][],
          0
        ) as any
      ).toArray() as number[]
    ];

    this.octree = constructOctree(
      new Vector3(minPoint[0], minPoint[2], minPoint[1]),
      new Vector3(maxPoint[0], maxPoint[2], maxPoint[1]),
      options.metadata.minPoint,
      options.metadata.maxPoint,
      [
        options.transformationCoefficients[1],
        options.transformationCoefficients[5],
        options.transformationCoefficients[1]
      ],
      this.metadata.levels.length,
      this.metadata.octreeData
    );
    this.initializeUniformBuffer();
    this.setupEventListeners();
    this.workerPool.callbacks.point.push(this.onPointTileDataLoad.bind(this));
    this.workerPool.callbacks.cancel.push(this.onCancel.bind(this));

    if (this.metadata.idAttribute) {
      this.metadata.features.push({
        name: 'Picking ID',
        type: FeatureType.NON_RENDERABLE,
        attributes: [{ name: this.metadata.idAttribute.name }],
        interleaved: false
      });

      this.pickingTool.pickCallbacks.push(this.pickPoints.bind(this));
      this.workerPool.callbacks.pointOperation.push(
        this.onPointOperation.bind(this)
      );
      this.workerPool.callbacks.info.push(this.onPointInfo.bind(this));

      this.workerPool.postOperation({
        operation: 'INITIALIZE',
        id: this.metadata.groupID,
        minPoint: minPoint,
        maxPoint: maxPoint,
        maxDepth: this.metadata.levels.length,
        blocks: this.metadata.octreeData
      } as InitializeOctreeOperation);
    }
  }

  private onPointOperation(id: string, response: OperationResult) {
    if (!response.done || id !== this.metadata.groupID) {
      return;
    }

    switch (response.operation) {
      case 'INTERSECT':
        this.workerPool.postMessage({
          id: this.metadata.groupID,
          type: RequestType.POINT_INFO,
          request: {
            namespace: this.namespace,
            levels: (response as IntersectionResult).levelIncides.map(
              x => this.metadata.levels[x]
            ),
            geotransformCoefficients: this.transformationCoefficients,
            domain: this.metadata.domain,
            idAttribute: this.metadata.idAttribute?.name ?? '',
            ids: (response as IntersectionResult).ids,
            bbox: (response as IntersectionResult).bbox,
            nonce: this.nonce++
          } as PointInfoMessage
        } as DataRequest);
        break;
      default:
        break;
    }
  }

  private setupEventListeners() {
    window.addEventListener(
      Events.BUTTON_CLICK,
      this.buttonHandler.bind(this) as any,
      { capture: true }
    );
    window.addEventListener(
      Events.SELECT_INPUT_CHANGE,
      this.selectHandler.bind(this) as any,
      { capture: true }
    );
    window.addEventListener(
      Events.SLIDER_CHANGE,
      this.sliderHandler.bind(this) as any,
      { capture: true }
    );
    window.addEventListener(
      Events.COLOR_CHANGE,
      this.buttonHandler.bind(this) as any,
      { capture: true }
    );
  }

  private selectHandler(event: CustomEvent<GUIEvent<SelectProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.metadata.groupID) {
      return;
    }

    let updateOptions: PointUpdateOptions = { ...this.styleOptions };

    switch (target[1]) {
      case 'shape':
        this.styleOptions.pointShape = 2 ** event.detail.props.value;
        updateOptions = { ...this.styleOptions };
        break;
      case 'feature':
        this.activeFeature = this.metadata.features[event.detail.props.value];
        updateOptions.feature = this.activeFeature;
        break;
      default:
        return;
    }

    for (const [, status] of this.tileStatus) {
      if (status.state === TileState.VISIBLE) {
        status.tile?.update(updateOptions);
      }
    }
  }

  private sliderHandler(event: CustomEvent<GUIEvent<SliderProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.metadata.groupID) {
      return;
    }

    switch (target[1]) {
      case 'pointSize':
        this.pointOptions.updateFloat('pointSize', event.detail.props.value);
        this.pointOptions.update();
        break;
      case 'pointBudget':
        this.pointBudget = event.detail.props.value;
        break;
      case 'quality':
        this.screenSizeLimit = 51 - event.detail.props.value;
        break;
      case 'pointOpacity':
        this.pointOptions.updateFloat('pointOpacity', event.detail.props.value);
        this.pointOptions.update();
        break;
    }
  }

  private buttonHandler(event: CustomEvent<GUIEvent<ButtonProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.metadata.groupID) {
      return;
    }

    switch (event.detail.props.command) {
      case Commands.CLEAR:
        for (const [, status] of this.tileStatus) {
          if (status.state === TileState.VISIBLE) {
            status.tile?.updateSelection([]);
          }
        }
        break;
      case Commands.SELECT:
        for (const [, status] of this.tileStatus) {
          if (status.state === TileState.VISIBLE) {
            status.tile?.updatePicked(
              BigInt(event.detail.props.data?.id),
              BigInt(event.detail.props.data?.previousID ?? -1)
            );
          }
        }
        break;
      case Commands.COLOR:
        {
          if (target[1] === 'fillColor') {
            const color: { r: number; g: number; b: number } =
              event.detail.props.data;
            Vector4.FromFloatsToRef(
              color.r / 255,
              color.g / 255,
              color.b / 255,
              1,
              this.styleOptions.color
            );
            this.pointOptions.updateVector4('color', this.styleOptions.color);
          } else {
            const groupIndex = Number.parseInt(target[1]);
            const color: { r: number; g: number; b: number } =
              event.detail.props.data;

            this.styleOptions.colorScheme[4 * groupIndex] = color.r / 255;
            this.styleOptions.colorScheme[4 * groupIndex + 1] = color.g / 255;
            this.styleOptions.colorScheme[4 * groupIndex + 2] = color.b / 255;

            this.pointOptions.updateFloatArray(
              'colorScheme',
              this.styleOptions.colorScheme
            );
          }

          this.pointOptions.update();
        }
        break;
      case Commands.GROUP:
        {
          let state = this.styleOptions.groupState.get(this.activeFeature.name);
          if (!state) {
            state = new Map<number, number>();
            this.styleOptions.groupState.set(this.activeFeature.name, state);
          }
          state.set(
            event.detail.props.data.category,
            event.detail.props.data.group
          );

          for (const [, status] of this.tileStatus) {
            status.tile?.update({
              ...this.styleOptions,
              groupUpdate: {
                categoryIndex: event.detail.props.data.category,
                group: event.detail.props.data.group
              }
            });
          }
        }
        break;
      default:
        break;
    }
  }

  private onPointTileDataLoad(id: string, response: PointResponse) {
    if (response.canceled) {
      return;
    }

    const status =
      this.tileStatus.get(id) ??
      ({
        evict: false,
        state: TileState.VISIBLE
      } as TileStatus<PointTile>);

    if (!status || status.nonce !== response.nonce) {
      // Tile was removed from the tileset but canceling missed timing
      return;
    }

    if (this.metadata.idAttribute) {
      this.workerPool.postOperation({
        operation: 'ADD',
        id: this.metadata.groupID,
        mortonCode: response.index[0],
        data: response.attributes['position'],
        ids: response.attributes['Picking ID']
      } as AddOctreeNodeOperation);
    }

    if (status.tile) {
      status.tile.update({ response });
    } else {
      status.tile = new PointTile(this.scene, response);
      status.tile.update({
        ...this.styleOptions,
        pointOptions: this.pointOptions,
        feature: this.activeFeature
      });
    }

    status.state = TileState.VISIBLE;
    this.updateLoadingStatus(true);
  }

  public loadTiles(camera: ArcRotateCamera, zoom: number): void {
    for (const [, value] of this.tileStatus) {
      value.evict = true;
    }

    this.blockQueue.reset();

    const scoreMetric = (block: MoctreeBlock) =>
      this.orthographicScore(
        block,
        Math.max(
          (camera?.orthoTop ?? 0) - (camera?.orthoBottom ?? 0),
          (camera?.orthoRight ?? 0) - (camera?.orthoLeft ?? 0)
        )
      );
    const frustrum = Frustum.GetPlanes(camera.getTransformationMatrix());

    const root = this.octree.blocklist.get(
      encodeMorton(Vector3.ZeroReadOnly, 0)
    );

    if (!root) {
      return;
    }

    const rootScore = scoreMetric(root);
    this.blockQueue.insert(rootScore, root);

    let points = 0;
    let blocks = 0;

    while (
      !this.blockQueue.isEmpty() &&
      points < this.pointBudget &&
      blocks < 200
    ) {
      const block = this.blockQueue.extractMax().octreeBlock;

      if (!block) {
        break;
      }

      if (!block.boundingInfo.isInFrustum(frustrum)) {
        continue;
      }

      const tileIndex = `${this.metadata.name}_${block.mortonNumber}`;
      const status =
        this.tileStatus.get(tileIndex) ??
        ({ evict: false, nonce: 0 } as TileStatus<PointTile>);
      status.evict = false;

      if (status.state === undefined) {
        this.workerPool.postMessage({
          type: RequestType.POINT,
          id: tileIndex,
          request: {
            index: [block.mortonNumber],
            minPoint:
              block.nativeMinPoint?.asArray() ?? block.minPoint.asArray(),
            maxPoint:
              block.nativeMaxPoint?.asArray() ?? block.maxPoint.asArray(),
            namespace: this.namespace,
            arrayID: this.metadata.levels[block.lod],
            features: this.metadata.features,
            nonce: ++this.nonce,
            attributes: this.metadata.attributes,
            geotransformCoefficients: this.transformationCoefficients,
            domain: this.metadata.domain,
            imageCRS: this.baseCRS,
            pointCRS: this.metadata.crs
          } as PointMessage
        } as DataRequest);

        status.state = TileState.LOADING;
        status.nonce = this.nonce;
        this.tileStatus.set(tileIndex, status);

        this.updateLoadingStatus(false);
      }

      points += block.pointCount || 0;
      ++blocks;

      // Calculate children
      for (let i = 0; i < 8; ++i) {
        const code = (block.mortonNumber << 3) + i;

        if (!this.octree.blocklist.has(code)) {
          continue;
        }

        const child = this.octree.blocklist.get(code);
        if (child) {
          const childScore = scoreMetric(child);

          if (childScore < 51 - this.screenSizeLimit) {
            continue;
          }
          this.blockQueue.insert(childScore, child);
        }
      }
    }

    for (const key of this.tileStatus.keys()) {
      const status = this.tileStatus.get(key);
      if (!status?.evict) {
        continue;
      }

      if (status.state !== TileState.VISIBLE) {
        this.workerPool.cancelRequest({
          type: RequestType.CANCEL,
          id: key
        } as DataRequest);

        this.updateLoadingStatus(true);
      } else if (status.state === TileState.VISIBLE) {
        status.tile?.dispose();
      }

      this.tileStatus.delete(key);
    }
  }

  public pickPoints(
    bbox: number[],
    constraints?: {
      path?: number[];
      tiles?: number[][];
      enclosureMeshPositions?: Float32Array;
      enclosureMeshIndices?: Int32Array;
    }
  ) {
    this.workerPool.postOperation({
      operation: 'INTERSECT',
      id: this.metadata.groupID,
      positions: constraints?.enclosureMeshPositions,
      indices: constraints?.enclosureMeshIndices
    } as IntersectOperation);
  }

  private initializeUniformBuffer() {
    this.pointOptions = new UniformBuffer(this.scene.getEngine());

    this.pointOptions.addUniform('pointSize', 1, 0);
    this.pointOptions.addUniform('color', 4, 0);
    this.pointOptions.addUniform('colorScheme', 4, 32);
    this.pointOptions.addUniform('pointOpacity', 1, 0);

    this.pointOptions.updateFloat('pointSize', this.styleOptions.pointSize);
    this.pointOptions.updateVector4('color', this.styleOptions.color);
    this.pointOptions.updateFloatArray(
      'colorScheme',
      this.styleOptions.colorScheme
    );
    this.pointOptions.updateFloat(
      'pointOpacity',
      this.styleOptions.pointOpacity
    );

    this.pointOptions.update();
  }

  private orthographicScore(
    block: MoctreeBlock,
    viewportRadius: number
  ): number {
    return (
      (block.boundingInfo.boundingSphere.radiusWorld / viewportRadius) * 100
    );
  }

  private onCancel(id: string, response: BaseResponse) {
    const tile = this.tileStatus.get(id);
    if (
      tile &&
      tile.state === TileState.LOADING &&
      tile.nonce === response.nonce
    ) {
      console.warn(`Tile '${id}' aborted unexpectedly. Retrying...`);

      const index = id
        .split('_')
        .map(x => parseInt(x))
        .filter(x => !Number.isNaN(x));

      const block = this.octree.blocklist.get(index[0]);

      this.workerPool.postMessage({
        type: RequestType.POINT,
        id: id,
        request: {
          index: index,
          minPoint: block!.minPoint.asArray(),
          maxPoint: block!.maxPoint.asArray(),
          namespace: this.namespace,
          arrayID: this.metadata.levels[block!.lod],
          features: this.metadata.features,
          nonce: ++this.nonce,
          attributes: this.metadata.attributes,
          geotransformCoefficients: this.transformationCoefficients,
          imageCRS: this.baseCRS,
          pointCRS: this.metadata.crs,
          domain: this.metadata.domain
        } as PointMessage
      } as DataRequest);
    }
  }

  private onPointInfo(id: string, response: InfoResponse) {
    if (id !== this.metadata.groupID) {
      return;
    }

    for (const [, status] of this.tileStatus) {
      if (status.state === TileState.VISIBLE) {
        status.tile?.updateSelection(response.ids);
      }
    }

    window.dispatchEvent(
      new CustomEvent<GUIEvent>(Events.PICK_OBJECT, {
        bubbles: true,
        detail: {
          target: `geometry_info_${this.metadata.groupID}`,
          props: response.info
        }
      })
    );
  }
}
