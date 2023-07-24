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

enum SliderValues {
  xmin = 'xmin',
  xmax = 'xmax',
  ymin = 'ymin',
  ymax = 'ymax',
  zmin = 'zmin',
  zmax = 'zmax',
  perf = 'perf'
}

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
  <tdb-slider id="${SliderValues.perf}" label="Point budget" min="100000" max="10000000" value="${model.pointBudget}"></tdb-slider>
  <hr class="tdb-hr" />
  `
      : ''
  }
  <h3 class="tdb-text">Clipping planes</h3>
  <tdb-slider id="${SliderValues.xmin}" label="Xmin" min="${
      model.octree.minPoint.x - 1
    }" max="${model.octree.maxPoint.x - 1}" value="${
      model.octree.minPoint.x - 1
    }"></tdb-slider>
<tdb-slider id="${SliderValues.xmax}" label="Xmax" min="${
      model.octree.minPoint.x - 1
    }" max="${model.octree.maxPoint.x - 1}" value="${
      model.octree.maxPoint.x + 1
    }"></tdb-slider>
<tdb-slider id="${SliderValues.ymin}" label="Ymin" min="${
      model.octree.minPoint.y - 1
    }" max="${model.octree.maxPoint.y + 1}" value="${
      model.octree.minPoint.y - 1
    }"></tdb-slider>
<tdb-slider id="${SliderValues.ymax}" label="Ymax" min="${
      model.octree.minPoint.y - 1
    }" max="${model.octree.maxPoint.y + 1}" value="${
      model.octree.maxPoint.y + 1
    }"></tdb-slider>
<tdb-slider id="${SliderValues.zmin}" label="Zmin" min="${
      model.octree.minPoint.z - 1
    }" max="${model.octree.maxPoint.z + 1}" value="${
      model.octree.minPoint.z - 1
    }"></tdb-slider>
<tdb-slider id="${SliderValues.zmax}" label="Zmax" min="${
      model.octree.minPoint.z - 1
    }" max="${model.octree.maxPoint.z + 1}" value="${
      model.octree.maxPoint.z + 1
    }"></tdb-slider>
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
      Events.SLIDER_CHANGE,
      (e: Event) => {
        const customEvent = e as CustomEvent<{ value: number; id: string }>;
        const { value, id } = customEvent.detail;

        if (id === String(SliderValues.xmin)) {
          scene.clipPlane = new Plane(1, 0, 0, value);
        } else if (id === String(SliderValues.xmax)) {
          scene.clipPlane = new Plane(-1, 0, 0, -value);
        } else if (id === String(SliderValues.ymin)) {
          scene.clipPlane = new Plane(0, -1, 0, value);
        } else if (id === String(SliderValues.ymax)) {
          scene.clipPlane = new Plane(0, 1, 0, -value);
        } else if (id === String(SliderValues.zmin)) {
          scene.clipPlane = new Plane(0, 0, 1, value);
        } else if (id === String(SliderValues.zmax)) {
          scene.clipPlane = new Plane(0, 0, -1, -value);
        } else if (id === String(SliderValues.perf)) {
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
