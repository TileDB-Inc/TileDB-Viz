import {
  Scene,
  SceneLoader,
  Vector3,
  Space,
  ISceneLoaderAsyncResult
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Grid,
  RadioGroup,
  SelectionPanel,
  SliderGroup,
  StackPanel,
  TextBlock,
  TextWrapping,
  InputText
} from '@babylonjs/gui';
import ArrayModel from '../model/array-model';
import { setSceneColors, updateSceneColors } from './scene-colors';
import getTileDBClient from '../../utils/getTileDBClient';

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

    const leftPanel = new Grid();
    leftPanel.width = '300px';
    leftPanel.setPadding('16px', '16px', '16px', '16px');
    leftPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    leftPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    leftPanel.addRowDefinition(50, true);
    leftPanel.addRowDefinition(5, true);
    leftPanel.addRowDefinition(500, true);
    this.advancedDynamicTexture.addControl(leftPanel);

    const fileButton = Button.CreateImageOnlyButton(
      'button',
      'https://tiledb-viz-demos.s3.amazonaws.com/menu-48.png'
    );
    fileButton.width = '48px';
    fileButton.height = '48px';
    fileButton.background = 'transparent';
    fileButton.thickness = 0;
    fileButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    fileButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    leftPanel.addControl(fileButton, 0, 0);

    let _filemenu = 0;
    const showFileControls = function () {
      if (_filemenu === 0) {
        _filemenu = 1;
        fileStackPanel.isVisible = true;
      } else if (_filemenu === 1) {
        fileStackPanel.isVisible = false;
        _filemenu = 0;
      }
      return _filemenu;
    };

    fileButton.onPointerUpObservable.add(() => {
      showFileControls();
    });

    const fileStackPanel = new StackPanel('stackPanel');
    fileStackPanel.width = 1;
    fileStackPanel.height = '500px';
    fileStackPanel.background = 'rgba(0,0,0,0.8)';
    fileStackPanel.setPaddingInPixels(12, 12, 12, 12);
    fileStackPanel.descendantsOnlyPadding = true;
    fileStackPanel.isVisible = false;
    leftPanel.addControl(fileStackPanel, 2, 0);

    const namespaceLabel = new TextBlock('inputLabel', 'Namespace');
    namespaceLabel.width = 1;
    namespaceLabel.color = 'white';
    namespaceLabel.height = '30px';
    namespaceLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    fileStackPanel.addControl(namespaceLabel);

    const namespaceInput = new InputText('namespaceInput');
    namespaceInput.height = '40px';
    namespaceInput.color = 'white';
    namespaceInput.text = 'TileDB-Inc';
    namespaceInput.placeholderText = 'Namespace';
    namespaceInput.width = 1;

    fileStackPanel.addControl(namespaceInput);

    const fileLabel = new TextBlock('fileLabel', 'File');
    fileLabel.width = 1;
    fileLabel.color = 'white';
    fileLabel.height = '30px';
    fileLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    fileStackPanel.addControl(fileLabel);

    const fileInput = new InputText('fileInput');
    fileInput.height = '40px';
    fileInput.color = 'white';
    fileInput.text = 'dragon.glb';
    fileInput.placeholderText = 'File';
    fileInput.width = 1;

    fileStackPanel.addControl(fileInput);

    const positionGrid = new Grid('positionGrid');
    positionGrid.addColumnDefinition(0.5, false);
    positionGrid.addColumnDefinition(0.5, false);
    positionGrid.addRowDefinition(40, true);
    positionGrid.addRowDefinition(40, true);
    positionGrid.addRowDefinition(40, true);
    positionGrid.addRowDefinition(40, true);
    positionGrid.width = 1;
    positionGrid.setPaddingInPixels(4, 0, 4, 0);
    positionGrid.descendantsOnlyPadding = true;
    positionGrid.height = '190px';

    const positionXLabel = new TextBlock('positionXLabel', 'Translation X');
    positionXLabel.width = 1;
    positionXLabel.color = 'white';
    positionXLabel.height = '30px';
    positionXLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    const positionYLabel = new TextBlock('positionYLabel', 'Translation Y');
    positionYLabel.width = 1;
    positionYLabel.color = 'white';
    positionYLabel.height = '30px';
    positionYLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    const positionZLabel = new TextBlock('positionZLabel', 'Translation Z');
    positionZLabel.width = 1;
    positionZLabel.color = 'white';
    positionZLabel.height = '30px';
    positionZLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    const scaleLabel = new TextBlock('scaleLabel', 'Scale');
    scaleLabel.width = 1;
    scaleLabel.color = 'white';
    scaleLabel.height = '30px';
    scaleLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    positionGrid.addControl(positionXLabel, 0, 0);
    positionGrid.addControl(positionYLabel, 1, 0);
    positionGrid.addControl(positionZLabel, 2, 0);
    positionGrid.addControl(scaleLabel, 3, 0);

    const positionXInput = new InputText('positionXInput');
    positionXInput.height = 1;
    positionXInput.color = 'white';
    positionXInput.text = '0.000';
    positionXInput.placeholderText = 'Translation X';
    positionXInput.width = 1;

    const positionYInput = new InputText('positionYInput');
    positionYInput.height = 1;
    positionYInput.color = 'white';
    positionYInput.text = '0.000';
    positionYInput.placeholderText = 'Translation Y';
    positionYInput.width = 1;

    const positionZInput = new InputText('positionZInput');
    positionZInput.height = 1;
    positionZInput.color = 'white';
    positionZInput.text = '0.000';
    positionZInput.placeholderText = 'Translation Z';
    positionZInput.width = 1;

    const scaleInput = new InputText('scaleInput');
    scaleInput.height = 1;
    scaleInput.color = 'white';
    scaleInput.text = '1.000';
    scaleInput.placeholderText = 'Scale';
    scaleInput.width = 1;

    positionGrid.addControl(positionXInput, 0, 1);
    positionGrid.addControl(positionYInput, 1, 1);
    positionGrid.addControl(positionZInput, 2, 1);
    positionGrid.addControl(scaleInput, 3, 1);

    fileStackPanel.addControl(positionGrid);

    const loadButton = Button.CreateSimpleButton('loadButton', 'Load Model');
    loadButton.width = 1;
    loadButton.height = '40px';
    loadButton.background = 'rgb(120, 150, 30)';

    loadButton.onPointerUpObservable.add(() => {
      const config: Record<string, string> = {};
      config.apiKey = process.env.STORYBOOK_REST_TOKEN as string;

      const client = getTileDBClient(config);

      client
        .getFileContents(namespaceInput.text, fileInput.text)
        .then((response: { buffer: ArrayBuffer; originalFileName: string }) => {
          const filetype = '.' + response.originalFileName.split('.').pop();

          SceneLoader.ImportMeshAsync(
            '',
            '',
            new File(
              [response.buffer.slice(0, response.buffer.byteLength - 1)],
              response.originalFileName
            ),
            scene,
            null,
            filetype
          ).then((result: ISceneLoaderAsyncResult) => {
            const x = parseFloat(positionXInput.text.replace('.', ','));
            const y = parseFloat(positionYInput.text.replace('.', ','));
            const z = parseFloat(positionZInput.text.replace('.', ','));

            const scale = parseFloat(scaleInput.text.replace('.', ','));

            result.meshes[0].scaling = new Vector3(scale, scale, scale);
            result.meshes[0].translate(new Vector3(x, y, z), 1, Space.WORLD);
          });
        });
    });

    fileStackPanel.addControl(loadButton);

    ////------------------------------------------------------------

    const rightPanel = new Grid();
    rightPanel.width = '250px';
    rightPanel.setPadding('16px', '16px', '16px', '16px');
    rightPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    rightPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    rightPanel.addRowDefinition(50, true);
    rightPanel.addRowDefinition(5, true);
    rightPanel.addRowDefinition(500, true);
    this.advancedDynamicTexture.addControl(rightPanel);

    const button = Button.CreateImageOnlyButton(
      'button',
      'https://tiledb-viz-demos.s3.amazonaws.com/menu-48.png'
    );
    button.width = '48px';
    button.height = '48px';
    button.background = 'transparent';
    button.thickness = 0;
    button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    button.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

    rightPanel.addControl(button, 0, 0);

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

    button.onPointerUpObservable.add(() => {
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
    controls.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    setControlsColors(sceneColors);
    rightPanel.addControl(controls, 2, 0);

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

      const updateFanOut = function (value: number) {
        model.fanOut = value;
      };

      performanceGroup.addSlider(
        'Fan out',
        updateFanOut,
        ' ',
        1,
        100,
        model.fanOut,
        (value: number) => {
          return +value.toFixed(1);
        }
      );

      const updateBlocks = function (value: number) {
        model.maxNumCacheBlocks = value;
      };

      performanceGroup.addSlider(
        'Max cached blocks',
        updateBlocks,
        ' ',
        20,
        500,
        model.maxNumCacheBlocks,
        (value: number) => {
          return +value.toFixed(0);
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
