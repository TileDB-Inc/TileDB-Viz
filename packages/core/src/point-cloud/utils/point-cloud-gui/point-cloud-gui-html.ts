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
  margin-bottom: 15px;
}

.tdb-input label {
  color: #fff;
  margin-right: 4px;
}

.tdb-title {
  margin-bottom: 15px;
}

.tdb-title title {
  color: #fff;
  margin-right: 4px;
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

  //** TO DO **
  //how to move buttons to bottom left or right?
  //how to avoid overlapping panels the when clicking on a button, how to close them when different button clicked?
  //what is the tiledb font? which sizes etc to use? https://fonts.google.com/specimen/Inter

  constructor() {
    this.rootDiv = document.getElementById('tdb-viz-wrapper') as HTMLDivElement;

    const menuButton = this.createButton();
    menuButton.style.backgroundImage =
      'url("https://tiledb-viz-demos.s3.amazonaws.com/menu.png")';
    menuButton.onclick = () => {
      this.menuPanel?.classList.toggle('tdb-show');
      //this.panel1?.classList.replace();
      //this.panel3?.classList.remove();
    };

    const modelButton = this.createButton();
    modelButton.style.top = '84px';
    modelButton.style.backgroundImage =
      'url("https://tiledb-viz-demos.s3.amazonaws.com/model.png")';
    modelButton.onclick = () => {
      this.modelPanel?.classList.toggle('tdb-show');
    };

    const controlsButton = this.createButton();
    controlsButton.style.top = '148px';
    //thirdButton.style.bottom = '10px';
    controlsButton.style.backgroundImage =
      'url("https://tiledb-viz-demos.s3.amazonaws.com/controls.png")';
    controlsButton.onclick = () => {
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

    const child = new menuInput();
    menuPanel.addContent(child);
  }

  createModelPanel(id: string) {
    const modelPanel = new Panel(this.rootDiv);
    modelPanel.content.id = id;
    this.modelPanel = modelPanel.content;

    const child = new modelInput();
    modelPanel.addContent(child);
  }

  createControlsPanel(id: string) {
    const controlsPanel = new Panel(this.rootDiv);
    controlsPanel.content.id = id;
    this.controlsPanel = controlsPanel.content;

    const child = new controlsInput();
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

class menuInput implements HtmlClass {
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

class modelInput implements HtmlClass {
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

class controlsInput implements HtmlClass {
  content: HTMLElement;

  constructor() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('tdb-input');
    //wrapper.classList.add('tdb-title');
    const title = document.createElement('title');
    //const input = document.createElement('input');

    title.textContent = 'Control shortcuts';
    //input.value = 'TileDB';
    wrapper.appendChild(title);
    //wrapper.appendChild(input);
    this.content = wrapper;
  }
}

export default pointCloudGUI;
