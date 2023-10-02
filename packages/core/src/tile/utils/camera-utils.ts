import {
  ArcRotateCamera,
  Scene,
  Vector3,
  Viewport,
  PointerInfo,
  PointerEventTypes,
  Quaternion
} from '@babylonjs/core';
import { MinimapPipeline } from '../pipelines/minimapPostProcess';
import {
  Events,
  GUIEvent,
  ButtonProps,
  SliderProps,
  TextBoxProps
} from '@tiledb-inc/viz-components';

const MINIMAP_OFFSET = 20;
const MINIMAP_MAX_SIZE = 200;
const ZOOM_STEP = 0.125;

export class CameraManager {
  private scene: Scene;
  private mainCamera: ArcRotateCamera;
  private minimapCamera?: ArcRotateCamera;
  private baseWidth: number;
  private baseHeight: number;
  private zoom: number;
  private pointerDownStartPosition?: Vector3;

  public upperZoomLimit: number;
  public lowerZoomLimit: number;

  public constructor(
    scene: Scene,
    initialZoom: number,
    baseWidth: number,
    baseHeight: number
  ) {
    this.scene = scene;
    this.baseWidth = baseWidth;
    this.baseHeight = baseHeight;
    this.lowerZoomLimit = this.upperZoomLimit = this.zoom = initialZoom;

    const target = new Vector3(this.baseWidth / 2, 0, -this.baseHeight / 2);

    this.mainCamera = new ArcRotateCamera(
      'Main',
      -Math.PI * 0.5,
      0,
      3000,
      target,
      scene
    );

    scene.activeCamera = this.mainCamera;

    this.mainCamera.attachControl(false);
    this.mainCamera.lowerAlphaLimit = -Math.PI;
    this.mainCamera.upperAlphaLimit = Math.PI;
    this.mainCamera.mode = ArcRotateCamera.ORTHOGRAPHIC_CAMERA;
    this.mainCamera.lowerBetaLimit = 0;
    this.mainCamera.upperBetaLimit = Math.PI / 4;
    this.mainCamera.layerMask = 1;
    for (const [, input] of Object.entries(this.mainCamera.inputs.attached)) {
      input.detachControl();
    }

    this.scene.activeCameras?.push(this.mainCamera);

    if (this.baseWidth < 4096 && this.baseHeight < 4096) {
      this.minimapCamera = new ArcRotateCamera(
        'Minimap',
        -Math.PI * 0.5,
        0,
        3000,
        target.clone(),
        scene
      );

      this.minimapCamera.mode = ArcRotateCamera.ORTHOGRAPHIC_CAMERA;
      this.minimapCamera.layerMask = 1;
      this.minimapCamera.detachControl();

      this.scene.activeCameras?.push(this.minimapCamera);

      const minimapPipeline = new MinimapPipeline(
        this.scene,
        this.baseWidth,
        this.baseHeight
      );
      minimapPipeline.initializePostProcess();
    }

    window.addEventListener(
      Events.SLIDER_CHANGE,
      this.sliderHandler.bind(this) as any,
      {
        capture: true
      }
    );
    window.addEventListener(
      Events.TEXT_INPUT_CHANGE,
      this.textboxHandler.bind(this) as any,
      {
        capture: true
      }
    );
    window.addEventListener(
      Events.BUTTON_CLICK,
      this.buttonHandler.bind(this) as any,
      {
        capture: true
      }
    );
    window.addEventListener(
      Events.TOGGLE_INPUT_CHANGE,
      this.buttonHandler.bind(this) as any,
      {
        capture: true
      }
    );

    this.resizeCameraViewport();
    this.setupCameraInput();
  }

  public resizeCameraViewport() {
    const viewportWidth = this.scene.getEngine().getRenderWidth();
    const viewportHeight = this.scene.getEngine().getRenderHeight();

    const widthHalfRatio = (viewportWidth / 2) * (1 / this.zoom);
    const heightHalfRatio = (viewportHeight / 2) * (1 / this.zoom);

    this.mainCamera.orthoTop = heightHalfRatio;
    this.mainCamera.orthoBottom = -heightHalfRatio;
    this.mainCamera.orthoLeft = -widthHalfRatio;
    this.mainCamera.orthoRight = widthHalfRatio;

    if (this.minimapCamera) {
      const aspectRatio = Math.min(
        MINIMAP_MAX_SIZE / this.baseWidth,
        MINIMAP_MAX_SIZE / this.baseHeight
      );

      const xOffset = MINIMAP_OFFSET / viewportWidth;
      const yOffset = MINIMAP_OFFSET / viewportHeight;
      const minimapWidth = (aspectRatio * this.baseWidth) / viewportWidth;
      const minimapHeight = (aspectRatio * this.baseHeight) / viewportHeight;

      this.minimapCamera.viewport = new Viewport(
        xOffset,
        1 - yOffset - minimapHeight,
        minimapWidth,
        minimapHeight
      );

      this.minimapCamera.orthoTop = this.baseHeight / 2;
      this.minimapCamera.orthoBottom = -this.baseHeight / 2;
      this.minimapCamera.orthoLeft = -this.baseWidth / 2;
      this.minimapCamera.orthoRight = this.baseWidth / 2;
    }
  }

  private textboxHandler(event: CustomEvent<GUIEvent<TextBoxProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== 'camera') {
      return;
    }

    switch (target[1]) {
      case 'target':
        this.targetUpdate(target[2], Number(event.detail.props.value));
        break;
    }

    event.stopPropagation();
  }

  private targetUpdate(axis: string, value: number) {
    const offset = Vector3.Zero();

    switch (axis) {
      case 'X':
        offset.x = value - this.mainCamera.target.x;
        break;
      case 'Z':
        offset.z = -value - this.mainCamera.target.z;
        break;
    }

    this.mainCamera.position.addInPlace(offset);
    this.mainCamera.target.addInPlace(offset);
  }

  private buttonHandler(event: CustomEvent<GUIEvent<ButtonProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== 'camera') {
      return;
    }

    if (target[1] === 'zoom') {
      switch (event.detail.props.command) {
        case 'in':
          this.zoom = Math.max(
            this.lowerZoomLimit,
            Math.min(
              this.upperZoomLimit,
              2 ** (Math.log2(this.zoom) + ZOOM_STEP)
            )
          );
          break;
        case 'out':
          this.zoom = Math.max(
            this.lowerZoomLimit,
            Math.min(
              this.upperZoomLimit,
              2 ** (Math.log2(this.zoom) - ZOOM_STEP)
            )
          );
          break;
        case 'reset':
          this.zoom = this.lowerZoomLimit;
          this.mainCamera.target.x = this.baseWidth / 2;
          this.mainCamera.target.z = -this.baseHeight / 2;
          this.mainCamera.alpha = -Math.PI * 0.5;
          this.mainCamera.beta = 0;
          break;
      }
    } else if (target[1] === 'minimap' && this.minimapCamera) {
      this.minimapCamera._skipRendering = !event.detail.props.data;
    }

    this.resizeCameraViewport();

    window.dispatchEvent(
      new CustomEvent(Events.ENGINE_INFO_UPDATE, {
        bubbles: true,
        detail: {
          type: 'ZOOM_INFO',
          zoom: this.zoom
        }
      })
    );

    event.stopPropagation();
  }

  private sliderHandler(event: CustomEvent<GUIEvent<SliderProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== 'camera') {
      return;
    }

    switch (target[1]) {
      case 'pitch':
        this.mainCamera.beta = (event.detail.props.value * Math.PI) / 180;
        break;
      case 'rotation':
        {
          const angle =
            (event.detail.props.value * Math.PI) / 180 - Math.PI / 2;
          if (angle > Math.PI) {
            this.mainCamera.alpha = angle - 2 * Math.PI;
          } else {
            this.mainCamera.alpha = angle;
          }
        }
        break;
    }

    event.stopPropagation();
  }

  public setupCameraInput() {
    this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN:
          this.pointerDownStartPosition = new Vector3(
            pointerInfo.event.offsetX * (1 / this.zoom),
            0,
            pointerInfo.event.offsetY * (1 / this.zoom)
          );
          break;
        case PointerEventTypes.POINTERUP:
          this.pointerDownStartPosition = undefined;
          break;
        case PointerEventTypes.POINTERMOVE:
          if (this.pointerDownStartPosition) {
            const pointerCurrentPosition = new Vector3(
              pointerInfo.event.offsetX * (1 / this.zoom),
              0,
              pointerInfo.event.offsetY * (1 / this.zoom)
            );
            const positionDifference = pointerCurrentPosition
              .subtract(this.pointerDownStartPosition)
              .multiplyByFloats(
                1,
                0,
                1 / Math.abs(Math.cos(this.mainCamera.beta))
              )
              .applyRotationQuaternion(
                Quaternion.RotationAxis(
                  new Vector3(0, 1, 0),
                  (this.mainCamera?.alpha ?? -Math.PI * 0.5) + Math.PI * 0.5
                )
              );

            this.mainCamera.position.addInPlace(
              positionDifference.multiplyByFloats(-1, 0, 1)
            );
            this.mainCamera.target.addInPlace(
              positionDifference.multiplyByFloats(-1, 0, 1)
            );

            this.pointerDownStartPosition = pointerCurrentPosition;

            window.dispatchEvent(
              new CustomEvent(Events.ENGINE_INFO_UPDATE, {
                bubbles: true,
                detail: {
                  type: 'CAMERA_POSITION',
                  cameraTarget: {
                    x: this.mainCamera.target.x,
                    z: -this.mainCamera.target.z
                  }
                }
              })
            );
          }
          break;
        case PointerEventTypes.POINTERWHEEL:
          {
            const delta = (pointerInfo.event as WheelEvent).deltaY / 1500;

            this.zoom = Math.max(
              this.lowerZoomLimit,
              Math.min(this.upperZoomLimit, 2 ** (Math.log2(this.zoom) + delta))
            );

            this.resizeCameraViewport();
            window.dispatchEvent(
              new CustomEvent(Events.ENGINE_INFO_UPDATE, {
                bubbles: true,
                detail: {
                  type: 'ZOOM_INFO',
                  zoom: this.zoom
                }
              })
            );
          }
          break;
      }
    });
  }

  public dispose() {
    window.removeEventListener(
      Events.SLIDER_CHANGE,
      this.sliderHandler.bind(this) as any,
      {
        capture: true
      }
    );
    window.removeEventListener(
      Events.TEXT_INPUT_CHANGE,
      this.textboxHandler.bind(this) as any,
      {
        capture: true
      }
    );
    window.removeEventListener(
      Events.BUTTON_CLICK,
      this.buttonHandler.bind(this) as any,
      {
        capture: true
      }
    );
    window.removeEventListener(
      Events.TOGGLE_INPUT_CHANGE,
      this.buttonHandler.bind(this) as any,
      {
        capture: true
      }
    );

    this.mainCamera.dispose();
    this.minimapCamera?.dispose();
  }

  public getMainCamera(): ArcRotateCamera {
    return this.mainCamera;
  }

  public getZoom(): number {
    return this.zoom;
  }
}

export function getCamera(
  scene: Scene,
  name: string
): ArcRotateCamera | undefined {
  const cameras = scene.activeCameras?.filter(x => x.name === name);

  if (!cameras?.length) {
    return undefined;
  }

  return cameras[0] as ArcRotateCamera;
}

export function hasMinimap(scene: Scene): boolean {
  return (
    (scene.activeCameras?.filter(x => x.name === 'Minimap').length ?? 0) > 0
  );
}
