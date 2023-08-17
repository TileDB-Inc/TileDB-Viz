import {
  ArcRotateCamera,
  Color3,
  DirectionalLight,
  FreeCamera,
  HemisphericLight,
  Scene,
  Vector3,
  ArcRotateCameraPointersInput
} from '@babylonjs/core';
import { TileDBPointCloudOptions } from './tiledb-pc';

export function setCameraLight(
  scene: Scene,
  options: TileDBPointCloudOptions,
  conformingBounds: Array<number>,
  translationVector: Vector3,
  moveSpeed: number,
  wheelPrecision: number
) {
  const cameraZoomOut = options.cameraZoomOut || [1, 1, 1];
  const cameraLocation = options.cameraLocation || 1;
  const cameraUp = options.cameraUp || 0;

  const centreWorld = new Vector3(
    0,
    conformingBounds[4] - translationVector.y,
    0
  );

  const centreFreeWorld = new Vector3(
    0,
    conformingBounds[4] + cameraUp - translationVector.y,
    0
  );

  const cameraPosition = setCameraPosition(
    conformingBounds,
    translationVector,
    cameraZoomOut,
    cameraLocation
  );

  // arcRotateCamera
  const camera0 = new ArcRotateCamera(
    'ArcRotate',
    Math.PI / 3,
    Math.PI / 4.5,
    25,
    Vector3.Zero(),
    scene
  );

  camera0.layerMask = 1;

  if (wheelPrecision > 0) {
    camera0.wheelPrecision = wheelPrecision;
  }

  camera0.setTarget(centreWorld);
  camera0.setPosition(cameraPosition);
  camera0.minZ = options.cameraNearPlane || 1;
  camera0.maxZ = options.cameraFarPlane || 10000;
  camera0.fov = options.cameraFOV || 0.8;
  (
    camera0.inputs.attached['pointers'] as ArcRotateCameraPointersInput
  ).useNaturalPinchZoom = true;

  // freeCamera
  const camera1 = new FreeCamera('Free', centreFreeWorld, scene);
  camera1.minZ = camera0.minZ;
  camera1.maxZ = camera0.maxZ;
  camera1.layerMask = 1;

  if (moveSpeed > 0) {
    camera1.speed = moveSpeed;
  } else {
    camera1.speed = 1;
  }

  // freeCamera shortcuts
  camera1.keysUp.push(87); // W
  camera1.keysDown.push(83); // D
  camera1.keysLeft.push(65); // A
  camera1.keysRight.push(68); // S
  camera1.keysUpward.push(69); // E
  camera1.keysDownward.push(81); // Q

  const cameras: Array<ArcRotateCamera | FreeCamera> = new Array<
    ArcRotateCamera | FreeCamera
  >();
  cameras.push(camera0, camera1);

  cameras[0].attachControl(false);
  scene.activeCameras = [cameras[0]];

  // add general lights
  const cameraLight: HemisphericLight = new HemisphericLight(
    'cameraLight',
    camera0.cameraDirection,
    scene
  );
  cameraLight.intensity = 0.8;
  cameraLight.specular = Color3.Black();

  const downLight: HemisphericLight = new HemisphericLight(
    'downLight',
    new Vector3(0, 1, 0),
    scene
  );
  downLight.intensity = 1.0;
  downLight.specular = Color3.Black();

  // add light for generating shadows
  const shadowLight: DirectionalLight = new DirectionalLight(
    'shadowLight',
    camera0.cameraDirection,
    scene
  );
  shadowLight.position = camera0.position;
  shadowLight.intensity = 0.7;
  shadowLight.specular = Color3.Black();

  return cameras;
}

export function setCameraPosition(
  conformingBounds: number[],
  translationVector: Vector3,
  cameraZoomOut: number[],
  cameraLocation: number
) {
  let cameraVector = Vector3.Zero();
  const spanX = (conformingBounds[1] - conformingBounds[0]) / 2.0;
  const spanY = (conformingBounds[3] - conformingBounds[2]) / 2.0;

  if (cameraLocation === 1) {
    cameraVector = new Vector3(
      conformingBounds[0] + spanX,
      conformingBounds[5],
      conformingBounds[2]
    );
  } else if (cameraLocation === 8) {
    cameraVector = new Vector3(
      conformingBounds[0],
      conformingBounds[5],
      conformingBounds[2]
    );
  } else if (cameraLocation === 7) {
    cameraVector = new Vector3(
      conformingBounds[0],
      conformingBounds[5],
      conformingBounds[2] + spanY
    );
  } else if (cameraLocation === 6) {
    cameraVector = new Vector3(
      conformingBounds[0],
      conformingBounds[5],
      conformingBounds[3]
    );
  } else if (cameraLocation === 5) {
    cameraVector = new Vector3(
      conformingBounds[0] + spanX,
      conformingBounds[5],
      conformingBounds[3]
    );
  } else if (cameraLocation === 4) {
    cameraVector = new Vector3(
      conformingBounds[1],
      conformingBounds[5],
      conformingBounds[3]
    );
  } else if (cameraLocation === 3) {
    cameraVector = new Vector3(
      conformingBounds[1],
      conformingBounds[5],
      conformingBounds[2] + spanY
    );
  } else if (cameraLocation === 2) {
    cameraVector = new Vector3(
      conformingBounds[1],
      conformingBounds[5],
      conformingBounds[2]
    );
  } else if (cameraLocation === 9) {
    cameraVector = new Vector3(
      conformingBounds[0] + spanX,
      conformingBounds[5],
      conformingBounds[2] + spanY
    );
  }

  const cameraPosition = new Vector3(
    (cameraVector.x - translationVector.x) * cameraZoomOut[0],
    (cameraVector.y - translationVector.y) * cameraZoomOut[2],
    (cameraVector.z - translationVector.z) * cameraZoomOut[1]
  );
  return cameraPosition;
}
