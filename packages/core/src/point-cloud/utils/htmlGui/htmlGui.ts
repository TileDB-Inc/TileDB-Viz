import stylesString from 'bundle-text:./styles.css';

const styleElement = document.createElement('style');
styleElement.textContent = stylesString;
document.head.appendChild(styleElement);

interface HtmlClass {
  content: HTMLElement;
}

class HtmlGui {
  rootDiv: HTMLDivElement;
  panel1?: HTMLElement;

  constructor() {
    this.rootDiv = document.getElementById('tdb-viz-wrapper') as HTMLDivElement;

    const firstButton = this.createButton();
    firstButton.style.backgroundImage =
      'url("https://tiledb-viz-demos.s3.amazonaws.com/model.png")';
    firstButton.onclick = () => {
      this.panel1?.classList.toggle('tdb-show');
    };

    const secondButton = this.createButton();
    secondButton.style.top = '100px';
    secondButton.style.backgroundImage =
      'url("https://tiledb-viz-demos.s3.amazonaws.com/menu.png")';
    secondButton.onclick = () => {
      this.panel1?.classList.toggle('tdb-show');
    };

    const thirdButton = this.createButton();
    thirdButton.style.top = '180px';
    thirdButton.style.backgroundImage =
      'url("https://tiledb-viz-demos.s3.amazonaws.com/controls.png")';
    thirdButton.onclick = () => {
      this.panel1?.classList.toggle('tdb-show');
    };

    this.createPanel('panel1');
  }

  createButton() {
    const button = document.createElement('button');
    button.classList.add('tdb-button');

    this.rootDiv.appendChild(button);

    return button;
  }

  createPanel(id: string) {
    const panel = new Panel(this.rootDiv);
    panel.content.id = id;
    this.panel1 = panel.content;

    const child = new Input();
    panel.addContent(child);
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

class Input implements HtmlClass {
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

export default HtmlGui;
