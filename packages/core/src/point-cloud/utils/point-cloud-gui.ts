import {
  Scene,
  SceneLoader,
  Vector3,
  Space,
  ISceneLoaderAsyncResult,
  Tags,
  Plane
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
import { updateSceneColors } from './scene-colors';
import getTileDBClient from '../../utils/getTileDBClient';
import { CustomDepthTestMaterialPlugin } from '../materials/plugins/customDepthTestPlugin';
import { LinearDepthMaterialPlugin } from '../materials/plugins/linearDepthPlugin';
import menuIcon from '../../assets/menu.png';
import filesIcon from '../../assets/model.png';
import controlsIcon from '../../assets/controls.png';

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
    const backgroundColor = '#494949CC';
    const lightColor = '#FFF';
    const buttonColor = '#0077FF';

    const mainGrid = new Grid();
    mainGrid.setPadding('16px', '16px', '16px', '16px');
    mainGrid.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    mainGrid.addColumnDefinition(1);
    mainGrid.addColumnDefinition(250, true);
    mainGrid.addColumnDefinition(64, true);
    mainGrid.addColumnDefinition(6, true);
    mainGrid.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    mainGrid.addRowDefinition(1);
    mainGrid.color = '#FFF';
    mainGrid.fontSize = 14;

    this.advancedDynamicTexture.addControl(mainGrid);

    // add buttons
    const buttonGrid = new Grid('buttonGrid');
    buttonGrid.addRowDefinition(1);
    buttonGrid.addRowDefinition(64, true);
    buttonGrid.addRowDefinition(64, true);
    buttonGrid.addRowDefinition(64, true);
    buttonGrid.width = 1;

    mainGrid.addControl(buttonGrid, 1, 2);

    function createButton(name: string, icon: string) {
      const button = Button.CreateImageOnlyButton(name, icon);
      button.width = '64px';
      button.height = '64px';
      button.background = 'transparent';
      button.thickness = 0;
      button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      button.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
      return button;
    }

    const controlsButton = createButton('control button', controlsIcon);
    const menuButton = createButton('menu button', menuIcon);
    const filesButton = createButton('menu button', filesIcon);

    buttonGrid.addControl(controlsButton, 3, 0);
    buttonGrid.addControl(menuButton, 2, 0);
    buttonGrid.addControl(filesButton, 1, 0);

    // expand and collapse the menus on click of buttons
    let _controls = 0;
    let _menu = 0;
    let _files = 0;

    const showControls = function () {
      if (_controls === 0) {
        _controls = 1;
        _menu = 0;
        _files = 0;
        controlsPanel.isVisible = true;
        menuPanel.isVisible = false;
        filesPanel.isVisible = false;
      } else if (_controls === 1) {
        controlsPanel.isVisible = false;
        menuPanel.isVisible = false;
        filesPanel.isVisible = false;
        _controls = 0;
        _menu = 0;
        _files = 0;
      }
      return _controls;
    };

    const showMenu = function () {
      if (_menu === 0) {
        _menu = 1;
        _controls = 0;
        _files = 0;
        menuPanel.isVisible = true;
        controlsPanel.isVisible = false;
        filesPanel.isVisible = false;
      } else if (_menu === 1) {
        menuPanel.isVisible = false;
        controlsPanel.isVisible = false;
        filesPanel.isVisible = false;
        _menu = 0;
        _controls = 0;
        _files = 0;
      }
      return _menu;
    };

    const showFiles = function () {
      if (_files === 0) {
        _files = 1;
        _controls = 0;
        _menu = 0;
        filesPanel.isVisible = true;
        controlsPanel.isVisible = false;
        menuPanel.isVisible = false;
      } else if (_files === 1) {
        filesPanel.isVisible = false;
        controlsPanel.isVisible = false;
        menuPanel.isVisible = false;
        _files = 0;
        _controls = 0;
        _menu = 0;
      }
      return _files;
    };

    controlsButton.onPointerUpObservable.add(() => {
      showControls();
    });

    menuButton.onPointerUpObservable.add(() => {
      showMenu();
    });

    filesButton.onPointerUpObservable.add(() => {
      showFiles();
    });

    // add the controls panel
    const controlsPanel = new StackPanel('controlsPanel');
    controlsPanel.height = 1;
    controlsPanel.background = backgroundColor;
    controlsPanel.setPaddingInPixels(12, 12, 12, 12);
    controlsPanel.descendantsOnlyPadding = true;
    controlsPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    controlsPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    controlsPanel.isVisible = false;
    mainGrid.addControl(controlsPanel, 4, 1);

    const shortcutsTitle = new TextBlock('inputLabel', 'Shortcuts');
    shortcutsTitle.fontSize = 18;
    shortcutsTitle.height = '50px';
    shortcutsTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(shortcutsTitle);

    const cShortcut = new TextBlock('inputLabel', 'c: toggle between cameras');
    cShortcut.height = '25px';
    cShortcut.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(cShortcut);

    const bShortcut = new TextBlock('inputLabel', 'b: background color');
    bShortcut.height = '25px';
    bShortcut.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(bShortcut);

    const arcRotateTitle = new TextBlock('inputLabel', 'arcRotate camera:');
    arcRotateTitle.fontSize = 18;
    arcRotateTitle.height = '50px';
    arcRotateTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(arcRotateTitle);

    const zShortcut = new TextBlock(
      'inputLabel',
      'scroll wheel: zoom in and out'
    );
    zShortcut.height = '25px';
    zShortcut.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(zShortcut);

    const rShortcut = new TextBlock(
      'inputLabel',
      'drag mouse with left button: rotate'
    );
    rShortcut.height = '25px';
    rShortcut.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(rShortcut);

    const vShortcut = new TextBlock(
      'inputLabel',
      'v: toggle between camera locations'
    );
    vShortcut.height = '25px';
    vShortcut.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(vShortcut);

    const freeTitle = new TextBlock('inputLabel', 'free camera:');
    freeTitle.fontSize = 18;
    freeTitle.height = '50px';
    freeTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(freeTitle);

    const rrShortcut = new TextBlock(
      'inputLabel',
      'drag mouse with left button: rotate'
    );
    rrShortcut.height = '25px';
    rrShortcut.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(rrShortcut);

    const wShortcut = new TextBlock('inputLabel', 'w or up: move forward');
    wShortcut.height = '25px';
    wShortcut.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(wShortcut);

    const sShortcut = new TextBlock('inputLabel', 's or down: move backward');
    sShortcut.height = '25px';
    sShortcut.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(sShortcut);

    const eShortcut = new TextBlock('inputLabel', 'e: move up');
    eShortcut.height = '25px';
    eShortcut.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(eShortcut);

    const qShortcut = new TextBlock('inputLabel', 'q: move down');
    qShortcut.height = '25px';
    qShortcut.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(qShortcut);

    const aShortcut = new TextBlock('inputLabel', 'a: move to the left');
    aShortcut.height = '25px';
    aShortcut.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(aShortcut);

    const dShortcut = new TextBlock('inputLabel', 'd: move to the right');
    dShortcut.height = '25px';
    dShortcut.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsPanel.addControl(dShortcut);

    // add the menu panel
    const menuPanel = new SelectionPanel('menuPanel');
    menuPanel.thickness = 0;
    menuPanel.background = backgroundColor;
    menuPanel.color = lightColor;
    menuPanel.barColor = lightColor;
    menuPanel.headerColor = lightColor;
    menuPanel.buttonColor = buttonColor;
    menuPanel.buttonBackground = lightColor;
    menuPanel.labelColor = lightColor;
    menuPanel.setPaddingInPixels(12, 12, 12, 12);
    menuPanel.descendantsOnlyPadding = true;
    menuPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    menuPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    menuPanel.isVisible = false;
    mainGrid.addControl(menuPanel, 4, 1);

    if (model.useStreaming) {
      // add streaming performance sliders
      const performanceGroup = new SliderGroup('Performance');

      const updatePointBudget = function (value: number) {
        model.pointBudget = Math.trunc(value * 4900000 + 100000);
      };

      performanceGroup.addSlider(
        'Point budget',
        updatePointBudget,
        ' ',
        0,
        1,
        (model.pointBudget - 100000) / 4900000,
        (value: number) => {
          return +Math.trunc(value * 4900000 + 100000).toFixed(1);
        }
      );
      menuPanel.addGroup(performanceGroup);
    }

    // add color scheme radio buttons
    enum ColorScheme {
      Dark = 0,
      Light = 1,
      Blue = 2
    }

    function setColors(colors: string) {
      updateSceneColors(scene, colors);
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
    menuPanel.addGroup(colorGroup);

    // add the clipping planes sliders
    const clippingPlanesGroup = new SliderGroup('Clipping Planes');
    clippingPlanesGroup.addSlider(
      'Plane X-Min',
      (value: number) => {
        scene.clipPlane = new Plane(
          1,
          0,
          0,
          (value / 100) *
            (model.octree.maxPoint.x - model.octree.minPoint.x + 2) +
            model.octree.minPoint.x -
            1
        );
      },
      '',
      0,
      100,
      0,
      (value: number) => {
        return +(
          (value / 100) *
            (model.octree.maxPoint.x - model.octree.minPoint.x + 2) +
          model.octree.minPoint.x -
          1
        ).toFixed(1);
      }
    );

    clippingPlanesGroup.addSlider(
      'Plane X-Max',
      (value: number) => {
        scene.clipPlane2 = new Plane(
          -1,
          0,
          0,
          -(
            (value / 100) *
              (model.octree.maxPoint.x - model.octree.minPoint.x + 2) +
            model.octree.minPoint.x -
            1
          )
        );
      },
      '',
      0,
      100,
      100,
      (value: number) => {
        return +(
          (value / 100) *
            (model.octree.maxPoint.x - model.octree.minPoint.x + 2) +
          model.octree.minPoint.x -
          1
        ).toFixed(1);
      }
    );

    clippingPlanesGroup.addSlider(
      'Plane Y-Min',
      (value: number) => {
        scene.clipPlane3 = new Plane(
          0,
          -1,
          0,
          (value / 100) *
            (model.octree.maxPoint.y - model.octree.minPoint.y + 2) +
            model.octree.minPoint.y -
            1
        );
      },
      '',
      0,
      100,
      0,
      (value: number) => {
        return +(
          (value / 100) *
            (model.octree.maxPoint.y - model.octree.minPoint.y + 2) +
          model.octree.minPoint.y -
          1
        ).toFixed(1);
      }
    );

    clippingPlanesGroup.addSlider(
      'Plane Y-Max',
      (value: number) => {
        scene.clipPlane4 = new Plane(
          0,
          1,
          0,
          -(
            (value / 100) *
              (model.octree.maxPoint.y - model.octree.minPoint.y + 2) +
            model.octree.minPoint.y -
            1
          )
        );
      },
      '',
      0,
      100,
      100,
      (value: number) => {
        return +(
          (value / 100) *
            (model.octree.maxPoint.y - model.octree.minPoint.y + 2) +
          model.octree.minPoint.y -
          1
        ).toFixed(1);
      }
    );

    clippingPlanesGroup.addSlider(
      'Plane Z-Min',
      (value: number) => {
        scene.clipPlane5 = new Plane(
          0,
          0,
          1,
          (value / 100) *
            (model.octree.maxPoint.z - model.octree.minPoint.z + 2) +
            model.octree.minPoint.z -
            1
        );
      },
      '',
      0,
      100,
      0,
      (value: number) => {
        return +(
          (value / 100) *
            (model.octree.maxPoint.z - model.octree.minPoint.z + 2) +
          model.octree.minPoint.z -
          1
        ).toFixed(1);
      }
    );

    clippingPlanesGroup.addSlider(
      'Plane Z-Max',
      (value: number) => {
        scene.clipPlane6 = new Plane(
          0,
          0,
          -1,
          -(
            (value / 100) *
              (model.octree.maxPoint.z - model.octree.minPoint.z + 2) +
            model.octree.minPoint.z -
            1
          )
        );
      },
      '',
      0,
      100,
      100,
      (value: number) => {
        return +(
          (value / 100) *
            (model.octree.maxPoint.z - model.octree.minPoint.z + 2) +
          model.octree.minPoint.z -
          1
        ).toFixed(1);
      }
    );

    menuPanel.addGroup(clippingPlanesGroup);

    // add the model files panel
    const filesPanel = new StackPanel('filesPanel');
    filesPanel.width = 1;
    filesPanel.height = 1;
    filesPanel.background = backgroundColor;
    filesPanel.setPaddingInPixels(12, 12, 12, 12);
    filesPanel.descendantsOnlyPadding = true;
    filesPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    filesPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    filesPanel.isVisible = false;
    mainGrid.addControl(filesPanel, 4, 1);

    const namespaceLabel = new TextBlock('inputLabel', 'Namespace');
    namespaceLabel.width = 1;
    namespaceLabel.height = '30px';
    namespaceLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    filesPanel.addControl(namespaceLabel);

    const namespaceInput = new InputText('namespaceInput');
    namespaceInput.height = '30px';
    namespaceInput.color = lightColor;
    namespaceInput.text = 'TileDB-Inc';
    namespaceInput.placeholderText = 'Namespace';
    namespaceInput.width = 1;
    filesPanel.addControl(namespaceInput);

    const fileLabel = new TextBlock('fileLabel', 'File');
    fileLabel.width = 1;
    fileLabel.height = '30px';
    fileLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    filesPanel.addControl(fileLabel);

    const fileInput = new InputText('fileInput');
    fileInput.height = '30px';
    fileInput.color = lightColor;
    fileInput.text = 'dragon.glb';
    fileInput.placeholderText = 'File';
    fileInput.width = 1;
    filesPanel.addControl(fileInput);

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
    positionXLabel.height = '30px';
    positionXLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    const positionYLabel = new TextBlock('positionYLabel', 'Translation Y');
    positionYLabel.width = 1;
    positionYLabel.height = '30px';
    positionYLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    const positionZLabel = new TextBlock('positionZLabel', 'Translation Z');
    positionZLabel.width = 1;
    positionZLabel.height = '30px';
    positionZLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    const scaleLabel = new TextBlock('scaleLabel', 'Scale');
    scaleLabel.width = 1;
    scaleLabel.height = '30px';
    scaleLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    positionGrid.addControl(positionXLabel, 0, 0);
    positionGrid.addControl(positionYLabel, 1, 0);
    positionGrid.addControl(positionZLabel, 2, 0);
    positionGrid.addControl(scaleLabel, 3, 0);

    const positionXInput = new InputText('positionXInput');
    positionXInput.height = 1;
    positionXInput.color = lightColor;
    positionXInput.text = '0.000';
    positionXInput.placeholderText = 'Translation X';
    positionXInput.width = 1;

    const positionYInput = new InputText('positionYInput');
    positionYInput.height = 1;
    positionYInput.color = lightColor;
    positionYInput.text = '0.000';
    positionYInput.placeholderText = 'Translation Y';
    positionYInput.width = 1;

    const positionZInput = new InputText('positionZInput');
    positionZInput.height = 1;
    positionZInput.color = lightColor;
    positionZInput.text = '0.000';
    positionZInput.placeholderText = 'Translation Z';
    positionZInput.width = 1;

    const scaleInput = new InputText('scaleInput');
    scaleInput.height = 1;
    scaleInput.color = lightColor;
    scaleInput.text = '1.000';
    scaleInput.placeholderText = 'Scale';
    scaleInput.width = 1;

    positionGrid.addControl(positionXInput, 0, 1);
    positionGrid.addControl(positionYInput, 1, 1);
    positionGrid.addControl(positionZInput, 2, 1);
    positionGrid.addControl(scaleInput, 3, 1);

    filesPanel.addControl(positionGrid);

    const loadButton = Button.CreateSimpleButton('loadButton', 'Load Model');
    loadButton.width = 1;
    loadButton.height = '30px';
    loadButton.background = buttonColor;

    loadButton.onPointerUpObservable.add(() => {
      const config: Record<string, string> = {};
      config.apiKey = model.token as string;

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

            for (const mesh of result.meshes) {
              if (mesh.material) {
                const depthMaterial: any = mesh.material.clone('DepthMaterial');
                if (!depthMaterial) {
                  throw new Error('Imported mesh material is null');
                }

                depthMaterial.lineraDepthMaterialPlugin =
                  new LinearDepthMaterialPlugin(depthMaterial);
                depthMaterial.lineraDepthMaterialPlugin.isEnabled = true;

                if (!model.renderTargets[2].renderList) {
                  throw new Error('Render target 2 is uninitialized');
                }

                model.renderTargets[2].renderList.push(mesh);
                model.renderTargets[2].setMaterialForRendering(
                  mesh,
                  depthMaterial
                );

                const defaultMaterial: any =
                  mesh.material.clone('defaultMaterial');
                if (!defaultMaterial) {
                  throw new Error('Imported mesh material is null');
                }
                defaultMaterial.customDepthTestMaterialPlugin =
                  new CustomDepthTestMaterialPlugin(defaultMaterial);
                defaultMaterial.customDepthTestMaterialPlugin.isEnabled = true;
                defaultMaterial.customDepthTestMaterialPlugin.linearDepthTexture =
                  model.renderTargets[0];

                if (!model.renderTargets[1].renderList) {
                  throw new Error('Render target 1 is uninitialized');
                }
                model.renderTargets[1].renderList.push(mesh);
                model.renderTargets[1].setMaterialForRendering(
                  mesh,
                  defaultMaterial
                );

                Tags.AddTagsTo(mesh, 'Imported');
              }
            }
          });
        });
    });

    filesPanel.addControl(loadButton);
  }
}

export default PointCloudGUI;
