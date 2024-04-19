import { Attribute, FeatureType } from './core';

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

  /**
   * Property type
   */
  type: 'SLIDER' | 'SELECT' | 'FEATURE' | 'VECTOR';
};

export type GUISliderProperty = GUIProperty & {
  type: 'SLIDER';

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

export type GUISelectProperty = GUIProperty & {
  type: 'SELECT';

  /**
   * Selectable options
   */
  values: string[];

  /**
   * Default range value
   */
  default: number;
};

export type GUIFeatureProperty = Omit<GUISelectProperty, 'type'> & {
  type: 'FEATURE';

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
  type: 'VECTOR';

  value: [number, number, number];
};

export type PointPanelInitializationEvent = {
  id: string;

  name: string;

  properties: GUIProperty[];

  enumerations: Record<string, string[]>;
};

export type TilePanelInitializationEvent = {
  id: string;

  name: string;

  properties: GUIProperty[];
};

export type ScenePanelInitializationEvent = {
  properties: GUIProperty[];
};

export type CameraPanelInitializationEvent = {
  projection: GUISelectProperty;
  position: GUIVectorProperty;
  target: GUIVectorProperty;
  pitch: GUISliderProperty;
  rotation: GUISliderProperty;
  zoom: GUISliderProperty;
};
