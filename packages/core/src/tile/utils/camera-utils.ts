import { FreeCamera, Scene, Vector3 } from '@babylonjs/core';
export function setupCamera(
  scene: Scene,
  initialZoom: number,
  position: Vector3
) {
  const camera = new FreeCamera('Free', position, scene);

  scene.activeCamera = camera;

  camera.upVector = new Vector3(0, 0, -1);
  camera.attachControl(false);
  camera.target = new Vector3(position.x, 0, position.z);
  camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
  camera.inputs.attached.mouse.detachControl();

  scene.activeCamera = camera;

  resizeOrtographicCameraViewport(scene, initialZoom);
}

export function resizeOrtographicCameraViewport(scene: Scene, zoom: number) {
  if (!scene.activeCamera) {
    throw new Error('Scene does not contain an active camera');
  }

  const viewportWidth = scene.getEngine().getRenderWidth();
  const viewportHeight = scene.getEngine().getRenderHeight();

  const widthHalfRatio = (viewportWidth / 2) * (1 / zoom);
  const heightHalfRatio = (viewportHeight / 2) * (1 / zoom);

  scene.activeCamera.orthoTop = heightHalfRatio;
  scene.activeCamera.orthoBottom = -heightHalfRatio;
  scene.activeCamera.orthoLeft = -widthHalfRatio;
  scene.activeCamera.orthoRight = widthHalfRatio;
}
