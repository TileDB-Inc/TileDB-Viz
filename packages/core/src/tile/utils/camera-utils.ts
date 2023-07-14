import { FreeCamera, Scene, Vector3 } from '@babylonjs/core';
export function setupCamera(scene: Scene, initialZoom: number) {
  const camera = new FreeCamera('Free', new Vector3(0, 100, 0), scene);

  scene.activeCamera = camera;

  scene.activeCamera.upVector = new Vector3(0, 0, 1);
  scene.activeCamera.attachControl(false);
  scene.activeCamera.target = Vector3.Zero();
  scene.activeCamera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
  scene.activeCamera.speed = 0.1;
  scene.activeCamera.inputs.attached.mouse.detachControl();

  resizeOrtographicCameraViewport(scene, initialZoom);
}

export function resizeOrtographicCameraViewport(scene: Scene, zoom: number) {
  const viewportWidth = scene.getEngine().getRenderWidth();
  const viewportHeight = scene.getEngine().getRenderHeight();

  const widthHalfRatio = (viewportWidth / 2) * (1 / zoom);
  const heightHalfRatio = (viewportHeight / 2) * (1 / zoom);

  scene.activeCamera.orthoTop = heightHalfRatio;
  scene.activeCamera.orthoBottom = -heightHalfRatio;
  scene.activeCamera.orthoLeft = -widthHalfRatio;
  scene.activeCamera.orthoRight = widthHalfRatio;
}
