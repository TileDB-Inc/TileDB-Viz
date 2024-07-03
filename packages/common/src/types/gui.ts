import { Attribute, FeatureType, GeometryStyle, PointShape } from './core';

export type GUIEvent<T = any> = {
  target: string;
  props: T;
};

export type EngineUpdate = {
  propertyID: string;
  value: any;
};

type InfoPanelConfigEntry = {
  /**
   * The asset display name
   */
  name: string;

  /**
   * The name of unique identifier attribute used for picking
   */
  pickAttribute: string;

  /**
   * The assets list of attributes
   */
  attributes: Attribute[];
};

export type InfoPanelInitializationEvent = {
  /**
   * The Info Panel config options indexed by asset id
   */
  config: Map<string, InfoPanelConfigEntry>;
};

export type GUIProperty = {
  /**
   * Display name of property
   */
  name: string;

  /**
   * Property id
   */
  id: string;
};

export type GUISliderProperty = GUIProperty & {
  /**
   * Minimum range value
   */
  min: number;

  /**
   * Maximum range value
   */
  max: number;

  /**
   * Default range value
   */
  default: number;

  /**
   * Default step value
   */
  step: number;
};

export type GUIDualSliderProperty = GUIProperty & {
  /**
   * Minimum range value
   */
  min: number;

  /**
   * Maximum range value
   */
  max: number;

  /**
   * Default min range value
   */
  defaultMin: number;

  /**
   * Default max range value
   */
  defaultMax: number;

  /**
   * Default step value
   */
  step: number;
};

export type GUISelectProperty<T = number> = GUIProperty & {
  /**
   * Selectable options
   */
  entries: { value: T; name: string }[];

  /**
   * Default range value
   */
  default: number;
};

export type GUIFeatureProperty = GUISelectProperty & {
  features: GUIFeature[];
};

export type GUIFeature = {
  type: FeatureType;

  name: string;
};

export type GUIFlatColorFeature = GUIFeature & {
  type: FeatureType.FLAT_COLOR;
  fill?: string;
  outline?: string;
};

export type GUICategoricalFeature = GUIFeature & {
  type: FeatureType.CATEGORICAL;

  enumeration: string;
};

export type GUIVectorProperty = GUIProperty & {
  value: [number, number, number];
};

export type GUIChannelProperty = GUIDualSliderProperty & {
  /**
   * Render color of the channel.
   */
  color: string;

  /**
   * If true, the channel should be rendered.
   */
  visible: boolean;
};

export type GeometryPanelInitializationEvent = {
  id: string;
  name: string;
  renderingGroup: GUISelectProperty;
  renderingStyle: GUISelectProperty<GeometryStyle>;
  displayFeature: GUIFeatureProperty;
  fillOpacity: GUISliderProperty;
  outlineWidth: GUISliderProperty;
  enumerations: Record<string, string[]>;
};

export type PointPanelInitializationEvent = {
  id: string;
  name: string;
  pointBudget: GUISliderProperty;
  quality: GUISliderProperty;
  pointShape: GUISelectProperty<PointShape>;
  pointSize: GUISliderProperty;
  pointOpacity: GUISliderProperty;
  displayFeature: GUIFeatureProperty;
  enumerations: Record<string, string[]>;
};

export type TilePanelInitializationEvent = {
  id: string;

  name: string;

  sourceCRS: GUISelectProperty;
  sseThreshold: GUISliderProperty;
  opacity: GUISliderProperty;
};

export type ScenePanelInitializationEvent = {
  baseCRS: GUISelectProperty;
};

export type CameraPanelInitializationEvent = {
  projection: GUISelectProperty;
  position: GUIVectorProperty;
  target: GUIVectorProperty;
  pitch: GUISliderProperty;
  rotation: GUISliderProperty;
  zoom: GUISliderProperty;
};

export type ImagePanelInitializationEvent = {
  id: string;
  name: string;
  attribute: GUISelectProperty;
  channels: Record<string, GUIChannelProperty[]>;
};
