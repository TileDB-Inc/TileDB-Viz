import { GUIChannelProperty, GUIDualSliderProperty, GUIFeatureProperty, GUIProperty, GUISelectProperty, GUISliderProperty, GUIVectorProperty } from "@tiledb-inc/viz-common";

export type Theme = 'system' | 'light' | 'dark';

export interface GUIEvent<T = any> {
  target: string;
  props: T;
}

export interface SliderProps {
  value?: number;
  range?: [number, number];
}

export interface TextBoxProps {
  value: string;
}

export interface ButtonProps {
  command: string;
  data?: any;
}

export type SelectProps = {
  value: number;
}

export const colorScheme = [
  '#20603D',
  '#9E9764',
  '#F4A900',
  '#FF2301',
  '#434B4D',
  '#A18594',
  '#252850',
  '#A5A5A5',
  '#C51D34',
  '#4D5645',
  '#FF7514',
  '#79553D',
  '#31372B',
  '#9E9764',
  '#E7EBDA',
  '#212121',
  '#464531',
  '#84C3BE',
  '#B44C43',
  '#A18594',
  '#193737',
  '#20214F',
  '#1D1E33',
  '#316650',
  '#474B4E',
  '#403A3A',
  '#5D9B9B',
  '#1C542D',
  '#D84B20',
  '#5E2129',
  '#2A6478',
  '#BDECB6'
];

export type GUIPropertyState<T extends GUIProperty> = {
  property: T
}

export type GUISliderPropertyState = GUIPropertyState<GUISliderProperty> & {
  value: number;
}

export type GUIDualSliderPropertyState = GUIPropertyState<GUIDualSliderProperty> & {
  valueMin: number;
  valueMax: number;
}

export type GUISelectPropertyState<T = number> = GUIPropertyState<GUISelectProperty<T>> & {
  value: T;
}

export type GUIFlatColorState = { fill?: string, outline?: string };

export type GUICategoricalState = {
  category: Record<string, { group: number; selected: boolean }>
  colors: string[];
}

export type GUIFeaturePropertyState = GUIPropertyState<GUIFeatureProperty> & {
  value: number;
  flatColorState: Record<string, GUIFlatColorState>;
  categoricalState: Record<string, GUICategoricalState>;
}

export type GUIVectorPropertyState = GUIPropertyState<GUIVectorProperty> & {
  value: [number, number, number];
}

export type GUIChannelPropertyState = GUIPropertyState<GUIChannelProperty> & {
  valueMin: number;
  valueMax: number;
  color: string;
  visible: boolean;
}