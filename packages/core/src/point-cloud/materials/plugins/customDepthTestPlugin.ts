import {
  MaterialPluginBase,
  Camera,
  RenderTargetTexture,
  UniformBuffer,
  Scene,
  Engine,
  SubMesh,
  Material,
  Nullable
} from '@babylonjs/core';

export class CustomDepthTestMaterialPlugin extends MaterialPluginBase {
  linearDepthTexture!: RenderTargetTexture;
  blendLimit = 1;

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
    super(material, 'CustomDepthTest', 1001);
  }

  public getSamplers(samplers: string[]): void {
    samplers.push('linearDepthTexture');
  }

  getUniforms() {
    return {
      ubo: [
        { name: 'nearPlane', size: 1, type: 'float' },
        { name: 'farPlane', size: 1, type: 'float' },
        { name: 'width', size: 1, type: 'float' },
        { name: 'height', size: 1, type: 'float' }
      ],
      vertex: `
          uniform float nearPlane;
          uniform float farPlane;
          uniform float width;
          uniform float height;
      `,
      fragment: `
        uniform float width;
        uniform float height;
      `
    };
  }

  public bindForSubMesh(
    uniformBuffer: UniformBuffer,
    scene: Scene,
    engine: Engine,
    subMesh: SubMesh
  ) {
    if (this._isEnabled) {
      const activeCamera: Camera = scene.activeCameras?.find(
        (camera: Camera) => {
          return !camera.name.startsWith('GUI');
        }
      ) as Camera;

      uniformBuffer.updateFloat('nearPlane', activeCamera.minZ);
      uniformBuffer.updateFloat('farPlane', activeCamera.maxZ);

      uniformBuffer.updateFloat('width', engine.getRenderWidth());
      uniformBuffer.updateFloat('height', engine.getRenderHeight());

      uniformBuffer.setTexture('linearDepthTexture', this.linearDepthTexture);
    }
  }

  getClassName() {
    return 'CustomDepthTestMaterialPlugin';
  }

  getCustomCode(shaderType: string): Nullable<{ [pointName: string]: string }> {
    return shaderType === 'vertex'
      ? {
          CUSTOM_VERTEX_DEFINITIONS: `
                varying float vDepthMetric;
              `,
          CUSTOM_VERTEX_MAIN_END: `
                vDepthMetric = (gl_Position.w + nearPlane + 10.0) / farPlane;
              `
        }
      : {
          CUSTOM_FRAGMENT_DEFINITIONS: `
                  uniform highp sampler2D linearDepthTexture;
                  varying float vDepthMetric;
              `,
          CUSTOM_FRAGMENT_MAIN_BEGIN: `
                float depth = texture(linearDepthTexture, vec2(gl_FragCoord.x / width, gl_FragCoord.y / height)).r; 
      
                if (vDepthMetric > depth)
                {
                  discard;
                }
            `
        };
  }
}
