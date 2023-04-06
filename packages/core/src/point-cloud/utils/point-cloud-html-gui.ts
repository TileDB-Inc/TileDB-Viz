import { Plane, Scene } from '@babylonjs/core';
import ArrayModel from '../model/array-model';
import { updateSceneColors } from './scene-colors';

const stylesString = `
.tdb-button {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background-position: center;
  background-size: cover;
  background-color: transparent;
  position: absolute;
  bottom: 40px;
  right: 20px;
}

.tdb-button:hover {
  cursor: pointer;
}

.tdb-panel {
  background-color: #494949CC;
  position: absolute;
  bottom: 40px;
  right: 90px;
  width: 300px;
  height: calc(100% - 100px);
  display: none;
  padding: 16px;
  border-radius: 8px;
  font-family: Inter, sans-serif;
}

.tdb-show {
  display: block;
}

.tdb-input {
  color: #fff;
  margin-bottom: 15px;
  margin-right: 4px;
  font-size: 12px;
}

.tdb-input h3 {
  font-size: 16px;
  height: 16px;
}

.tdb-input label {
  width: 100%;
  height: 20px;
}

.tdb-input input {
  width: 100%;
  height: 16px;
}

.slider {
  width: 100%;
  height: 12px;
  border-radius: 8px; 
  background: #FFF;
  outline: none;
  opacity: 1.0;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%; 
  background: #0077FF;
  cursor: pointer;
}

.tdb-radio-label {
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.tdb-radio-label input {
  margin: 0 8px 0 0;
  height: 18px;
  width: 18px;
}

.tdb-fieldset {
  border: none;
}

.model-button {
  background-color: #0077FF;
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 4px 2px;
  cursor: pointer;
  width: 100%;
}
`;

const styleElement = document.createElement('style');
styleElement.textContent = stylesString;
document.head.appendChild(styleElement);

interface HtmlClass {
  content: HTMLElement;
}

class pointCloudGUI {
  rootDiv: HTMLDivElement;
  menuPanel?: HTMLElement;
  modelPanel?: HTMLElement;
  controlsPanel?: HTMLElement;
  scene: Scene;
  model: ArrayModel;

  constructor(scene: Scene, model: ArrayModel) {
    this.scene = scene;
    this.model = model;
    this.rootDiv = document.getElementById('tdb-viz-wrapper') as HTMLDivElement;

    const menuButton = this.createButton();
    menuButton.style.bottom = '168px';
    menuButton.style.backgroundImage =
      'url("https://tiledb-viz-demos.s3.amazonaws.com/menu.png")';
    menuButton.onclick = () => {
      this.modelPanel?.classList.remove('tdb-show');
      this.controlsPanel?.classList.remove('tdb-show');
      this.menuPanel?.classList.toggle('tdb-show');
    };

    const modelButton = this.createButton();
    //modelButton.style.top = '84px';
    modelButton.style.bottom = '104px';
    modelButton.style.backgroundImage =
      'url("https://tiledb-viz-demos.s3.amazonaws.com/model.png")';
    modelButton.onclick = () => {
      this.menuPanel?.classList.remove('tdb-show');
      this.controlsPanel?.classList.remove('tdb-show');
      this.modelPanel?.classList.toggle('tdb-show');
    };

    const controlsButton = this.createButton();
    //controlsButton.style.top = '148px';
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

    const child = new ModelInput();
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

      const pointBudgetSlider = new Slider(
        'Point budget',
        '500000',
        '10000000',
        model,
        scene
      );

      performanceSliderWrapper.appendChild(performanceTitle);
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
        listener: (colorScheme: string) => {
          setColors(colorScheme);
          //console.log(`Selected Color Scheme is: ${colorScheme}`);
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
    slider.setAttribute('class', 'slider');
    slider.setAttribute('min', minValue);
    slider.setAttribute('max', maxValue);
    if (labelText === 'Point budget') {
      slider.setAttribute('value', model.pointBudget.toString());
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
    listener?: (e: Event) => void;
  }) {
    const label = document.createElement('label');
    label.classList.add('tdb-radio-label');
    const input = document.createElement('input');

    input.type = 'radio';
    input.name = options.name;
    input.id = options.id;

    if (options.listener) {
      input.onchange = options.listener;
    }

    label.textContent = options.label;
    label.appendChild(input);
    this.content = label;
  }
}

class ModelInput implements HtmlClass {
  content: HTMLElement;

  constructor() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('tdb-input');
    const modelTitle = document.createElement('h3');
    modelTitle.textContent = 'Load models';

    const nameSpaceLabel = document.createElement('label');
    const nameSpaceInput = document.createElement('input');
    nameSpaceLabel.textContent = 'Namespace';
    nameSpaceInput.value = 'TileDB';

    const fileLabel = document.createElement('label');
    const fileInput = document.createElement('input');
    fileLabel.textContent = 'File';
    fileInput.value = 'dragon.glb';

    const transXLabel = document.createElement('label');
    const transXInput = document.createElement('input');
    transXLabel.textContent = 'Translation X';
    transXInput.value = '0.00';

    const transYLabel = document.createElement('label');
    const transYInput = document.createElement('input');
    transYLabel.textContent = 'Translation Y';
    transYInput.value = '0.00';

    const transZLabel = document.createElement('label');
    const transZInput = document.createElement('input');
    transZLabel.textContent = 'Translation Z';
    transZInput.value = '0.00';

    const scaleLabel = document.createElement('label');
    const scaleInput = document.createElement('input');
    scaleLabel.textContent = 'Scale';
    scaleInput.value = '1.00';

    const button = document.createElement('button');
    button.classList.add('model-button');
    button.value = 'Load model';

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
    wrapper.appendChild(button);
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

    title.textContent = 'Control shortcuts';
    sc1.textContent = 'c: toggle between cameras';
    sc2.textContent = 'b: background color';

    title2.textContent = 'arcRotate camera';
    sc3.textContent = 'scroll wheel: zoom in and out';
    sc4.textContent = 'drag mouse with left button: rotate';
    sc5.textContent = 'v: toggle between camera locations';

    title3.textContent = 'free camera';
    sc6.textContent = 'drag mouse with left button: rotate';
    sc7.textContent = 'w or up: move forward';
    sc8.textContent = 's or down: move backward';
    sc9.textContent = 'e: move up';
    sc10.textContent = 'q: move down';
    sc11.textContent = 'a or left: move to the left';
    sc12.textContent = 'd or right: move to the right';

    wrapper.appendChild(title);
    wrapper.appendChild(sc1);
    wrapper.appendChild(sc2);
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

    this.content = wrapper;
  }
}

export default pointCloudGUI;
