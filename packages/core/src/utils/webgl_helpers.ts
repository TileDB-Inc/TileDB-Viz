import { Scene } from '@babylonjs/core';

export function getWebGLExtension(name: string, scene: Scene): boolean {
  const ext = scene
    .getEngine()
    .getRenderingCanvas()
    ?.getContext('webgl2')
    ?.getExtension(name);

  return ext !== undefined && ext !== null;
}
