import {
  PostProcess,
  RenderTargetTexture,
  Scene,
  Vector3
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Grid,
  RadioGroup,
  SelectionPanel,
  SliderGroup,
  TextBlock,
  TextWrapping
} from '@babylonjs/gui';
import ArrayModel from '../model/array-model';
import { updateSceneColors } from '../utils';

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
    postProcess: PostProcess,
    screenWidth: number | undefined,
    screenHeight: number | undefined,
    neighbours: number[],
    edlStrength: number,
    edlRadius: number,
    depthTex: RenderTargetTexture
  ) {
    this.advancedDynamicTexture.idealWidth = 800;
    this.advancedDynamicTexture.idealHeight = 900;
    this.advancedDynamicTexture.useSmallestIdeal = true;

    // set up GUI grid
    const grid = new Grid();
    grid.addColumnDefinition(200, true);
    grid.addColumnDefinition(1);
    grid.addRowDefinition(48, true);
    grid.addRowDefinition(1);

    // add button that expands panel
    const button = Button.CreateSimpleButton('button', 'Customize');
    button.fontFamily = 'Inter';
    button.fontSize = '10px';
    button.color = '#352F4D';
    button.background = '#F5F7FA';
    button.highlightColor = '#CC0055';
    button.fontWeight = 'bold';
    button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    button.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

    // expand and collapse the panel menu on click of button
    button.onPointerUpObservable.add(() => {
      changeMenu();
    });

    // add the customization panel
    const customizePanel = new SelectionPanel('customizeBox');
    customizePanel.width = 1;
    customizePanel.height = 1;
    customizePanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    customizePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    customizePanel.background = '#F5F7FA';
    customizePanel.fontSize = '8px';
    customizePanel.color = '#352F4D';
    customizePanel.barColor = '#352F4D';
    customizePanel.headerColor = '#352F4D';
    customizePanel.buttonColor = '#CC0055';
    customizePanel.buttonBackground = '#C7C7C7';
    customizePanel.labelColor = '#352F4D';

    // add color scheme radio buttons
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
    let darkOn = false;
    let lightOn = false;
    let blueOn = false;
    if (model.colorScheme === 'dark') {
      darkOn = true;
    }
    if (model.colorScheme === 'light') {
      lightOn = true;
    }
    if (model.colorScheme === 'blue') {
      blueOn = true;
    }
    colorGroup.addRadio('dark', setColor, darkOn);
    colorGroup.addRadio('light', setColor, lightOn);
    colorGroup.addRadio('blue', setColor, blueOn);
    customizePanel.addGroup(colorGroup);

    // add a point size slider
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
      'Scale factor',
      updatePointSize,
      '%',
      0,
      250,
      100,
      pointSizeValue
    );

    customizePanel.addGroup(pointSizeGroup);

    // add an EDL strength slider
    const updateEdlStrength = function (value: number) {
      postProcess.onApply = function (effect: any) {
        effect.setFloat('screenWidth', screenWidth);
        effect.setFloat('screenHeight', screenHeight);
        effect.setArray2('neighbours', neighbours);
        effect.setFloat('edlStrength', value);
        effect.setFloat('radius', edlRadius);
        effect.setTexture('uEDLDepth', depthTex);
      };
    };

    const edlStrengthValue = function (value: number) {
      return +value.toFixed(1);
    };

    const edlStrengthGroup = new SliderGroup('Eye Dome Lighting');
    edlStrengthGroup.addSlider(
      'Strength',
      updateEdlStrength,
      ' ',
      0,
      20,
      edlStrength,
      edlStrengthValue
    );

    customizePanel.addGroup(edlStrengthGroup);

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

    // to make sure the menu is collapsed at the start
    const sceneInit = function () {
      customizePanel.isVisible = false;
    };

    sceneInit();

    // add all components to the grid
    grid.addControl(button, 0, 0);
    grid.addControl(customizePanel, 1, 0);
    this.advancedDynamicTexture.addControl(grid);
  }

  createConfirmationDialog(
    scene: Scene,
    msg: string,
    titleText: string,
    callback: CallableFunction
  ) {
    const advancedDynamicTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      'CONFIRMATION_DIALOG',
      true,
      scene
    );

    const panel = new Grid();
    panel.background = '#f5f5f5';
    panel.width = '300px';
    panel.height = '200px';
    panel.setPadding('16px', '16px', '16px', '16px');
    advancedDynamicTexture.addControl(panel);

    if (advancedDynamicTexture.layer !== null) {
      advancedDynamicTexture.layer.layerMask = 0x10000000;
    }

    const button = Button.CreateSimpleButton('acceptButton', 'Clear cache');
    button.width = '120px';
    button.height = '36px';
    button.color = 'white';
    button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    button.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    button.left = 10;
    button.top = -8;
    button.background = '#0070f0';
    button.cornerRadius = 4;
    button.zIndex = 2;
    button.onPointerUpObservable.add(() => {
      callback();
      panel.dispose();
    });
    panel.addControl(button);

    const button2 = Button.CreateSimpleButton('cancelButton', 'Cancel');
    button2.width = '120px';
    button2.height = '36px';
    button2.color = '#333';
    button2.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    button2.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    button2.left = -10;
    button2.top = -8;
    button2.cornerRadius = 4;
    button2.zIndex = 2;
    button2.onPointerUpObservable.add(() => {
      panel.dispose();
    });
    panel.addControl(button2);

    const text = new TextBlock('dialogText');
    text.height = 1;
    text.color = 'black';
    text.textWrapping = TextWrapping.WordWrap;
    text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    text.text = msg;
    text.top = -10;
    panel.addControl(text);

    const title = new TextBlock('dialogTitle');
    title.height = 1;
    title.color = 'black';
    title.fontWeight = 'bold';
    title.fontSize = 18;
    title.textWrapping = TextWrapping.WordWrap;
    title.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    title.top = -50;
    title.text = titleText;
    panel.addControl(title);
  }
}

export default PointCloudGUI;
