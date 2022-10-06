import { Scene, Vector3 } from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Grid,
  RadioGroup,
  SelectionPanel,
  SliderGroup
} from '@babylonjs/gui';
import ArrayModel from '../model/array-model';
import {
  setSceneColors,
  TileDBPointCloudOptions,
  updateSceneColors
} from '../utils';

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

    console.log('scene');
    console.log(scene);
    console.log('model');
    console.log(model);
    console.log('options');
    console.log(options);
    console.log('gui');
    console.log(this.advancedDynamicTexture);

    const sceneColors = setSceneColors(options.colorScheme as string);

    // set up GUI grid
    const grid = new Grid();
    grid.addColumnDefinition(200, true);
    grid.addColumnDefinition(100, true);
    grid.addColumnDefinition(1);
    grid.addColumnDefinition(200, true);

    grid.addRowDefinition(48, true);
    grid.addRowDefinition(1);
    grid.addRowDefinition(48, true);

    // add button that expands panel
    const button = Button.CreateSimpleButton('button', 'Customize');
    button.fontSizeInPixels = 9;
    button.color = sceneColors.textColor;
    button.background = sceneColors.secondColor;
    //button.highlightColor = sceneColors.accentColor;
    //button.fontWeight = 'bold';
    button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    button.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

    // this expands and collpases the panel menu on click of button
    button.onPointerUpObservable.add(() => {
      changeMenu();
    });

    // this adds the customization panel
    const customizePanel = new SelectionPanel('customizeBox');
    customizePanel.width = 1;
    customizePanel.height = 1;
    customizePanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    customizePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    customizePanel.background = sceneColors.backgroundColor.toHexString();
    customizePanel.fontSizeInPixels = 8;
    customizePanel.color = sceneColors.textColor;
    customizePanel.barColor = sceneColors.accentColor;
    customizePanel.headerColor = sceneColors.textColor;
    customizePanel.buttonColor = sceneColors.accentColor;
    customizePanel.buttonBackground = sceneColors.secondColor;
    customizePanel.labelColor = sceneColors.textColor;

    // this adds color scheme radio buttons
    const setColor = (but: any) => {
      switch (but) {
        case 0:
          updateSceneColors(scene, 'dark');
          break;
        case 1:
          updateSceneColors(scene, 'light');
          break;
        case 2:
          updateSceneColors(scene, 'blue');
          break;
      }
    };
    const colorGroup = new RadioGroup('Color scheme');
    colorGroup.addRadio('dark', setColor);
    colorGroup.addRadio('light', setColor);
    colorGroup.addRadio('blue', setColor);
    customizePanel.addGroup(colorGroup);

    // this add a point size slider
    function updatePointSizes(scene: Scene, model: ArrayModel, value: number) {
      for (let c = 0; c < model.particleSystems.length; c++) {
        model.particleSystems[0].updateParticle = function (particle: any) {
          particle.scaling = new Vector3(value / 100, value / 100, value / 100);
          return particle.scaling;
        };
        scene.onBeforeRenderObservable.add(() => {
          model.particleSystems[0].setParticles();
        });
      }
    }

    const updatePointSize = function (value: number) {
      updatePointSizes(scene, model, value);
    };

    const pointSizeValue = function (value: number) {
      return +value.toFixed(0);
    };

    const pointSizeGroup = new SliderGroup('Point size');
    pointSizeGroup.addSlider(
      'Scale factor', //label
      updatePointSize, //func
      '%', //unit
      0, //min
      250, //max
      100.0, //value
      pointSizeValue //onValueChange
    );

    customizePanel.addGroup(pointSizeGroup);

    // turn EDL on/off
    // const toEDL = function (isChecked: boolean) {
    //   console.log('isChecked' + isChecked);
    //   if (isChecked) {
    //     options.edlStrength = 0;
    //     scene.render();
    //   }
    // };

    // const edlGroup = new CheckboxGroup('Eye Dome Lighting');
    // edlGroup.addCheckbox('Disable', toEDL);
    // customizePanel.addGroup(edlGroup);

    //const edlGroup = new RadioGroup('EDL');
    //edlGroup.addRadio('On', setEDL, true);
    //edlGroup.addRadio('Off', setEDL);

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

    // this makes sure the menu is collapsed at the start
    const sceneInit = function () {
      customizePanel.isVisible = false;
    };

    sceneInit();

    // this adds all components to the grid
    grid.addControl(button, 0, 0);
    grid.addControl(customizePanel, 1, 0);
    this.advancedDynamicTexture.addControl(grid);
  }
}

export default PointCloudGUI;
