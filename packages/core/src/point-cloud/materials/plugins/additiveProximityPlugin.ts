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
        { name: 'blendLimit', size: 1, type: 'float' },
        { name: 'width', size: 1, type: 'float' },
        { name: 'height', size: 1, type: 'float' }
      ],
      vertex: `
            uniform float nearPlane;
            uniform float farPlane;
            uniform float blendLimit;
            uniform float width;
            uniform float height;
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

      uniformBuffer.updateFloat('width', engine._gl.canvas.width);
      uniformBuffer.updateFloat('height', engine._gl.canvas.height);

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
              float depth = texture(linearDepthTexture, vec2(gl_FragCoord.x / width, gl_FragCoord.y / height)).r; 

              if (abs(depth - vDepthMetric) < blendLimit)
              {
                float distance = length(gl_PointCoord.xy - vec2(0.5)) / 0.5;
    
                float weight = pow(1.0 - pow(distance, 2.0), 1.5);
                gl_FragColor = vec4(gl_FragColor.rgb * weight, weight);
              }
              else
              {
                discard;
              }
          `
        };
  }
}
