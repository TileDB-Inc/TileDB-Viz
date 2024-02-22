import { Attribute } from './core';

export type GUIEvent<T = any> = {
  target: string;
  props: T;
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
