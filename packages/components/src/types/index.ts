export type Theme = 'system' | 'light' | 'dark';

export interface GUIEvent<T = any> {
  target: string;
  props: T;
}

export interface SliderProps {
  value: number;
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
