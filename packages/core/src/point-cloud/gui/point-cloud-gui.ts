import { Scene } from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  CheckboxGroup,
  Grid,
  RadioGroup,
  SelectionPanel,
  StackPanel,
  Slider,
  Rectangle,
  TextBlock
} from '@babylonjs/gui';
import ArrayModel from '../model/array-model';

class PointCloudGUI {
  scene: Scene;
  advancedDynamicTexture: AdvancedDynamicTexture;

  constructor(scene: Scene) {
    this.scene = scene;
    this.advancedDynamicTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      'PC-UI',
      true,
      this.scene
    );
  }

  init(arrayModel: ArrayModel) {
    // TODO - check these values
    this.advancedDynamicTexture.idealWidth = 800;
    this.advancedDynamicTexture.idealHeight = 900;
    this.advancedDynamicTexture.useSmallestIdeal = true;

    // set up GUI grid
    const grid = new Grid();
    grid.addColumnDefinition(192, true);
    grid.addColumnDefinition(192, true);
    grid.addColumnDefinition(1);
    grid.addColumnDefinition(192, true);

    grid.addRowDefinition(64, true);
    grid.addRowDefinition(1);
    grid.addRowDefinition(80, true);

    this.advancedDynamicTexture.addControl(grid);

    // add hamburger button
    const button = Button.CreateSimpleButton('button', 'Customize');
    button.background = '#FFFFFF55';
    grid.addControl(button, 0, 0);

    // open and close panel menu on click
    button.onPointerUpObservable.add(() => {
      changeMenu();
    });

    const selectPanel = new SelectionPanel('selectBox');
    selectPanel.width = 1;
    selectPanel.height = 1;
    selectPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    selectPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    selectPanel.background = '#33804D55';
    grid.addControl(selectPanel, 1, 0);

    const transformGroup = new RadioGroup('Point type');
    transformGroup.addRadio('Box');
    transformGroup.addRadio('Sphere');

    const colorGroup = new CheckboxGroup('Color');
    colorGroup.addCheckbox('Blue');
    colorGroup.addCheckbox('Red');

    selectPanel.addGroup(transformGroup);
    selectPanel.addGroup(colorGroup);

    let _menu = 0;
    const changeMenu = function () {
      if (_menu === 0) {
        _menu = 1;
        selectPanel.isVisible = true;
      } else if (_menu === 1) {
        button.background = 'transparent';
        selectPanel.isVisible = false;
        _menu = 0;
      }
      return _menu;
    };

    // make sure the menu is collapsed at the start
    const sceneInit = function () {
      selectPanel.isVisible = false;
    };

    sceneInit();

    const sliderPanel = new StackPanel();
    sliderPanel.width = 1;
    sliderPanel.height = 1;
    sliderPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    sliderPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    sliderPanel.background = '#33804D55';
    sliderPanel.fontSize = 10;
    grid.addControl(sliderPanel, 1, 4);

    // add slider menu button
    const sliderButton = Button.CreateSimpleButton('button', 'Slide');
    sliderButton.background = '#FFFFFF55';
    grid.addControl(sliderButton, 0, 4);

    // open and close panel menu on click
    sliderButton.onPointerUpObservable.add(() => {
      changeSliderMenu();
    });

    // add sliders
    addSlider2(
      arrayModel,
      'Point size',
      arrayModel.particleSize,
      0.5,
      10,
      0.5,
      sliderPanel,
      1
    );
    addSeparator(sliderPanel);
    addSlider2(
      arrayModel,
      'Shadow strength',
      arrayModel.edlStrength,
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
