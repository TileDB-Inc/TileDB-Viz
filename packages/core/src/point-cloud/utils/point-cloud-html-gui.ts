import {
  Scene,
  SceneLoader,
  Vector3,
  ISceneLoaderAsyncResult,
  Tags,
  Plane,
  ShaderMaterial
} from '@babylonjs/core';
import ArrayModel from '../model/array-model';
import { updateSceneColors } from './scene-colors';
import getTileDBClient from '../../utils/getTileDBClient';

const stylesString = `
.tdb-button {
  width: 4em;
  height: 4em;
  border-radius: 50%;
  border: none;
  background-position: center;
  background-size: cover;
  background-color: transparent;
  position: absolute;
  bottom: 2.5em;
  right: 1.25em;
}

.tdb-button:hover {
  cursor: pointer;
}

.tdb-panel {
  background-color: #494949CC;
  position: absolute;
  bottom: 2.5em;
  right: 5.625em;
  width: 18.75em;
  height: 80vh; 
  display: none;
  padding: 1em;
  border-radius: 0.5em;
  overflow: auto;
  font-family: Inter, sans-serif;
}

.tdb-show {
  display: block;
}

.tdb-input-wrapper {
  color: #fff;
  font-size: 12px;
  position: relative;
}

.tdb-input {
  color: #fff;
  margin-bottom: 1em;
  margin-right: 0.25em;
  font-size: 0.75em;
}

.tdb-input--full {
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  height: 30px;
  padding: 0 12px;
  width: 100%;
  box-sizing: border-box;
  margin: 4px 0 8px;
}

.tdb-input h3 {
  font-size: 1em;
  height: 1em;
}

.tdb-input label {
  width: 100%;
  height: 1.75em;
}

.tdb-input input {
  width: 100%;
  height: 1.75em;
  border-radius: 0.25em; 
}

.tdb-slider {
  width: 100%;
  height: 1.75em;
  border-radius: 0.25em; 
  background: #FFF;
  outline: none;
  opacity: 1.0;
}

.tdb-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.tdb-radio-label {
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 0.5em;
  font-size: 1em;
}

.tdb-radio-label input {
  margin: 0 0.5em 0 0;
  height: 1.125em;
  width: 1.125em;
}

.tdb-fieldset {
  border: none;
}

.tdb-model-button {
  background-color: #0077FF;
  border: none;
  border-radius: 6px;
  color: #fff;
  padding: 12px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;
  cursor: pointer;
  width: 100%;
  margin-top: 8px;
}

.tdb-modal {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: auto;
  max-width: 200px;
  background-color: #fff;
  height: 155px;
  padding: 10px;
  border-radius: 6px;
  text-align: center;
  font-family: Arial, sans-serif;
}
.tdb-modal__buttons {
  display: flex;
  gap: 10px;
}

.tdb-modal__button {
  border-radius: 6px;
  border: 1px solid #333;
  padding: 12px;
  flex-basis: 50%;
  background-color: transparent;
  white-space: nowrap;
}

.tdb-modal__button:hover {
  cursor: pointer;
}

.tdb-modal__button--active {
  background-color: #0070f0;
  border: none;
  color: #fff;
}
`;

const styleElement = document.createElement('style');
styleElement.textContent = stylesString;
document.head.appendChild(styleElement);

interface HtmlClass {
  content: HTMLElement;
}

class PointCloudGUI {
  rootDiv: HTMLDivElement;
  menuPanel?: HTMLElement;
  modelPanel?: HTMLElement;
  controlsPanel?: HTMLElement;
  scene: Scene;
  model: ArrayModel;
  depthMaterial: ShaderMaterial;

  constructor(scene: Scene, model: ArrayModel, depthMaterial: ShaderMaterial) {
    this.scene = scene;
    this.model = model;
    this.depthMaterial = depthMaterial;
    this.rootDiv = document.getElementById('tdb-viz-wrapper') as HTMLDivElement;

    const menuButton = this.createButton();
    menuButton.style.bottom = '10.5em';
    menuButton.style.backgroundImage =
      'url("https://tiledb-viz-demos.s3.amazonaws.com/menu.png")';
    menuButton.onclick = () => {
      this.modelPanel?.classList.remove('tdb-show');
      this.controlsPanel?.classList.remove('tdb-show');
      this.menuPanel?.classList.toggle('tdb-show');
    };

    const modelButton = this.createButton();
    modelButton.style.bottom = '6.5em';
    modelButton.style.backgroundImage =
      'url("https://tiledb-viz-demos.s3.amazonaws.com/model.png")';
    modelButton.onclick = () => {
      this.menuPanel?.classList.remove('tdb-show');
      this.controlsPanel?.classList.remove('tdb-show');
      this.modelPanel?.classList.toggle('tdb-show');
    };

    const controlsButton = this.createButton();
    controlsButton.style.backgroundImage =
      'url("https://tiledb-viz-demos.s3.amazonaws.com/controls.png")';
    controlsButton.onclick = () => {
      this.modelPanel?.classList.remove('tdb-show');
      this.menuPanel?.classList.remove('tdb-show');
      this.controlsPanel?.classList.toggle('tdb-show');
    };

    this.createMenuPanel('menuPanel');
    this.createModelPanel('modelPanel');
    this.createControlsPanel('controlsPanel');
  }

  createButton() {
    const button = document.createElement('button');
    button.classList.add('tdb-button');

    this.rootDiv.appendChild(button);

    return button;
  }

  createMenuPanel(id: string) {
    const menuPanel = new Panel(this.rootDiv);
    menuPanel.content.id = id;
    this.menuPanel = menuPanel.content;

    const child = new MenuInput(this.scene, this.model);
    menuPanel.addContent(child);
  }

  createModelPanel(id: string) {
    const modelPanel = new Panel(this.rootDiv);
    modelPanel.content.id = id;
    this.modelPanel = modelPanel.content;

    const child = new ModelInput(this.scene, this.model, this.depthMaterial);
    modelPanel.addContent(child);
  }

  createControlsPanel(id: string) {
    const controlsPanel = new Panel(this.rootDiv);
    controlsPanel.content.id = id;
    this.controlsPanel = controlsPanel.content;

    const child = new ControlsInput();
    controlsPanel.addContent(child);
  }
}

class MenuInput implements HtmlClass {
  content: HTMLElement;

  constructor(scene: Scene, model: ArrayModel) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('tdb-input');

    if (model.useStreaming) {
      const performanceSliderWrapper = document.createElement('div');

      const performanceTitle = document.createElement('h3');
      const hr1 = document.createElement('hr');
      performanceTitle.textContent = 'Performance';
      performanceSliderWrapper.appendChild(performanceTitle);
      const pointBudgetSlider = new Slider(
        'Point budget',
        '100000',
        '10000000',
        model,
        scene
      );

      performanceSliderWrapper.appendChild(pointBudgetSlider.content);
      performanceSliderWrapper.appendChild(hr1);
      wrapper.appendChild(performanceSliderWrapper);
    }

    const clippingPlanesTitle = document.createElement('h3');
    const hr3 = document.createElement('hr');
    clippingPlanesTitle.textContent = 'Clipping planes';

    const xMinSlider = new Slider(
      'Xmin',
      (model.octree.minPoint.x - 1).toString(),
      (model.octree.maxPoint.x + 1).toString(),
      model,
      scene
    );

    const xMaxSlider = new Slider(
      'Xmax',
      (model.octree.minPoint.x - 1).toString(),
      (model.octree.maxPoint.x + 1).toString(),
      model,
      scene
    );

    const yMinSlider = new Slider(
      'Ymin',
      (model.octree.minPoint.y - 1).toString(),
      (model.octree.maxPoint.y + 1).toString(),
      model,
      scene
    );

    const yMaxSlider = new Slider(
      'Ymax',
      (model.octree.minPoint.y - 1).toString(),
      (model.octree.maxPoint.y + 1).toString(),
      model,
      scene
    );

    const zMinSlider = new Slider(
      'Zmin',
      (model.octree.minPoint.z - 1).toString(),
      (model.octree.maxPoint.z + 1).toString(),
      model,
      scene
    );

    const zMaxSlider = new Slider(
      'Zmax',
      (model.octree.minPoint.z - 1).toString(),
      (model.octree.maxPoint.z + 1).toString(),
      model,
      scene
    );

    wrapper.appendChild(clippingPlanesTitle);
    wrapper.appendChild(xMinSlider.content);
    wrapper.appendChild(xMaxSlider.content);
    wrapper.appendChild(yMinSlider.content);
    wrapper.appendChild(yMaxSlider.content);
    wrapper.appendChild(zMinSlider.content);
    wrapper.appendChild(zMaxSlider.content);
    wrapper.appendChild(hr3);

    const colorSchemeTitle = document.createElement('h3');
    const hr2 = document.createElement('hr');
    colorSchemeTitle.textContent = 'Color scheme';

    function setColors(colors: string) {
      updateSceneColors(scene, colors);
    }

    const colorScheme = model.colorScheme;

    if (colorScheme) {
      const colorSchemeRadioGroup = new RadioGroup({
        initialValue: colorScheme,
        listener: (colorScheme: string) => {
          setColors(colorScheme);
        },
        name: 'colors',
        values: ['dark', 'light', 'blue'],
        colorScheme
      });

      wrapper.appendChild(colorSchemeTitle);
      wrapper.appendChild(colorSchemeRadioGroup.content);
      wrapper.appendChild(hr2);
    }

    this.content = wrapper;
  }
}

class ModelInput implements HtmlClass {
  content: HTMLElement;
  private depthMaterial: ShaderMaterial;

  constructor(scene: Scene, model: ArrayModel, depthMaterial: ShaderMaterial) {
    this.depthMaterial = depthMaterial;

    const wrapper = document.createElement('div');
    wrapper.classList.add('tdb-input-wrapper');
    const modelTitle = document.createElement('h3');
    modelTitle.textContent = 'Load models';

    const nameSpaceLabel = document.createElement('label');
    const nameSpaceInput = document.createElement('input');
    nameSpaceInput.classList.add('tdb-input--full');
    nameSpaceLabel.textContent = 'Namespace';
    nameSpaceInput.value = 'TileDB-Inc';

    const fileLabel = document.createElement('label');
    const fileInput = document.createElement('input');
    fileLabel.textContent = 'File array';
    fileInput.value = 'arrayName';
    fileInput.classList.add('tdb-input--full');

    const transXLabel = document.createElement('label');
    const transXInput = document.createElement('input');
    transXLabel.textContent = 'Translation X';
    transXInput.value = '0.00';
    transXInput.classList.add('tdb-input--full');

    const transYLabel = document.createElement('label');
    const transYInput = document.createElement('input');
    transYLabel.textContent = 'Translation Y';
    transYInput.value = '0.00';
    transYInput.classList.add('tdb-input--full');

    const transZLabel = document.createElement('label');
    const transZInput = document.createElement('input');
    transZLabel.textContent = 'Translation Z';
    transZInput.value = '0.00';
    transZInput.classList.add('tdb-input--full');

    const scaleLabel = document.createElement('label');
    const scaleInput = document.createElement('input');
    scaleLabel.textContent = 'Scale';
    scaleInput.value = '1.00';
    scaleInput.classList.add('tdb-input--full');

    const modelButton = document.createElement('button');
    modelButton.classList.add('tdb-model-button');
    modelButton.textContent = 'Load model';

    modelButton.onclick = () => {
      const config: Record<string, string> = {};
      config.apiKey = model.token as string;

      const client = getTileDBClient(config);

      client
        .getFileContents(nameSpaceInput.value, fileInput.value)
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
            const x = parseFloat(transXInput.value.replace('.', ','));
            const y = parseFloat(transYInput.value.replace('.', ','));
            const z = parseFloat(transZInput.value.replace('.', ','));

            const scale = parseFloat(scaleInput.value.replace('.', ','));

            for (const mesh of result.meshes[0].getChildMeshes()) {
              mesh.setParent(null);

              mesh.scaling = new Vector3(scale, scale, scale);
              mesh.position = new Vector3(x, y, z);
              mesh.enableDistantPicking = true;

              mesh.renderingGroupId = 1;

              if (
                !model.renderTargets[0].renderList ||
                !model.renderTargets[1].renderList
              ) {
                throw new Error('Render targets are uninitialized');
              }

              model.renderTargets[0].renderList.push(mesh);
              model.renderTargets[0].setMaterialForRendering(
                mesh,
                this.depthMaterial
              );

              model.renderTargets[1].renderList.push(mesh);

              Tags.AddTagsTo(mesh, 'Imported');
            }

            result.meshes[0].dispose();
          });
        });
    };

    wrapper.appendChild(modelTitle);
    wrapper.appendChild(nameSpaceLabel);
    wrapper.appendChild(nameSpaceInput);
    wrapper.appendChild(fileLabel);
    wrapper.appendChild(fileInput);
    wrapper.appendChild(transXLabel);
    wrapper.appendChild(transXInput);
    wrapper.appendChild(transYLabel);
    wrapper.appendChild(transYInput);
    wrapper.appendChild(transZLabel);
    wrapper.appendChild(transZInput);
    wrapper.appendChild(scaleLabel);
    wrapper.appendChild(scaleInput);
    wrapper.appendChild(modelButton);
    this.content = wrapper;
  }
}

class ControlsInput implements HtmlClass {
  content: HTMLElement;

  constructor() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('tdb-input');
    const title = document.createElement('h3');
    const sc1 = document.createElement('p');
    const sc2 = document.createElement('p');
    const sc2b = document.createElement('p');
    const hr1 = document.createElement('hr');
    const title2 = document.createElement('h3');
    const sc3 = document.createElement('p');
    const sc4 = document.createElement('p');
    const sc5 = document.createElement('p');
    const hr2 = document.createElement('hr');
    const title3 = document.createElement('h3');
    const sc6 = document.createElement('p');
    const sc7 = document.createElement('p');
    const sc8 = document.createElement('p');
    const sc9 = document.createElement('p');
    const sc10 = document.createElement('p');
    const sc11 = document.createElement('p');
    const sc12 = document.createElement('p');
    const hr3 = document.createElement('hr');
    const title4 = document.createElement('h3');
    const sc13 = document.createElement('p');
    const sc14 = document.createElement('p');
    const sc15 = document.createElement('p');

    title.textContent = 'Control shortcuts';
    sc1.textContent = 'c: toggle between cameras';
    sc2.textContent = 'b: background color';
    sc2b.textContent = 'backspace or delete: clear cache';

    title2.textContent = 'Arc Rotate camera';
    sc3.textContent = 'scroll wheel: zoom in and out';
    sc4.textContent = 'drag mouse with left button: rotate';
    sc5.textContent = 'v: toggle between camera locations';

    title3.textContent = 'Free camera';
    sc6.textContent = 'drag mouse with left button: rotate';
    sc7.textContent = 'w or up: move forward';
    sc8.textContent = 's or down: move backward';
    sc9.textContent = 'e: move up';
    sc10.textContent = 'q: move down';
    sc11.textContent = 'a or left: move to the left';
    sc12.textContent = 'd or right: move to the right';

    title4.textContent = 'Model gizmo';
    sc13.textContent = '1: position';
    sc14.textContent = '2: scale';
    sc15.textContent = '3: rotate';

    wrapper.appendChild(title);
    wrapper.appendChild(sc1);
    wrapper.appendChild(sc2);
    wrapper.appendChild(sc2b);
    wrapper.appendChild(hr1);
    wrapper.appendChild(title2);
    wrapper.appendChild(sc3);
    wrapper.appendChild(sc4);
    wrapper.appendChild(sc5);
    wrapper.appendChild(hr2);
    wrapper.appendChild(title3);
    wrapper.appendChild(sc6);
    wrapper.appendChild(sc7);
    wrapper.appendChild(sc8);
    wrapper.appendChild(sc9);
    wrapper.appendChild(sc10);
    wrapper.appendChild(sc11);
    wrapper.appendChild(sc12);
    wrapper.appendChild(hr3);
    wrapper.appendChild(title4);
    wrapper.appendChild(sc13);
    wrapper.appendChild(sc14);
    wrapper.appendChild(sc15);

    this.content = wrapper;
  }
}

class Panel implements HtmlClass {
  content: HTMLElement;

  constructor(parent: HTMLDivElement) {
    const panel = document.createElement('div');
    this.content = panel;
    panel.classList.add('tdb-panel');

    parent.appendChild(panel);
  }

  addContent(children: HtmlClass) {
    this.content.appendChild(children.content);
  }
}

class Slider implements HtmlClass {
  content: HTMLElement;
  constructor(
    labelText: string,
    minValue: string,
    maxValue: string,
    model: ArrayModel,
    scene: Scene
  ) {
    const wrapper = document.createElement('div');
    const slider = document.createElement('input');
    slider.setAttribute('type', 'range');
    slider.setAttribute('class', 'tdb-slider');
    slider.setAttribute('min', minValue);
    slider.setAttribute('max', maxValue);
    if (labelText === 'Point budget') {
      slider.setAttribute('value', model.pointBudget.toString());
    } else if (labelText === 'Point size') {
      slider.setAttribute('value', model.pointSize.toString());
    } else if (labelText === 'Xmin') {
      slider.setAttribute('value', (model.octree.minPoint.x - 1).toString());
    } else if (labelText === 'Xmax') {
      slider.setAttribute('value', (model.octree.maxPoint.x + 1).toString());
    } else if (labelText === 'Ymin') {
      slider.setAttribute('value', (model.octree.minPoint.y - 1).toString());
    } else if (labelText === 'Ymax') {
      slider.setAttribute('value', (model.octree.maxPoint.y + 1).toString());
    } else if (labelText === 'Zmin') {
      slider.setAttribute('value', (model.octree.minPoint.z - 1).toString());
    } else if (labelText === 'Zmax') {
      slider.setAttribute('value', (model.octree.maxPoint.z + 1).toString());
    }

    const label = document.createElement('label');
    label.innerHTML = `${labelText}: ${Number(slider.value).toFixed(1)}`;

    slider.onchange = event => {
      label.innerHTML = `${labelText}: ${Number(slider.value).toFixed(1)}`;
      if (labelText === 'Point budget') {
        model.pointBudget = Number(slider.value);
      } else if (labelText === 'Xmin') {
        scene.clipPlane = new Plane(1, 0, 0, Number(slider.value));
      } else if (labelText === 'Xmax') {
        scene.clipPlane = new Plane(-1, 0, 0, -Number(slider.value));
      } else if (labelText === 'Ymin') {
        scene.clipPlane = new Plane(0, -1, 0, Number(slider.value));
      } else if (labelText === 'Ymax') {
        scene.clipPlane = new Plane(0, 1, 0, -Number(slider.value));
      } else if (labelText === 'Zmin') {
        scene.clipPlane = new Plane(0, 0, 1, Number(slider.value));
      } else if (labelText === 'Zmax') {
        scene.clipPlane = new Plane(0, 0, -1, -Number(slider.value));
      }
    };

    wrapper.appendChild(label);
    wrapper.appendChild(slider);

    this.content = wrapper;
  }
}

class RadioGroup implements HtmlClass {
  content: HTMLElement;

  constructor(options: {
    name: string;
    values: string[];
    colorScheme: string;
    initialValue?: string;
    listener: (value: string) => void;
  }) {
    const wrapper = document.createElement('fieldset');
    wrapper.classList.add('tdb-fieldset');
    this.content = wrapper;
    const { values, name, listener } = options;

    values.forEach(val => {
      const radio = new RadioInput({
        id: val,
        label: `${val.charAt(0).toUpperCase()}${val.slice(1)}`,
        name,
        checked: val === options.initialValue,
        listener: (e: any) => {
          listener(e.target.id);
        }
      });

      wrapper.appendChild(radio.content);
    });
  }
}

class RadioInput implements HtmlClass {
  content: HTMLElement;

  constructor(options: {
    name: string;
    label: string;
    id: string;
    checked?: boolean;
    listener?: (e: Event) => void;
  }) {
    const label = document.createElement('label');
    label.classList.add('tdb-radio-label');
    const input = document.createElement('input');

    input.type = 'radio';
    input.name = options.name;
    input.id = options.id;
    if (options.checked) {
      input.setAttribute('checked', 'true');
    }
    if (options.listener) {
      input.onchange = options.listener;
    }

    label.textContent = options.label;
    label.appendChild(input);
    this.content = label;
  }
}

export default PointCloudGUI;

export class ConfirmationBox {
  parentElement: HTMLDivElement;
  rootElement: HTMLDivElement;
  callback: () => void;
  id?: string;

  constructor(options: {
    parentElement: HTMLDivElement;
    callback: () => void;
    id?: string;
  }) {
    this.parentElement = options.parentElement;
    this.callback = options.callback;
    const rootElement = document.createElement('div');
    this.rootElement = rootElement;
    if (options.id) {
      // If element already exists, just return
      if (document.getElementById(options.id)) {
        return;
      }
      this.id = options.id;
      rootElement.setAttribute('id', this.id);
    }
    this.parentElement.appendChild(rootElement);
    this.createMarkup();
    this.attachListeners();
  }

  destroy() {
    this.rootElement.remove();
  }

  attachListeners() {
    document
      .getElementById('tdb-confirm-btn')
      ?.addEventListener('click', () => {
        this.callback();
        this.destroy();
      });

    document
      .getElementById('tdb-cancel-btn')
      ?.addEventListener('click', this.destroy.bind(this));
  }

  createMarkup() {
    this.rootElement.innerHTML = `
    <div class="tdb-modal">
      <h4 class="tdb-modal__title">Clear cache</h4>
      <p class="tdb-modal__description">Are you sure you want to delete the array's cache?</p>
      <div class="tdb-modal__buttons">
        <button id="tdb-confirm-btn" class="tdb-modal__button tdb-modal__button--active">Clear cache</button>
        <button id="tdb-cancel-btn" class="tdb-modal__button">Cancel</button>
      </div>
    </div>
    `;
  }
}
