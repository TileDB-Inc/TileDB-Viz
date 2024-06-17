import {
  DataRequest,
  RequestType,
  GeometryStyle,
  colorScheme,
  GeometryPayload,
  GeometryMetadata,
  GeometryResponse
} from '../../types';
import { Scene, Color3 } from '@babylonjs/core';
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
  GUIFeature
} from '@tiledb-inc/viz-common';
import { GeometryPanelInitializationEvent } from '@tiledb-inc/viz-common';
import { GeometryContent, GeometryUpdateOptions } from './geometryContent';
import { Tile } from '../tile';
import { GeometryDataContent, SceneOptions } from '../../../types';

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
  private metadata: GeometryMetadata;
  private id: string;
  private namespace: string;
  private sceneOptions: SceneOptions;
  private styleOptions = {
    style: GeometryStyle.FILLED,
    fillOpacity: 1,
    fill: new Color3(0, 0, 1),
    outlineThickness: 1,
    outline: new Color3(1, 0, 0),
    renderingGroup: 1,

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
  private activeFeature: Feature;

  constructor(
    scene: Scene,
    workerPool: WorkerPool,
    geometryOptions: GeometryOptions
  ) {
    super(geometryOptions.metadata.root, scene);

    this.workerPool = workerPool;
    this.metadata = geometryOptions.metadata;
    this.id = geometryOptions.arrayID;
    this.namespace = geometryOptions.namespace;
    this.activeFeature = this.metadata.features[0];
    this.sceneOptions = geometryOptions.sceneOptions;

    this.errorLimit = Math.max(
      this.scene.getEngine().getRenderWidth(),
      this.scene.getEngine().getRenderHeight()
    );

    this.registerEventListeners();
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

    this.workerPool.postMessage({
      type: RequestType.GEOMETRY,
      id: tile.id,
      payload: {
        index: tile.index,
        uri: tile.content[0].uri,
        region: tile.content[0].region,
        namespace: this.namespace,
        sourceCRS: this.metadata.crs,
        type: this.metadata.type,
        targetCRS: this.sceneOptions.crs,
        transformation: this.sceneOptions.transformation?.toArray(),
        attributes: this.metadata.attributes,
        features: this.metadata.features,
        geometryAttribute: this.metadata.geometryAttribute,
        idAttribute: this.metadata.idAttribute,
        heightAttribute: this.metadata.extrudeAttribute,
        nonce: nonce
      } as GeometryPayload
    } as DataRequest);

    return new Promise((resolve, _) => {
      this.workerPool.callbacks.set(`${tile.id}_${nonce}`, resolve);
    });
  }

  public cancelTile(tile: Tile<GeometryDataContent, GeometryContent>): void {
    this.workerPool.cancelRequest({
      type: RequestType.CANCEL,
      id: tile.id
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
        attributes: data.attributes
      },
      feature: this.activeFeature,
      fill: this.styleOptions.fill,
      fillOpacity: this.styleOptions.fillOpacity,
      styleOptions: this.styleOptions,
      colorScheme: this.styleOptions.colorScheme
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
            this.styleOptions[target[1]] = new Color3(
              color.r / 255,
              color.g / 255,
              color.b / 255
            );
          } else {
            const groupIndex = Number.parseInt(target[1]);
            const color: { r: number; g: number; b: number } =
              event.detail.props.data;

            this.styleOptions.colorScheme[4 * groupIndex] = color.r / 255;
            this.styleOptions.colorScheme[4 * groupIndex + 1] = color.g / 255;
            this.styleOptions.colorScheme[4 * groupIndex + 2] = color.b / 255;
          }

          for (const tile of this.visibleTiles.values()) {
            tile.data?.update({
              fill: this.styleOptions.fill,
              colorScheme: this.styleOptions.colorScheme,
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
            state = new Float32Array(768).fill(32);
            this.styleOptions.groupMap.set(this.activeFeature.name, state);
          }

          state[event.detail.props.data.category] =
            event.detail.props.data.group;

          for (const tile of this.visibleTiles.values()) {
            tile.data?.update({
              groupMap: state
            });
          }
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
          updateOptions.colorScheme = this.styleOptions.colorScheme;
          let state = this.styleOptions.groupMap.get(this.activeFeature.name);
          if (!state) {
            state = new Float32Array(768).fill(32);
            this.styleOptions.groupMap.set(this.activeFeature.name, state);
          }
          updateOptions.groupMap = state;
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
        this.styleOptions.fillOpacity = Math.max(
          event.detail.props.value ?? 1,
          0.01
        );
        break;
      case 'outlineWidth':
        this.styleOptions.outlineThickness = event.detail.props.value ?? 1;
        break;
    }

    for (const tile of this.visibleTiles.values()) {
      tile.data?.update({
        fillOpacity: this.styleOptions.fillOpacity,
        styleOptions: {
          outlineThickness: this.styleOptions.outlineThickness
        }
      });
    }
  }

  public initializeGUIProperties(): void {
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
