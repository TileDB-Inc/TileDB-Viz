import {
  MaterialPluginBase,
  Camera,
  RenderTargetTexture
} from '@babylonjs/core';

export class AdditiveProximityMaterialPlugin extends MaterialPluginBase {
  linearDepthTexture: RenderTargetTexture = null;
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

  constructor(material) {
    super(material, 'AdditiveProximity', 1001);
  }

  getSamplers(samplers) {
    samplers.push('linearDepthTexture');
  }

  getUniforms() {
    return {
      ubo: [
        { name: 'nearPlane', size: 1, type: 'float' },
        { name: 'farPlane', size: 1, type: 'float' },
        { name: 'blendLimit', size: 1, type: 'float' }
      ],
      vertex: `
                uniform float nearPLane;
                uniform float farPlane;
                uniform float blendLimit;
            `
    };
  }

  bindForSubMesh(uniformBuffer, scene, engine, subMesh) {
    if (this._isEnabled) {
      const activeCamera: Camera | undefined = scene.activeCameras?.find(
        (camera: Camera) => {
          return !camera.name.startsWith('GUI');
        }
      );

      uniformBuffer.updateFloat('nearPlane', activeCamera.minZ);
      uniformBuffer.updateFloat('farPlane', activeCamera.maxZ);
      uniformBuffer.updateFloat(
        'blendLimit',
        this.blendLimit / (activeCamera.maxZ - activeCamera.minZ)
      );

      uniformBuffer.setTexture('linearDepthTexture', this.linearDepthTexture);
    }
  }

  getClassName() {
    return 'AdditiveProximityMaterialPlugin';
  }

  getCustomCode(shaderType) {
    return shaderType === 'vertex'
      ? {
          CUSTOM_VERTEX_DEFINITIONS: `
                    varying float vDepthMetric;
                `,
          CUSTOM_VERTEX_MAIN_END: `
                    vDepthMetric = (gl_Position.z + nearPlane) / farPlane;
                `
        }
      : {
          CUSTOM_FRAGMENT_DEFINITIONS: `
                    uniform highp sampler2D linearDepthTexture;
                    varying float vDepthMetric;
                `,
          CUSTOM_FRAGMENT_MAIN_END: `
                    float depth = texture(linearDepthTexture, gl_FragCoord.xy / 1000.0).r; 
    
                    if (abs(depth - vDepthMetric) > blendLimit)
                    {
                        gl_FragColor = vec4(0.0);
                    }
                `
        };
  }
}
