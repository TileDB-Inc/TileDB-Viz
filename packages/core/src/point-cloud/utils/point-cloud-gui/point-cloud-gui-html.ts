import { Scene } from '@babylonjs/core';
import ArrayModel from '../../model/array-model';
import { updateSceneColors } from '../scene-colors';

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
  top: 20px;
  left: 20px;
}

.tdb-button:hover {
  cursor: pointer;
}

.tdb-panel {
  background-color: #494949CC;
  position: absolute;
  top: 20px;
  left: 90px;
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
}

.tdb-radio-label input {
  margin: 0 8px 0 0;
  height: 18px;
  width: 18px;
}

.tdb-fieldset {
  border: none;
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

  //** TO DO **
  //how to move buttons to bottom left or right?
  //how to add a text block/title and style it?

  constructor(scene: Scene, model: ArrayModel) {
    this.scene = scene;
    this.model = model;
    this.rootDiv = document.getElementById('tdb-viz-wrapper') as HTMLDivElement;

    const menuButton = this.createButton();
    menuButton.style.backgroundImage =
      'url("https://tiledb-viz-demos.s3.amazonaws.com/menu.png")';
    menuButton.onclick = () => {
      this.modelPanel?.classList.remove('tdb-show');
      this.controlsPanel?.classList.remove('tdb-show');
      this.menuPanel?.classList.toggle('tdb-show');
    };

    const modelButton = this.createButton();
    modelButton.style.top = '84px';
    modelButton.style.backgroundImage =
      'url("https://tiledb-viz-demos.s3.amazonaws.com/model.png")';
    modelButton.onclick = () => {
      this.menuPanel?.classList.remove('tdb-show');
      this.controlsPanel?.classList.remove('tdb-show');
      this.modelPanel?.classList.toggle('tdb-show');
    };

    const controlsButton = this.createButton();
    controlsButton.style.top = '148px';
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
      const sliderWrapper = document.createElement('div');

      const title = document.createElement('h3');
      const label = document.createElement('label');
      const hr1 = document.createElement('hr');
      title.textContent = 'Performance';

      const slider = document.createElement('input');
      slider.setAttribute('type', 'range');
      slider.setAttribute('class', 'slider');
      slider.setAttribute('min', '500000');
      slider.setAttribute('max', '10000000');
      slider.setAttribute('value', model.pointBudget.toString());

      const output = document.getElementById('pointCount');
      console.log(output);

      label.innerHTML = `Point budget: ${slider.value}`;

      slider.onchange = event => {
        label.innerHTML = `Point budget: ${slider.value}`;
        model.pointBudget = Number(slider.value);
      };

      sliderWrapper.appendChild(title);
      sliderWrapper.appendChild(label);
      sliderWrapper.appendChild(slider);
      sliderWrapper.appendChild(hr1);

      wrapper.appendChild(sliderWrapper);
    }

    const title2 = document.createElement('h3');
    const hr2 = document.createElement('hr');
    title2.textContent = 'ColorScheme';

    function setColors(colors: string) {
      updateSceneColors(scene, colors);
    }

    const radioGroup = new RadioGroup({
      listener: (colorScheme: string) => {
        setColors(colorScheme);
        console.log(`Selected Color Scheme is: ${colorScheme}`);
      },
      name: 'colors',
      values: ['dark', 'light', 'blue']
    });

    wrapper.appendChild(title2);
    wrapper.appendChild(radioGroup.content);
    wrapper.appendChild(hr2);

    const title3 = document.createElement('h3');
    const hr3 = document.createElement('hr');
    title3.textContent = 'Clipping planes';

    wrapper.appendChild(title3);
    wrapper.appendChild(hr3);

    this.content = wrapper;
  }
}

class RadioGroup implements HtmlClass {
  content: HTMLElement;

  constructor(options: {
    name: string;
    values: string[];
    listener: (value: any) => void;
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
    const label = document.createElement('label');
    const input = document.createElement('input');

    label.textContent = 'Namespace';
    input.value = 'TileDB';
    wrapper.appendChild(label);
    wrapper.appendChild(input);
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
