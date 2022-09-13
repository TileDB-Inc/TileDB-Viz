// Copyright 2022 TileDB Inc.
// Licensed under the MIT License.

import { Color4 } from '@babylonjs/core';

function setSceneColors(colorScheme: string) {
  let backgroundColor: Color4 = new Color4(0, 24 / 255, 92 / 255, 1);
  let accentColor: string = '#CC0055';
  let secondColor: string = '#C7C7C7';
  let textColor: string = '#F5F7FA';

  if (colorScheme === 'dark') {
    backgroundColor = new Color4(0, 24 / 255, 92 / 255, 1);
    accentColor = '#CC0055';
    secondColor = '#C7C7C7';
    textColor = '#F5F7FA';
  }
  if (colorScheme === 'dark') {
    backgroundColor = new Color4(28 / 255, 28 / 255, 28 / 255, 1);
    accentColor = '#C7C7C7';
    secondColor = '#F5F7FA';
    textColor = '#F5F7FA';
  }
  if (colorScheme === 'light') {
    backgroundColor = new Color4(245 / 255, 247 / 255, 250 / 255, 1);
    accentColor = '#352F4D';
    secondColor = '#C7C7C7';
    textColor = '#352F4D';
  }
  return { backgroundColor, accentColor, secondColor, textColor };
}

export default setSceneColors;
