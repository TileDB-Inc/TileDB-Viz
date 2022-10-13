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
  //setSceneColors,
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
    this.advancedDynamicTexture.idealWidth = 800;
    this.advancedDynamicTexture.idealHeight = 900;
    this.advancedDynamicTexture.useSmallestIdeal = true;

    //const sceneColors = setSceneColors(options.colorScheme as string);

    // set up GUI grid
    const grid = new Grid();
    grid.addColumnDefinition(200, true);
    grid.addColumnDefinition(100, true);
    grid.addColumnDefinition(1);
    grid.addColumnDefinition(200, true);

    grid.addRowDefinition(48, true);
    grid.addRowDefinition(1);
    grid.addRowDefinition(48, true);

    //grid.fontFamily = 'Inter';
    //grid.fontStyle = 'Inter';
    grid.fontSizeInPixels = 2;
    //grid.color = '#CC0055'; // text color of button
    //grid.background = '#001F75'; // don't use as will color all of canvas

    // add button that expands panel
    const button = Button.CreateSimpleButton('button', 'Customize');
    button.fontFamily = 'Inter';
    button.fontSizeInPixels = 6;
    button.color = '#CC0055';
    button.background = '#E5FBFF';
    //button.highlightColor = sceneColors.accentColor;
    button.fontWeight = 'bold';
    button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    button.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

    // this expands and collapses the panel menu on click of button
    button.onPointerUpObservable.add(() => {
      changeMenu();
    });

    // this adds the customization panel
    const customizePanel = new SelectionPanel('customizeBox');
    customizePanel.width = 1;
    customizePanel.height = 1;
    customizePanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    customizePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    customizePanel.background = '#E5FBFF';
    //customizePanel.fontSizeInPixels = 6;
    //customizePanel.color = '#E5FBFF';
    //customizePanel.shadowColor = sceneColors.backgroundColor.toHexString();
    customizePanel.barColor = '#CC0055';
    customizePanel.headerColor = '##E5FBFF';
    customizePanel.buttonColor = '#CC0055';
    //customizePanel.buttonBackground = sceneColors.secondColor;
    customizePanel.labelColor = '#E5FBFF';
    //customizePanel.renderToIntermediateTexture = false;

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

    // this adds a point size slider
    function updatePointSizes(scene: Scene, model: ArrayModel, value: number) {
      scene.onBeforeRenderObservable.addOnce(() => {
        for (let c = 0; c < model.particleSystems.length; c++) {
          model.particleSystems[c].updateParticle = function (particle: any) {
            particle.scaling = new Vector3(
              value / 100,
              value / 100,
              value / 100
            );
            return particle.scaling;
          };
          model.particleSystems[c].setParticles();
        }
      });
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
      100, //value
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
    //const transformGroup = new RadioGroup('Point type');
    //transformGroup.addRadio('Box');
    //transformGroup.addRadio('Sphere');
    //customizePanel.addGroup(transformGroup);

    let _menu = 0;
    const changeMenu = function () {
      if (_menu === 0) {
        _menu = 1;
        customizePanel.isVisible = true;
      } else if (_menu === 1) {
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
