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
  