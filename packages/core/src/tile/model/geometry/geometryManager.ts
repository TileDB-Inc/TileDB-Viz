import {
  DataRequest,
  RequestType,
  GeometryStyle,
  colorScheme,
  GeometryMetadata,
  GeometryResponse
} from '../../types';
import { Scene, UniformBuffer, Vector4 } from '@babylonjs/core';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { Manager } from '../manager';
import {
  ButtonProps,
  Events,
  GUIEvent,
  Commands,
  SliderProps,
  SelectProps
} from '@tiledb-inc/viz-components';
import { hexToRgb } from '../../utils/helpers';
import {
  Feature,
  FeatureType,
  GUIFlatColorFeature,
  GUICategoricalFeature,
  GUIFeature,
  InfoPanelInitializationEvent,
  InfoPanelConfigEntry
} from '@tiledb-inc/viz-common';
import { GeometryPanelInitializationEvent } from '@tiledb-inc/viz-common';
import { GeometryContent, GeometryUpdateOptions } from './geometryContent';
import { Tile } from '../tile';
import { GeometryDataContent, SceneOptions } from '../../../types';
import { GeometryFetcher } from './geometryFetcher';
import { COLOR_GROUPS, MAX_CATEGORIES } from '../../constants';

interface GeometryOptions {
  arrayID: string;
  namespace: string;
  sceneOptions: SceneOptions;
  metadata: GeometryMetadata;
}

export class GeometryManager extends Manager<
  Tile<GeometryDataContent, GeometryContent>
> {
  private workerPool: WorkerPool;
  private polygonOptions!: UniformBuffer;
  private metadata: GeometryMetadata;
  private styleOptions = {
    style: GeometryStyle.FILLED,
    fill: new Vector4(0, 0, 1, 1),
    outlineThickness: 1,
    outline: new Vector4(1, 0, 0, 1),
    renderingGroup: 1,

    // This array is shared by reference so changing a value
    // should automatically update the uniform value
    colorScheme: Float32Array.from(
      colorScheme
        .map(x => [...Object.values(hexToRgb(x)), 255])
        .flatMap(x => x)
        .map(x => x / 255)
    ),

    // This map is shared by reference and will be updated
    // automatically for all geometry tiles.
    // It is only used when the active attribute is changed
    groupMap: new Map<string, Float32Array>()
  };
  private activeFeature: Feature;

  constructor(
    scene: Scene,
    workerPool: WorkerPool,
    geometryOptions: GeometryOptions
  ) {
    super(
      geometryOptions.metadata.root,
      scene,
      new GeometryFetcher(
        workerPool,
        geometryOptions.metadata,
        geometryOptions.sceneOptions
      )
    );

    this.workerPool = workerPool;
    this.metadata = geometryOptions.metadata;
    this.activeFeature = this.metadata.features[0];

    this.traverserOptions.errorLimit = Math.max(
      this.scene.getEngine().getRenderWidth(),
      this.scene.getEngine().getRenderHeight()
    );

    this.initializeUniformBuffer();

    this.registerEventListeners();
  }

  public get CRS(): string | undefined {
    return this.metadata.crs;
  }

  private initializeUniformBuffer() {
    // To maintain support for WebGL devices the minimum limits for uniform buffers need to be respected.
    // The miminum number of uniform vec4 is 224 for fragment shaders so the 32 and 192 limits on color scheme
    // and group map are there to enforce these minimum limits.
    this.polygonOptions = new UniformBuffer(this.scene.getEngine());

    this.polygonOptions.addUniform('color', 4, 0);
    this.polygonOptions.addUniform('opacity', 1, 0);
    this.polygonOptions.addUniform('colorScheme', 4, COLOR_GROUPS);
    this.polygonOptions.addUniform('groupMap', 4, MAX_CATEGORIES);

    this.polygonOptions.updateVector4('color', this.styleOptions.fill);
    this.polygonOptions.updateFloat('opacity', 1);
    this.polygonOptions.updateFloatArray(
      'colorScheme',
      this.styleOptions.colorScheme
    );

    this.polygonOptions.update();
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
    window.removeEventListener(
      Events.BUTTON_CLICK,
      this.buttonHandler.bind(this) as any,
      { capture: true }
    );

    window.removeEventListener(
      Events.SELECT_INPUT_CHANGE,
      this.selectHandler.bind(this) as any,
      { capture: true }
    );

    window.removeEventListener(
      Events.SLIDER_CHANGE,
      this.sliderHandler.bind(this) as any,
      { capture: true }
    );

    window.removeEventListener(
      Events.COLOR_CHANGE,
      this.buttonHandler.bind(this) as any,
      { capture: true }
    );
  }

  public requestTile(
    tile: Tile<GeometryDataContent, GeometryContent>,
    nonce?: number
  ): Promise<any> {
    if (tile.content.length === 0) {
      return new Promise((resolve, _) => resolve(true));
    }

    if (!tile.data) {
      tile.data = new GeometryContent(this.scene, tile);
    }

    return this.fetcher.fetch(tile, { nonce: nonce ?? 0 });
  }

  public cancelTile(
    tile: Tile<GeometryDataContent, GeometryContent>,
    nonce?: number
  ): void {
    this.workerPool.cancelRequest({
      type: RequestType.CANCEL,
      id: tile.id,
      payload: { nonce: nonce }
    } as DataRequest);
  }

  public onLoaded(
    tile: Tile<GeometryDataContent, GeometryContent>,
    data: GeometryResponse
  ): void {
    tile.data?.update({
      data: {
        position: data.position,
        indices: data.indices,
        ids: data.ids,
        attributes: data.attributes
      },
      feature: this.activeFeature,
      styleOptions: this.styleOptions,
      UBO: this.polygonOptions
    });
  }

  private buttonHandler(event: CustomEvent<GUIEvent<ButtonProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.id) {
      return;
    }

    switch (event.detail.props.command) {
      case Commands.COLOR:
        {
          if (target[1] === 'fill' || target[1] === 'outline') {
            const color: { r: number; g: number; b: number } =
              event.detail.props.data;
            Vector4.FromFloatsToRef(
              color.r / 255,
              color.g / 255,
              color.b / 255,
              1,
              this.styleOptions[target[1]]
            );
            this.polygonOptions.updateVector4('color', this.styleOptions.fill);
          } else {
            const groupIndex = Number.parseInt(target[1]);
            const color: { r: number; g: number; b: number } =
              event.detail.props.data;

            this.styleOptions.colorScheme[4 * groupIndex] = color.r / 255;
            this.styleOptions.colorScheme[4 * groupIndex + 1] = color.g / 255;
            this.styleOptions.colorScheme[4 * groupIndex + 2] = color.b / 255;

            this.polygonOptions.updateFloatArray(
              'colorScheme',
              this.styleOptions.colorScheme
            );
          }

          this.polygonOptions.update();

          for (const tile of this.visibleTiles.values()) {
            tile.data?.update({
              styleOptions: {
                outline: this.styleOptions.outline
              }
            });
          }
        }
        break;
      case Commands.GROUP:
        {
          let state = this.styleOptions.groupMap.get(this.activeFeature.name);
          if (!state) {
            state = new Float32Array(MAX_CATEGORIES * 4).fill(32);
            this.styleOptions.groupMap.set(this.activeFeature.name, state);
          }

          state[event.detail.props.data.category] =
            event.detail.props.data.group;

          this.polygonOptions.updateFloatArray('groupMap', state);
          this.polygonOptions.update();
        }
        break;
      default:
        break;
    }
  }

  private selectHandler(event: CustomEvent<GUIEvent<SelectProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.id) {
      return;
    }

    const updateOptions: GeometryUpdateOptions = {};

    switch (target[1]) {
      case 'renderingStyle':
        this.styleOptions.style = event.detail.props.value;
        updateOptions.styleOptions = { style: event.detail.props.value };
        break;
      case 'displayFeature':
        {
          this.activeFeature = this.metadata.features[event.detail.props.value];
          updateOptions.feature = this.activeFeature;
          updateOptions.UBO = this.polygonOptions;

          let state = this.styleOptions.groupMap.get(this.activeFeature.name);
          if (!state) {
            state = new Float32Array(MAX_CATEGORIES * 4).fill(32);
            this.styleOptions.groupMap.set(this.activeFeature.name, state);
          }
          this.polygonOptions.updateFloatArray('groupMap', state);
          this.polygonOptions.update();
        }
        break;
      case 'renderingGroup':
        this.styleOptions.renderingGroup = event.detail.props.value;
        updateOptions.styleOptions = {
          renderingGroup: event.detail.props.value
        };
        break;
      default:
        return;
    }

    for (const tile of this.visibleTiles.values()) {
      tile.data?.update(updateOptions);
    }
  }

  private sliderHandler(event: CustomEvent<GUIEvent<SliderProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.id) {
      return;
    }

    switch (target[1]) {
      case 'fillOpacity':
        this.polygonOptions.updateFloat(
          'opacity',
          event.detail.props.value ?? 1
        );
        this.polygonOptions.update();
        break;
      case 'outlineWidth':
        this.styleOptions.outlineThickness = event.detail.props.value ?? 1;
        break;
    }

    for (const tile of this.visibleTiles.values()) {
      tile.data?.update({
        styleOptions: {
          outlineThickness: this.styleOptions.outlineThickness
        }
      });
    }
  }

  public initializeGUIProperties(): void {
    if (this.metadata.idAttribute) {
      window.dispatchEvent(
        new CustomEvent<GUIEvent<InfoPanelInitializationEvent>>(
          Events.INITIALIZE,
          {
            bubbles: true,
            detail: {
              target: 'info-panel',
              props: {
                config: new Map([
                  [
                    this.id,
                    {
                      name: this.metadata.name,
                      pickAttribute: this.metadata.idAttribute.name,
                      attributes: this.metadata.attributes.filter(
                        x => x.name !== this.metadata.geometryAttribute.name
                      )
                    } as InfoPanelConfigEntry
                  ]
                ])
              }
            }
          }
        )
      );
    }

    window.dispatchEvent(
      new CustomEvent<GUIEvent<GeometryPanelInitializationEvent>>(
        Events.INITIALIZE,
        {
          bubbles: true,
          detail: {
            target: 'geometry-panel',
            props: {
              id: this.id,
              name: this.metadata.name,
              renderingGroup: {
                name: 'Rendering group',
                id: 'renderingGroup',
                entries: [
                  { value: 1, name: 'Layer 1' },
                  { value: 2, name: 'Layer 2' },
                  { value: 3, name: 'Layer 3' }
                ],
                default: 1
              },
              renderingStyle: {
                name: 'Rendering style',
                id: 'renderingStyle',
                entries: [
                  { value: GeometryStyle.FILLED, name: 'Filled' },
                  { value: GeometryStyle.OUTLINED, name: 'Outlined' },
                  {
                    value: GeometryStyle.FILLED_OUTLINED,
                    name: 'Filled + Outlined'
                  }
                ],
                default: GeometryStyle.FILLED
              },
              fillOpacity: {
                name: 'Fill opacity',
                id: 'fillOpacity',
                min: 0,
                max: 1,
                step: 0.01,
                default: 1
              },
              outlineWidth: {
                name: 'Outline width',
                id: 'outlineWidth',
                min: 0,
                max: 4,
                step: 0.04,
                default: 1
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
                        fill: '#0000FF',
                        outline: '#FF0000'
                      } as GUIFlatColorFeature;
                    } else if (x.type === FeatureType.CATEGORICAL) {
                      return {
                        name: x.name,
                        type: FeatureType.CATEGORICAL,
                        enumeration: this.metadata.attributes.find(
                          y => y.name === x.attributes[0].name
                        )?.enumeration
                      } as GUICategoricalFeature;
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
