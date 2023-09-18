import { Camera, FreeCamera, Scene, Vector3, Viewport } from '@babylonjs/core';
import { MinimapPipeline } from '../pipelines/minimapPostProcess';

const MINIMAP_OFFSET = 20;
const MINIMAP_MAX_SIZE = 200;

export function setupCamera(
  scene: Scene,
  initialZoom: number,
  position: Vector3
) {
  const camera = new FreeCamera(
    'Main',
    position.multiplyByFloats(0.5, 1, 0.5),
    scene
  );

  scene.activeCamera = camera;

  camera.upVector = new Vector3(0, 0, -1);
  camera.attachControl(false);
  camera.target = new Vector3(position.x / 2, 0, position.z / 2);
  camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
  camera.inputs.attached.mouse.detachControl();
  camera.layerMask = 1;

  scene.activeCameras?.push(camera);

  if (position.x < 4096 && position.z < 4096) {
    const minimapCamera = new FreeCamera(
      'Minimap',
      position.multiplyByFloats(0.5, 1, 0.5),
      scene
    );

    minimapCamera.upVector = new Vector3(0, 0, -1);
    minimapCamera.target = new Vector3(position.x / 2, 0, position.z / 2);
    minimapCamera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
    minimapCamera.layerMask = 1;

    scene.activeCameras?.push(minimapCamera);

    resizeOrtographicMinimapCameraViewport(scene, position.x, position.z);

    const minimapPipeline = new MinimapPipeline(scene, position.x, position.z);
    minimapPipeline.initializePostProcess();
  }

  resizeOrtographicCameraViewport(scene, initialZoom);
}

export function resizeOrtographicCameraViewport(scene: Scene, zoom: number) {
  const camera = getCamera(scene, 'Main') as FreeCamera;

  const viewportWidth = scene.getEngine().getRenderWidth();
  const viewportHeight = scene.getEngine().getRenderHeight();

  const widthHalfRatio = (viewportWidth / 2) * (1 / zoom);
  const heightHalfRatio = (viewportHeight / 2) * (1 / zoom);

  camera.orthoTop = heightHalfRatio;
  camera.orthoBottom = -heightHalfRatio;
  camera.orthoLeft = -widthHalfRatio;
  camera.orthoRight = widthHalfRatio;
}

export function resizeOrtographicMinimapCameraViewport(
  scene: Scene,
  width: number,
  height: number
) {
  const camera = getCamera(scene, 'Minimap') as FreeCamera;

  if (!camera) {
    return;
  }

  const screenWidth = scene.getEngine().getRenderWidth();
  const screenHeight = scene.getEngine().getRenderHeight();

  const aspectRatio = Math.min(
    MINIMAP_MAX_SIZE / width,
    MINIMAP_MAX_SIZE / height
  );

  const xOffset = MINIMAP_OFFSET / screenWidth;
  const yOffset = MINIMAP_OFFSET / screenHeight;
  const minimapWidth = (aspectRatio * width) / screenWidth;
  const minimapHeight = (aspectRatio * height) / screenHeight;

  camera.viewport = new Viewport(
    xOffset,
    1 - yOffset - minimapHeight,
    minimapWidth,
    minimapHeight
  );

  camera.orthoTop = height / 2;
  camera.orthoBottom = -height / 2;
  camera.orthoLeft = -width / 2;
  camera.orthoRight = width / 2;
}

export function getCamera(scene: Scene, name: string): Camera | undefined {
  const cameras = scene.activeCameras?.filter(x => x.name === name);

  if (!cameras?.length) {
    return undefined;
  }

  return cameras[0];
}

export function hasMinimap(scene: Scene): boolean {
  return (
    (scene.activeCameras?.filter(x => x.name === 'Minimap').length ?? 0) > 0
  );
}
