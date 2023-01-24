import {
  ArcRotateCamera,
  Color3,
  DirectionalLight,
  FreeCamera,
  HemisphericLight,
  Scene,
  Vector3
} from '@babylonjs/core';
import { TileDBPointCloudOptions } from './tiledb-pc';

export function setCameraLight(
  scene: Scene,
  options: TileDBPointCloudOptions,
  dataBounds: Array<number>,
  translationVector: Vector3,
  moveSpeed: number,
  wheelPrecision: number
) {
  const cameraZoomOut = options.cameraZoomOut || [1, 1, 1];
  const cameraLocation = options.cameraLocation || 1;
  const cameraUp = options.cameraUp || 0;

  const centreWorld = new Vector3(
    (dataBounds[1] + dataBounds[0]) / 2 - translationVector.x,
    dataBounds[4] - translationVector.y,
    (dataBounds[3] + dataBounds[2]) / 2 - translationVector.z
  );

  const centreFreeWorld = new Vector3(
    (dataBounds[1] + dataBounds[0]) / 2 - translationVector.x,
    dataBounds[4] + cameraUp - translationVector.y,
    (dataBounds[3] + dataBounds[2]) / 2 - translationVector.z
  );

  const cameraPosition = setCameraPosition(
    dataBounds,
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

  if (wheelPrecision > 0) {
    camera0.wheelPrecision = wheelPrecision;
  }

  camera0.setTarget(centreWorld);
  camera0.setPosition(cameraPosition);

  // freeCamera
  const camera1 = new FreeCamera('Free', centreFreeWorld, scene);
  camera1.minZ = camera0.minZ;
  camera1.maxZ = camera0.maxZ;

  if (moveSpeed > 0) {
    camera1.speed = moveSpeed;
  } else {
    camera1.speed = 1;
  }

  //camera1.position = centreFreeWorld;

  // freeCamera shortcuts
  camera1.keysUp.push(87); // W
  camera1.keysDown.push(83); // D
  camera1.keysLeft.push(65); // A
  camera1.keysRight.push(68); // S
  camera1.keysUpward.push(69); // E
  camera1.keysDownward.push(81); // Q

  // arcRotate GUI camera
  const camera2 = new ArcRotateCamera(
    'GUI ArcRotate',
    Math.PI / 3,
    Math.PI / 4.5,
    25,
    Vector3.Zero(),
    scene
  );
  camera2.layerMask = 0x10000000;

  camera2.setTarget(centreWorld);
  camera2.setPosition(cameraPosition);

  // freeCamera GUI
  const camera3 = new FreeCamera('GUI Free', centreFreeWorld, scene);
  camera3.minZ = camera2.minZ;
  camera3.maxZ = camera2.maxZ;
  camera3.layerMask = 0x10000000;

  //camera3.position = centreFreeWorld;

  const cameras: Array<ArcRotateCamera | FreeCamera> = new Array<
    ArcRotateCamera | FreeCamera
  >();
  cameras.push(camera0, camera1, camera2, camera3);

  cameras[0].attachControl(true);
  cameras[2].attachControl(true);
  scene.activeCameras = [cameras[0], cameras[2]];

  //cameras[1].attachControl(true);
  //cameras[3].attachControl(true);
  //scene.activeCameras = [cameras[1], cameras[3]];

  // add general light
  const light1: HemisphericLight = new HemisphericLight(
    'light1',
    camera0.position,
    scene
  );
  light1.intensity = 0.9;
  light1.specular = Color3.Black();

  // add light for generating shadows
  const light2: DirectionalLight = new DirectionalLight(
    'Point',
    camera0.cameraDirection,
    scene
  );
  light2.position = camera0.position;
  light2.intensity = 0.7;
  light2.specular = Color3.Black();

  return cameras;
}
export function setCameraPosition(
  dataBounds: number[],
  translationVector: Vector3,
  cameraZoomOut: number[],
  cameraLocation: number
) {
  let cameraVector = Vector3.Zero();
  const spanX = (dataBounds[1] - dataBounds[0]) / 2.0;
  const spanY = (dataBounds[3] - dataBounds[2]) / 2.0;

  if (cameraLocation === 1) {
    cameraVector = new Vector3(
      dataBounds[0] + spanX,
      dataBounds[5],
      dataBounds[2]
    );
  } else if (cameraLocation === 8) {
    cameraVector = new Vector3(dataBounds[0], dataBounds[5], dataBounds[2]);
  } else if (cameraLocation === 7) {
    cameraVector = new Vector3(
      dataBounds[0],
      dataBounds[5],
      dataBounds[2] + spanY
    );
  } else if (cameraLocation === 6) {
    cameraVector = new Vector3(dataBounds[0], dataBounds[5], dataBounds[3]);
  } else if (cameraLocation === 5) {
    cameraVector = new Vector3(
      dataBounds[0] + spanX,
      dataBounds[5],
      dataBounds[3]
    );
  } else if (cameraLocation === 4) {
    cameraVector = new Vector3(dataBounds[1], dataBounds[5], dataBounds[3]);
  } else if (cameraLocation === 3) {
    cameraVector = new Vector3(
      dataBounds[1],
      dataBounds[5],
      dataBounds[2] + spanY
    );
  } else if (cameraLocation === 2) {
    cameraVector = new Vector3(dataBounds[1], dataBounds[5], dataBounds[2]);
  } else if (cameraLocation === 9) {
    cameraVector = new Vector3(
      dataBounds[0] + spanX,
      dataBounds[5],
      dataBounds[2] + spanY
    );
  }

  const cameraPosition = new Vector3(
    (cameraVector.x - translationVector.x) * cameraZoomOut[0],
    (cameraVector.y - translationVector.y) * cameraZoomOut[2],
    (cameraVector.z - translationVector.z) * cameraZoomOut[1]
  );
  return cameraPosition;
}
