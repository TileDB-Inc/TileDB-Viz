import { Scene } from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Grid,
  RadioGroup,
  SelectionPanel,
  StackPanel,
  Slider,
  Rectangle,
  TextBlock
} from '@babylonjs/gui';
import ArrayModel from '../model/array-model';
import setSceneColors from '../utils/scene-colors';
import { TileDBPointCloudOptions } from '../utils/tiledb-pc';

class PointCloudGUI {
  advancedDynamicTexture: AdvancedDynamicTexture;

  constructor(scene: Scene) {
    this.advancedDynamicTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      'PC-UI',
      true,
      scene
    );
  }

  public async init(
    scene: Scene,
    model: ArrayModel,
    options: TileDBPointCloudOptions
  ) {
    // TODO - check these values
    this.advancedDynamicTexture.idealWidth = 800;
    this.advancedDynamicTexture.idealHeight = 900;
    this.advancedDynamicTexture.useSmallestIdeal = true;

    console.log('scene in gui');
    console.log(scene);
    console.log('model in gui');
    console.log(model);
    console.log('options in gui');
    console.log(options);
    console.log('gui in gui');
    console.log(this.advancedDynamicTexture);

    let sceneColors = setSceneColors(options.colorScheme as string);

    // set up GUI grid
    const grid = new Grid();
    grid.addColumnDefinition(192, true);
    grid.addColumnDefinition(192, true);
    grid.addColumnDefinition(1);
    grid.addColumnDefinition(192, true);

    grid.addRowDefinition(64, true);
    grid.addRowDefinition(1);
    grid.addRowDefinition(64, true);

    // add button that expands customization menu
    const button = Button.CreateSimpleButton('button', 'Customize');
    button.fontSizeInPixels = 9;
    button.background = sceneColors.secondColor;
    button.fontWeight = 'bold';
    button.color = sceneColors.textColor;
    button.highlightColor = sceneColors.accentColor;
    button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    // open and close the customization panel menu on click of button
    button.onPointerUpObservable.add(() => {
      changeMenu();
    });

    // add the customization panel
    const customizePanel = new SelectionPanel('customizeBox');
    customizePanel.width = 1;
    customizePanel.height = 1;
    customizePanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    customizePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    customizePanel.background = sceneColors.backgroundColor.toHexString();
    customizePanel.fontSize = 8;
    customizePanel.color = sceneColors.textColor;
    customizePanel.barColor = sceneColors.accentColor;
    customizePanel.headerColor = sceneColors.textColor;
    customizePanel.buttonColor = sceneColors.accentColor;
    customizePanel.buttonBackground = sceneColors.secondColor;
    customizePanel.labelColor = sceneColors.textColor;

    // select color scheme
    const setColor = (but: any) => {
      switch (but) {
        case 'dark':
          sceneColors = setSceneColors('dark');
          scene.clearColor = sceneColors.backgroundColor;
          scene.render();
          break;
        case 'light':
          sceneColors = setSceneColors('light');
          scene.clearColor = sceneColors.backgroundColor;
          scene.render();
          break;
        case 'blue':
          sceneColors = setSceneColors('blue');
          scene.clearColor = sceneColors.backgroundColor;
          scene.render();
          break;
      }
    };

    const colorGroup = new RadioGroup('Color scheme');
    colorGroup.addRadio('dark', setColor);
    colorGroup.addRadio('light', setColor);
    colorGroup.addRadio('blue', setColor);
    customizePanel.addGroup(colorGroup);

    // place holder
    const transformGroup = new RadioGroup('Point type');
    transformGroup.addRadio('Box');
    transformGroup.addRadio('Sphere');
    customizePanel.addGroup(transformGroup);

    let _menu = 0;
    const changeMenu = function () {
      if (_menu === 0) {
        _menu = 1;
        customizePanel.isVisible = true;
      } else if (_menu === 1) {
        button.background = 'transparent';
        customizePanel.isVisible = false;
        _menu = 0;
      }
      return _menu;
    };

    // make sure the menu is collapsed at the start
    const sceneInit = function () {
      customizePanel.isVisible = false;
    };

    sceneInit();

    const sliderPanel = new StackPanel();
    sliderPanel.width = 1;
    sliderPanel.height = 1;
    sliderPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    sliderPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    sliderPanel.background = sceneColors.backgroundColor.toHexString();
    sliderPanel.fontSize = 10;

    // add slider menu button
    const sliderButton = Button.CreateSimpleButton('button', 'Slide');
    sliderButton.background = '#FFFFFF55';

    // open and close panel menu on click
    sliderButton.onPointerUpObservable.add(() => {
      changeSliderMenu();
    });

    // add sliders
    addSlider2(
      model,
      'Point size',
      model.particleSize,
      0.5,
      10,
      0.5,
      sliderPanel,
      1
    );
    addSeparator(sliderPanel);
    addSlider2(
      model,
      'Shadow strength',
      model.edlStrength,
      0,
      20,
      1,
      sliderPanel,
      1
    );

    let _menu2 = 0;
    const changeSliderMenu = function () {
      if (_menu2 === 0) {
        _menu2 = 1;
        sliderPanel.isVisible = true;
      } else if (_menu2 === 1) {
        sliderPanel.isVisible = false;
        _menu2 = 0;
      }
      return _menu2;
    };

    //We run the sceneInit function on scene loading (somewhere near the end of the script)
    const sceneInit2 = function () {
      sliderPanel.isVisible = false;
    };

    grid.addControl(button, 0, 0);
    grid.addControl(customizePanel, 1, 0);
    grid.addControl(sliderButton, 0, 4);
    grid.addControl(sliderPanel, 1, 4);
    this.advancedDynamicTexture.addControl(grid);

    sceneInit2();
  }
}

const addSeparator = function (panel: StackPanel) {
  const rectangle = new Rectangle();
  rectangle.height = '15px';
  rectangle.thickness = 0;
  panel.addControl(rectangle);
  return panel;
};

const addSlider2 = function (
  arrayModel: ArrayModel,
  text: string,
  value: number,
  min: number,
  max: number,
  step: number,
  panel: StackPanel,
  fixedPoint: number
) {
  const header = new TextBlock();
  header.height = '30px';
  header.color = 'black';
  if (typeof value === 'string') {
    header.text = text + ': ' + value;
  } else {
    header.text = text + ': ' + value.toFixed(2);
  }
  header.outlineColor = 'black';
  header.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

  const slider = new Slider();
  slider.minimum = min;
  slider.maximum = max;
  slider.step = step;
  slider.height = '20px';
  slider.color = 'green';
  slider.background = 'white';
  slider.value = value;
  slider.onValueChangedObservable.add((value: any) => {
    header.text = text + ': ' + value.toFixed(2);
    if (text === 'Point size') {
      arrayModel.particleSize = value;
      //call arrayModel.loadSystem to update the particleSize of the SPS
      // or (this might be easier) use the scaling parameter to update the particles
      // particle.scaling = [scalingFactor,scalingFactor,scalingFactor]
    }
  });

  panel.addControl(header);
  panel.addControl(slider);

  return panel;
};

export default PointCloudGUI;
