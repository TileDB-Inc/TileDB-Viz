import { Scene, Plane, ShaderMaterial } from '@babylonjs/core';
import ArrayModel from '../model/array-model';
import { updateSceneColors } from './scene-colors';
import '@tiledb-inc/viz-components';
import { Events } from '@tiledb-inc/viz-components';

const stylesString = `
.tdb-text {
  color: #fff;
  line-height: 1.1;
  font-size: 10px;
}
h3.tdb-text {
  font-size: 14px;
}
.tdb-hr {
  color: #fff;
  margin: 5px 0;
}
`;

const styleElement = document.createElement('style');
styleElement.textContent = stylesString;
document.head.appendChild(styleElement);

class PointCloudGUI {
  rootDiv?: HTMLDivElement;
  menuPanel?: HTMLElement;
  modelPanel?: HTMLElement;
  controlsPanel?: HTMLElement;
  rootElement?: HTMLElement;
  scene: Scene;
  model: ArrayModel;
  depthMaterial: ShaderMaterial;
  height?: string;

  constructor(
    scene: Scene,
    model: ArrayModel,
    depthMaterial: ShaderMaterial,
    rootElement: HTMLElement,
    height?: string
  ) {
    this.scene = scene;
    this.model = model;
    this.depthMaterial = depthMaterial;
    this.rootElement = rootElement;
    this.height = height;

    for (const childElement of rootElement.children) {
      if (childElement.id === 'tdb-viz-wrapper') {
        this.rootDiv = childElement as HTMLDivElement;
      }
    }

    if (!this.rootDiv) {
      console.error('GUI can not be initiated rootElement was not found');
      return;
    }

    const uiWrapper = document.createElement('div');
    uiWrapper.innerHTML = `
<floating-button bottom="86px" id="menu" backgroundimage="https://tiledb-viz-demos.s3.amazonaws.com/menu.png"></floating-button>
<floating-button id="kb" backgroundimage="https://tiledb-viz-demos.s3.amazonaws.com/controls.png"></floating-button>
<menu-panel id="menu">
  ${
    model.useStreaming
      ? `
  <h3 class="tdb-text">Performance</h3>
  <tdb-slider id="perf" label="Point budget" min="100000" max="10000000" value="${model.pointBudget}"></tdb-slider>
  <hr class="tdb-hr" />
  `
      : ''
  }
  <h3 class="tdb-text">Clipping planes</h3>
  <dual-slider label="X" id="x" min="${model.octree.minPoint.x - 1}" max="${
      model.octree.maxPoint.x + 1
    }"></dual-slider>

    <dual-slider label="Y" id="y" min="${model.octree.minPoint.y - 1}" max="${
      model.octree.maxPoint.y + 1
    }" ></dual-slider>

    <dual-slider label="Z" id="z" min="${model.octree.minPoint.z - 1}" max="${
      model.octree.maxPoint.z + 1
    }"></dual-slider>

<hr class="tdb-hr" />
<h3 class="tdb-text">Color scheme</h3>
<radio-group name="colors" values="dark,light,blue" initialvalue="${
      model.colorScheme
    }"></radio-group>
<hr class="tdb-hr" />
<h3 class="tdb-text">Miscellaneous</h3>
<toggle-input name="bbox" label="Show bounding box" id="bb" value="false" />
</menu-panel>
<menu-panel id="kb">
  <div class="tdb-text"><h3>Control shortcuts</h3><p>c: toggle between cameras</p><p>b: background color</p><p>backspace or delete: clear cache</p><hr><h3>Arc Rotate camera</h3><p>scroll wheel: zoom in and out</p><p>drag mouse with left button: rotate</p><p>v: toggle between camera locations</p><hr><h3>Free camera</h3><p>drag mouse with left button: rotate</p><p>w or up: move forward</p><p>s or down: move backward</p><p>e: move up</p><p>q: move down</p><p>a or left: move to the left</p><p>d or right: move to the right</p><hr></div>
</menu-panel>
<confirmation-box></confirmation-box>
      `;

    window.addEventListener(
      Events.DUAL_SLIDER_CHANGE,
      (e: Event) => {
        const customEvent = e as CustomEvent<{ values: number[]; id: string }>;
        const { values, id } = customEvent.detail;

        if (id === 'x') {
          const [min, max] = values;
          const plane1 = new Plane(1, 0, 0, min);
          const plane2 = new Plane(-1, 0, 0, -max);

          scene.clipPlane = plane1;
          scene.clipPlane2 = plane2;
        } else if (id === 'y') {
          const [min, max] = values;
          const plane1 = new Plane(0, -1, 0, min);
          const plane2 = new Plane(0, 1, 0, -max);

          scene.clipPlane3 = plane1;
          scene.clipPlane4 = plane2;
        } else if (id === 'z') {
          const [min, max] = values;
          const plane1 = new Plane(0, 0, 1, min);
          const plane2 = new Plane(0, 0, -1, -max);

          scene.clipPlane5 = plane1;
          scene.clipPlane6 = plane2;
        }
      },
      {
        capture: true
      }
    );

    window.addEventListener(
      Events.SLIDER_CHANGE,
      (e: Event) => {
        const customEvent = e as CustomEvent<{ value: number; id: string }>;
        const { value, id } = customEvent.detail;

        if (id === 'perf') {
          model.pointBudget = value;
        }
      },
      {
        capture: true
      }
    );

    window.addEventListener(
      Events.RADIO_GROUP_CHANGE,
      (e: Event) => {
        const customEvent = e as CustomEvent<{ value: string }>;
        const { value: colorScheme } = customEvent.detail;

        updateSceneColors(scene, colorScheme);
      },
      {
        capture: true
      }
    );

    window.addEventListener(
      Events.TOGGLE_INPUT_CHANGE,
      (e: Event) => {
        const customEvent = e as CustomEvent<{ value: boolean }>;
        const { value } = customEvent.detail;

        model.toggleBoundingBox(value);
      },
      {
        capture: true
      }
    );

    this.rootElement.appendChild(uiWrapper);
  }
}

export default PointCloudGUI;
