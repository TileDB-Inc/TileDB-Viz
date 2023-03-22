import { Scene } from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Grid,
  RadioGroup,
  SelectionPanel,
  SliderGroup,
  //StackPanel,
  TextBlock,
  TextWrapping
} from '@babylonjs/gui';
import ArrayModel from '../model/array-model';
import { setSceneColors, updateSceneColors } from './scene-colors';
import menuIcon from '../../assets/menu-48.png';

class PointCloudGUI {
  advancedDynamicTexture: AdvancedDynamicTexture;

  constructor(scene: Scene) {
    this.advancedDynamicTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      'PC-UI',
      true,
      scene
    );
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

  public async init(scene: Scene, model: ArrayModel) {
    let sceneColors = setSceneColors(model.colorScheme as string);

    const rightPanel = new Grid();
    rightPanel.width = '250px';
    rightPanel.setPadding('16px', '16px', '16px', '16px');
    rightPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    rightPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    rightPanel.addRowDefinition(1);
    if (model.useStreaming) {
      rightPanel.addRowDefinition(360, true);
    } else {
      rightPanel.addRowDefinition(160, true);
    }
    rightPanel.addRowDefinition(5, true);
    rightPanel.addRowDefinition(50, true);
    rightPanel.addRowDefinition(5, true);
    rightPanel.addRowDefinition(50, true);
    rightPanel.addRowDefinition(5, true);
    rightPanel.addRowDefinition(50, true);
    this.advancedDynamicTexture.addControl(rightPanel);

    function createButton(name: string, icon: string) {
      const button = Button.CreateImageOnlyButton(name, icon);
      button.width = '48px';
      button.height = '48px';
      button.background = 'transparent';
      button.thickness = 0;
      button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      button.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      return button;
    }

    const controlsButton = createButton('control button', menuIcon);

    const menuButton = createButton('menu button', menuIcon);

    const modelButton = createButton('menu button', menuIcon);

    rightPanel.addControl(controlsButton, 7, 0);
    rightPanel.addControl(menuButton, 5, 0);
    rightPanel.addControl(modelButton, 3, 0);

    // expand and collapse the panel menu on click of button
    let _menu = 0;
    const showControls = function () {
      if (_menu === 0) {
        _menu = 1;
        controls.isVisible = true;
      } else if (_menu === 1) {
        controls.isVisible = false;
        _menu = 0;
      }
      return _menu;
    };

    controlsButton.onPointerUpObservable.add(() => {
      showControls();
    });

    menuButton.onPointerUpObservable.add(() => {
      showControls();
    });

    modelButton.onPointerUpObservable.add(() => {
      showControls();
    });

    function setControlsColors(sceneColors: {
      backgroundColor: { toHexString: () => string };
      textColor: string;
      accentColor: string;
      secondColor: string;
    }) {
      controls.background = sceneColors.backgroundColor.toHexString();
      controls.color = sceneColors.textColor;
      controls.barColor = sceneColors.textColor;
      controls.headerColor = sceneColors.textColor;
      controls.buttonColor = sceneColors.accentColor;
      controls.buttonBackground = sceneColors.secondColor;
      controls.labelColor = sceneColors.textColor;
    }

    // add the control panel
    const controls = new SelectionPanel('controlPanel');
    controls.width = 1;
    controls.height = 1;
    controls.thickness = 0;
    controls.fontSize = 14;
    controls.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    controls.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    setControlsColors(sceneColors);
    rightPanel.addControl(controls, 1, 0);

    if (model.useStreaming) {
      // add streaming performance sliders
      const performanceGroup = new SliderGroup('Performance');

      const updatePointBudget = function (value: number) {
        model.pointBudget = value;
      };

      performanceGroup.addSlider(
        'Point budget',
        updatePointBudget,
        ' ',
        1_000_000,
        50_000_000,
        model.pointBudget,
        (value: number) => {
          return +value.toFixed(1);
        }
      );
      controls.addGroup(performanceGroup);
    }

    // add color scheme radio buttons
    enum ColorScheme {
      Dark = 0,
      Light = 1,
      Blue = 2
    }

    function setColors(colors: string) {
      updateSceneColors(scene, colors);
      sceneColors = setSceneColors(colors);
      setControlsColors(sceneColors);
    }

    const setColor = (but: ColorScheme) => {
      switch (but) {
        case ColorScheme.Dark:
          setColors('dark');
          break;
        case ColorScheme.Light:
          setColors('light');
          break;
        case ColorScheme.Blue:
          setColors('blue');
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
    controls.addGroup(colorGroup);

    // to make sure the menu is collapsed at the start
    const sceneInit = function () {
      controls.isVisible = false;
    };

    sceneInit();
  }
}

export default PointCloudGUI;
