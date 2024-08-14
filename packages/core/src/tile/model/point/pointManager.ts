import { Scene, UniformBuffer, Vector4 } from '@babylonjs/core';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { Manager } from '../manager';
import {
  PointShape,
  colorScheme,
  DataRequest,
  RequestType,
  PointCloudMetadata,
  PointResponse
} from '../../types';
import { hexToRgb } from '../../utils/helpers';
import {
  ButtonProps,
  Events,
  GUIEvent,
  Commands,
  SliderProps,
  SelectProps
} from '@tiledb-inc/viz-components';
import {
  Feature,
  FeatureType,
  PointPanelInitializationEvent,
  GUIFlatColorFeature,
  GUICategoricalFeature,
  GUIFeature
} from '@tiledb-inc/viz-common';
import { Tile } from '../tile';
import { PointDataContent, SceneOptions } from '../../../types';
import { PointCloudUpdateOptions, PointTileContent } from './pointContent';
import { PointCloudFetcher } from './pointFetcher';

interface PointOptions {
  metadata: PointCloudMetadata;
  namespace: string;
  sceneOptions: SceneOptions;
}

export class PointManager extends Manager<
  Tile<PointDataContent, PointTileContent>
> {
  private workerPool: WorkerPool;
  private pointOptions!: UniformBuffer;
  private metadata: PointCloudMetadata;
  private activeFeature: Feature;
  private pointSize: number;
  private sceneOptions: SceneOptions;
  private styleOptions = {
    pointShape: PointShape.SQUARE,
    pointSize: 1,
    pointOpacity: 1,
    color: new Vector4(1, 0.078, 0.576, 1),

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
    groupMap: new Map<string, Float32Array>()
  };

  constructor(scene: Scene, workerPool: WorkerPool, options: PointOptions) {
    super(
      options.metadata.root,
      scene,
      new PointCloudFetcher(workerPool, options.metadata, options.sceneOptions)
    );

    this.workerPool = workerPool;
    this.metadata = options.metadata;
    this.activeFeature = this.metadata.features[0];
    this.errorLimit = Math.max(
      this.scene.getEngine().getRenderWidth(),
      this.scene.getEngine().getRenderHeight()
    );
    this.sceneOptions = options.sceneOptions;
    this.pointSize = 1;

    this.initializeUniformBuffer();

    this.registerEventListeners();
    this.initializeGUIProperties();
    this.fetcher = new PointCloudFetcher(
      this.workerPool,
      this.metadata,
      this.sceneOptions
    );
  }

  public get CRS(): string | undefined {
    return this.metadata.crs;
  }

  public registerEventListeners(): void {
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

  public removeEventListeners(): void {
    throw new Error('Method not implemented.');
  }

  public requestTile(
    tile: Tile<PointDataContent, PointTileContent>,
    nonce?: number
  ): Promise<any> {
    if (!tile.data) {
      tile.data = new PointTileContent(this.scene, tile);
    }

    return this.fetcher.fetch(tile);
  }

  public cancelTile(
    tile: Tile<PointDataContent, PointTileContent>,
    nonce?: number
  ): void {
    this.workerPool.cancelRequest({
      type: RequestType.CANCEL,
      id: tile.id,
      payload: { nonce: nonce }
    } as DataRequest);
  }

  public onLoaded(
    tile: Tile<PointDataContent, PointTileContent>,
    data: PointResponse
  ): void {
    tile.data?.update({
      data: {
        position: data.position,
        attributes: data.attributes,
        ids: data.ids
      },
      pointShape: this.styleOptions.pointShape,
      UBO: this.pointOptions,
      FrameUBO: this.frameOptions,
      feature: this.activeFeature
    });
  }

  private selectHandler(event: CustomEvent<GUIEvent<SelectProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.metadata.id) {
      return;
    }

    const updateOptions: PointCloudUpdateOptions = {};

    switch (target[1]) {
      case 'pointShape':
        this.styleOptions.pointShape = event.detail.props.value;
        updateOptions.pointShape = event.detail.props.value;
        break;
      case 'displayFeature':
        {
          this.activeFeature = this.metadata.features[event.detail.props.value];
          updateOptions.feature = this.activeFeature;
          updateOptions.UBO = this.pointOptions;
          updateOptions.FrameUBO = this.frameOptions;

          let state = this.styleOptions.groupMap.get(this.activeFeature.name);
          if (!state) {
            state = new Float32Array(768).fill(32);
            this.styleOptions.groupMap.set(this.activeFeature.name, state);
          }
          this.pointOptions.updateFloatArray('groupMap', state);
          this.pointOptions.update();
        }
        break;
      default:
        return;
    }

    for (const tile of this.tiles.values()) {
      tile.data?.update(updateOptions);
    }
  }

  private sliderHandler(event: CustomEvent<GUIEvent<SliderProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.metadata.id) {
      return;
    }

    switch (target[1]) {
      case 'pointSize':
        this.pointSize = event.detail.props.value ?? 1;
        this.pointOptions.updateFloat('pointSize', this.pointSize);

        this.pointOptions.update();
        break;
      case 'quality':
        this.errorLimit =
          Math.max(
            this.scene.getEngine().getRenderWidth(),
            this.scene.getEngine().getRenderHeight()
          ) *
          (50 / (event.detail.props.value ?? 50));
        break;
      case 'pointOpacity':
        this.pointOptions.updateFloat(
          'pointOpacity',
          event.detail.props.value ?? 1
        );
        this.pointOptions.update();
        break;
    }
  }

  private buttonHandler(event: CustomEvent<GUIEvent<ButtonProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.metadata.id) {
      return;
    }

    switch (event.detail.props.command) {
      case Commands.COLOR:
        {
          if (target[1] === 'fill') {
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
          let state = this.styleOptions.groupMap.get(this.activeFeature.name);
          if (!state) {
            state = new Float32Array(768).fill(32);
            this.styleOptions.groupMap.set(this.activeFeature.name, state);
          }

          state[event.detail.props.data.category] =
            event.detail.props.data.group;

          this.pointOptions.updateFloatArray('groupMap', state);
          this.pointOptions.update();
        }
        break;
      default:
        break;
    }
  }

  private initializeUniformBuffer() {
    this.pointOptions = new UniformBuffer(this.scene.getEngine());

    this.pointOptions.addUniform('pointSize', 1, 0);
    this.pointOptions.addUniform('color', 4, 0);
    this.pointOptions.addUniform('colorScheme', 4, 32);
    this.pointOptions.addUniform('pointOpacity', 1, 0);
    this.pointOptions.addUniform('groupMap', 4, 192);

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

  public initializeGUIProperties() {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<PointPanelInitializationEvent>>(
        Events.INITIALIZE,
        {
          bubbles: true,
          detail: {
            target: 'point-panel',
            props: {
              id: this.metadata.id,
              name: this.metadata.name,
              pointBudget: {
                name: 'Point budget',
                id: 'pointBudget',
                min: 100_000,
                max: 10_000_000,
                default: 1_000_000,
                step: 10_000
              },
              quality: {
                name: 'Quality',
                id: 'quality',
                min: 1,
                max: 100,
                default: 50,
                step: 1
              },
              pointShape: {
                name: 'Point shape',
                id: 'pointShape',
                entries: [
                  { value: PointShape.SQUARE, name: 'Square' },
                  { value: PointShape.CIRCLE, name: 'Circle' }
                ],
                default: PointShape.SQUARE
              },
              pointSize: {
                name: 'Point size',
                id: 'pointSize',
                min: 1,
                max: 10,
                default: 1,
                step: 0.01
              },
              pointOpacity: {
                name: 'Point opacity',
                id: 'pointOpacity',
                min: 0,
                max: 1,
                default: 1,
                step: 0.01
              },
              displayFeature: {
                name: 'Display feature',
                id: 'displayFeature',
                entries: this.metadata.features
                  .filter(x => x.type !== FeatureType.NON_RENDERABLE)
                  .map((x, index) => {
                    return { value: index, name: x.name };
                  }),
                default: 0,
                features: this.metadata.features
                  .map(x => {
                    if (x.type === FeatureType.FLAT_COLOR) {
                      return {
                        name: x.name,
                        type: FeatureType.FLAT_COLOR,
                        fill: '#FF1493'
                      } as GUIFlatColorFeature;
                    } else if (x.type === FeatureType.CATEGORICAL) {
                      return {
                        name: x.name,
                        type: FeatureType.CATEGORICAL,
                        enumeration: this.metadata.attributes.find(
                          y => y.name === x.attributes[0].name
                        )?.enumeration
                      } as GUICategoricalFeature;
                    } else if (x.type === FeatureType.RGB) {
                      return {
                        name: x.name,
                        type: FeatureType.RGB
                      } as GUIFeature;
                    }
                  })
                  .filter(x => x !== undefined) as GUIFeature[]
              },
              enumerations: Object.fromEntries(this.metadata.categories)
            }
          }
        }
      )
    );
  }
}
