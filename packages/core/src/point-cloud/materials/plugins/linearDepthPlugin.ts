import {
  MaterialPluginBase,
  Camera,
  UniformBuffer,
  Scene,
  Engine,
  SubMesh,
  Material,
  Nullable
} from '@babylonjs/core';

export class LinearDepthMaterialPlugin extends MaterialPluginBase {
  get isEnabled() {
    return this._isEnabled;
  }

  set isEnabled(enabled) {
    if (this._isEnabled === enabled) {
      return;
    }
    this._isEnabled = enabled;
    this.markAllDefinesAsDirty();
    this._enable(this._isEnabled);
  }

  _isEnabled = false;

  constructor(material: Material) {
    super(material, 'LinearDepth', 1001);
  }

  getClassName() {
    return 'LinearDepthMaterialPlugin';
  }

  getUniforms() {
    return {
      ubo: [
        { name: 'nearPlane', size: 1, type: 'float' },
        { name: 'farPlane', size: 1, type: 'float' }
      ],
      vertex: `
        uniform float nearPlane;
        uniform float farPlane;
    `
    };
  }

  public bindForSubMesh(
    uniformBuffer: UniformBuffer,
    scene: Scene,
    engine: Engine,
    subMesh: SubMesh
  ) {
    const activeCamera: Camera = scene.activeCameras?.find((camera: Camera) => {
      return !camera.name.startsWith('GUI');
    }) as Camera;

    uniformBuffer.updateFloat('nearPlane', activeCamera.minZ);
    uniformBuffer.updateFloat('farPlane', activeCamera.maxZ);
  }

  getCustomCode(shaderType: string): Nullable<{ [pointName: string]: string }> {
    return shaderType === 'vertex'
      ? {
          CUSTOM_VERTEX_DEFINITIONS: `
              varying float vDepthMetric;
          `,
          CUSTOM_VERTEX_MAIN_END: `
              vDepthMetric = (gl_Position.w + nearPlane) / farPlane;
          `
        }
      : {
          CUSTOM_FRAGMENT_DEFINITIONS: `
              varying float vDepthMetric;
          `,
          CUSTOM_FRAGMENT_MAIN_END: `
              gl_FragColor = vec4(vDepthMetric, 0.0, 0.0, 1.0);
          `
        };
  }
}
