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
import { Feature, PointCloudMetadata } from '../../../types';
import { PointTile, PointUpdateOptions } from './point';
import {
  PointShape,
  colorScheme,
  DataRequest,
  RequestType,
  PointMessage,
  PointResponse,
  BaseResponse
} from '../../types';
import { hexToRgb } from '../../utils/helpers';
import {
  inv,
  MathArray,
  MathNumericType,
  matrix,
  max,
  min,
  multiply
} from 'mathjs';
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

interface PointOptions {
  metadata: PointCloudMetadata;
  transformationCoefficients: number[];
  namespace: string;
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
  private styleOptions = {
    pointShape: PointShape.CIRCLE,
    pointSize: 4,
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

  constructor(scene: Scene, workerPool: WorkerPool, options: PointOptions) {
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

    // To be in accordance with the image layer the UP direction align with
    // the Y-axis and flips the Z direction. This means during block selection the camera should be flipped in the Z-direction.

    const affineMatrix = matrix([
      [
        options.transformationCoefficients[1],
        options.transformationCoefficients[2],
        options.transformationCoefficients[0]
      ],
      [
        options.transformationCoefficients[4],
        options.transformationCoefficients[5],
        options.transformationCoefficients[3]
      ],
      [0, 0, options.transformationCoefficients[1]]
    ] as MathArray);

    const affineInverted = inv(affineMatrix);
    const minPoint = multiply(affineInverted, [
      this.metadata.minPoint.x,
      this.metadata.minPoint.y,
      this.metadata.minPoint.z
    ]).toArray() as number[];

    const maxPoint = multiply(affineInverted, [
      this.metadata.maxPoint.x,
      this.metadata.maxPoint.y,
      this.metadata.maxPoint.z
    ]).toArray() as number[];

    this.octree = new Moctree(
      new Vector3(minPoint[0], minPoint[2], minPoint[1]),
      new Vector3(maxPoint[0], maxPoint[2], maxPoint[1]),
      this.metadata.levels.length
    );

    this.initializeOctree(this.metadata.octreeData);
    this.initializeUniformBuffer();
    this.setupEventListeners();
    this.workerPool.callbacks.point.push(this.onPointTileDataLoad.bind(this));
    this.workerPool.callbacks.cancel.push(this.onCancel.bind(this));
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
        this.screenSizeLimit = event.detail.props.value;
        break;
    }
  }

  private buttonHandler(event: CustomEvent<GUIEvent<ButtonProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.metadata.groupID) {
      return;
    }

    switch (event.detail.props.command) {
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
    const blocks = 0;

    while (
      !this.blockQueue.isEmpty() &&
      points < this.pointBudget &&
      blocks < 400
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
            minPoint: block.minPoint.asArray(),
            maxPoint: block.maxPoint.asArray(),
            namespace: this.namespace,
            arrayID: this.metadata.levels[block.lod],
            features: this.metadata.features,
            nonce: ++this.nonce,
            attributes: this.metadata.attributes,
            geotransformCoefficients: this.transformationCoefficients,
            domain: this.metadata.domain
          } as PointMessage
        } as DataRequest);

        status.state = TileState.LOADING;
        status.nonce = this.nonce;
        this.tileStatus.set(tileIndex, status);

        this.updateLoadingStatus(false);
      }

      points += block.pointCount || 0;

      // Calculate children
      for (let i = 0; i < 8; ++i) {
        const code = (block.mortonNumber << 3) + i;

        if (!this.octree.blocklist.has(code)) {
          continue;
        }

        const child = this.octree.blocklist.get(code);
        if (child) {
          const childScore = scoreMetric(child);

          if (childScore < this.screenSizeLimit) {
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

  private initializeUniformBuffer() {
    this.pointOptions = new UniformBuffer(this.scene.getEngine());

    this.pointOptions.addUniform('pointSize', 1, 0);
    this.pointOptions.addUniform('color', 4, 0);
    this.pointOptions.addUniform('colorScheme', 4, 32);

    this.pointOptions.updateFloat('pointSize', this.styleOptions.pointSize);
    this.pointOptions.updateVector4('color', this.styleOptions.color);
    this.pointOptions.updateFloatArray(
      'colorScheme',
      this.styleOptions.colorScheme
    );

    this.pointOptions.update();
  }

  private orthographicScore(
    block: MoctreeBlock,
    viewportRadius: number
  ): number {
    return Math.max(
      0,
      block.boundingInfo.boundingSphere.radiusWorld - viewportRadius + 100
    );
  }

  private initializeOctree(blocks: {
    [index: `${number}-${number}-${number}-${number}`]: number;
  }) {
    const size = this.octree.maxPoint.subtract(this.octree.minPoint);
    const flipMatrix = matrix([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, -1]
    ]);

    for (const [index, pointCount] of Object.entries(blocks)) {
      const [lod, x, y, z] = index.split('-').map(Number);
      const mortonIndex = encodeMorton(new Vector3(x, z, y), lod);

      const blocksPerDimension = Math.pow(2, lod);
      const stepX = size.x / blocksPerDimension;
      const stepY = size.y / blocksPerDimension;
      const stepZ = size.z / blocksPerDimension;

      // This bounds are Y-Z swapped so we need to only swap the indices tof the block

      let minPoint = new Vector3(
        this.octree.minPoint.x + x * stepX,
        this.octree.minPoint.y + z * stepY,
        this.octree.minPoint.z + y * stepZ
      );
      let maxPoint = new Vector3(
        this.octree.minPoint.x + (x + 1) * stepX,
        this.octree.minPoint.y + (z + 1) * stepY,
        this.octree.minPoint.z + (y + 1) * stepZ
      );

      const minPointTransformed = multiply(
        flipMatrix,
        minPoint.asArray()
      ).toArray() as MathNumericType[];
      const maxPointTransformed = multiply(
        flipMatrix,
        maxPoint.asArray()
      ).toArray() as MathNumericType[];

      [minPoint, maxPoint] = [
        Vector3.FromArray(
          matrix(
            min([minPointTransformed, maxPointTransformed], 0) as any
          ).toArray() as number[]
        ),
        Vector3.FromArray(
          matrix(
            max([minPointTransformed, maxPointTransformed], 0) as any
          ).toArray() as number[]
        )
      ];

      this.octree.blocklist.set(
        mortonIndex,
        new MoctreeBlock(lod, mortonIndex, minPoint, maxPoint, pointCount)
      );
    }
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
          domain: this.metadata.domain
        } as PointMessage
      } as DataRequest);
    }
  }
}
