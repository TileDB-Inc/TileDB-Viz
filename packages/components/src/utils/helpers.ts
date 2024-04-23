import { FeatureType, GUICategoricalFeature, GUIFeatureProperty, GUIFlatColorFeature, GUIProperty, GUISelectProperty, GUISliderProperty, GUIVectorProperty } from "@tiledb-inc/viz-common";
import { GUICategoricalState, GUIFeaturePropertyState, GUIFlatColorState, GUIPropertyState, GUISelectPropertyState, GUISliderPropertyState, GUIVectorPropertyState, colorScheme } from "../types";
import { stat } from "fs";

export function capitalize(str: string): string {
  const firstChar = str.charAt(0);

  return firstChar.toUpperCase() + str.slice(1);
}

export const pprintZoom = (zoom?: number): string => {
  if (typeof zoom === 'undefined') {
    return '-';
  }

  const percentage = 100 * Math.pow(2, zoom);

  return `${Math.floor(percentage)}%`;
};

export function rangeToPagination(
  currentPage: number,
  itemsPerPage: number,
  totalItems: number
): string {
  const startIndex = currentPage * itemsPerPage + 1;
  const endIndex = Math.min((currentPage + 1) * itemsPerPage, totalItems);

  return `${startIndex} - ${endIndex} of ${totalItems}`;
}

const componentToHex = (c: number): string => {
  const hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function hexToRgb(hex: string): {r: number, g: number, b: number} | null {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

const LENGTH_UNITS: Map<string, number> = new Map([
  ['m', 0],
  ['dm', -1],
  ['cm', -2],
  ['mm', -3],
  ['μm', -6],
  ['nm', -9],
  ['pm', -12]
]);

const UNITS_ORDER = ['m', 'mm', 'μm', 'nm', 'pm'];

export function lengthConverter(
  value: number,
  current_unit = 'μm'
): [number, string] {
  // The initial value units are always micrometers
  if (value < 1) {
    // If initial value is less than 1 we will try to express it in a unit whre it will be between [1, 1000)
    let next_unit_index = UNITS_ORDER.indexOf(current_unit) + 1;

    while (next_unit_index < UNITS_ORDER.length && value < 1) {
      const next_unit = UNITS_ORDER[next_unit_index];

      value *= Math.pow(
        10,
        LENGTH_UNITS.get(current_unit)! - LENGTH_UNITS.get(next_unit)!
      );

      current_unit = next_unit;
      ++next_unit_index;
    }
  } else {
    // Else if initial value is greater than 1000 we will try to express it in a unit whre it will be between [1, 1000)
    let next_unit_index = UNITS_ORDER.indexOf(current_unit) - 1;

    while (next_unit_index > -1 && value > 1000) {
      const next_unit = UNITS_ORDER[next_unit_index];

      value *= Math.pow(
        10,
        LENGTH_UNITS.get(current_unit)! - LENGTH_UNITS.get(next_unit)!
      );

      current_unit = next_unit;
      --next_unit_index;
    }
  }

  return [value, current_unit];
}

export function unitFormatter(value: number, unit: string): string {
  return `${value.toFixed(2)} ${unit}`;
}

export function clone<T>(object: T): T {
  return JSON.parse(JSON.stringify(object));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createFeatureState(property: GUIFeatureProperty, enumerations: Record<string, string[]>): GUIFeaturePropertyState {
  const state: GUIFeaturePropertyState = {
    property: property,
    value: property.default,
    flatColorState: {},
    categoricalState: {},
  };

  for (const feature of property.features) {
    if (feature.type === FeatureType.FLAT_COLOR) {
      state.flatColorState[feature.name] = {
        fill: (feature as GUIFlatColorFeature).fill,
        outline: (feature as GUIFlatColorFeature).outline
      } as GUIFlatColorState;
    } else if (feature.type === FeatureType.CATEGORICAL) {
      state.categoricalState[feature.name] = {
        colors: clone(colorScheme),
        category: Object.fromEntries(
          enumerations[
            (feature as GUICategoricalFeature).enumeration
          ].map(x => {
            return [x, { group: 0, selected: false }];
          })
        )
      } as GUICategoricalState;
    }
  }

  return state;
}

export function setupProperties(properties: GUIProperty[], enumerations: Record<string, string[]> = {}): GUIPropertyState<any>[] {
  const state: GUIPropertyState<any>[] = [];

  for (const property of properties) {
    switch (property.type) {
      case 'SLIDER':
        state.push({
            property: property,
            value: (property as GUISliderProperty).default
          } as GUISliderPropertyState
        );
        break;
      case 'SELECT':
        state.push({
            property: property,
            value: (property as GUISelectProperty).default
          } as GUISelectPropertyState
        );
        break;
      case 'VECTOR':
        state.push({
          property: property,
          value: JSON.parse(JSON.stringify((property as GUIVectorProperty).value))
        } as GUIVectorPropertyState)
        break;
      case 'FEATURE': {
        const colorState: Record<string, GUIFlatColorState> = {};
        const categoryState: Record<string, GUICategoricalState> = {};

        for (const feature of (property as GUIFeatureProperty).features) {
          if (feature.type === FeatureType.FLAT_COLOR) {
            colorState[feature.name] = {
              fill: (feature as GUIFlatColorFeature).fill,
              outline: (feature as GUIFlatColorFeature).outline
            } as GUIFlatColorState;
          } else if (feature.type === FeatureType.CATEGORICAL) {
            categoryState[feature.name] = {
              colors: clone(colorScheme),
              category: Object.fromEntries(
                enumerations[
                  (feature as GUICategoricalFeature).enumeration
                ].map(x => {
                  return [x, { group: 0, selected: false }];
                })
              )
            } as GUICategoricalState;
          }
        }
        state.push({
            property: property,
            flatColorState: colorState,
            categoricalState: categoryState,
            value: 0
          } as GUIFeaturePropertyState);
        break;
      }
    }
  }

  return state;
}
