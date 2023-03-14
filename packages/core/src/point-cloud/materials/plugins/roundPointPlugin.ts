import { MaterialPluginBase, Camera } from '@babylonjs/core';

export class RoundPointMaterialPlugin extends MaterialPluginBase {
  radius = 1;
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
    super(material, 'RoundPoint', 1001);
  }

  getUniforms() {
    return {
      ubo: [
        { name: 'slope', size: 1, type: 'float' },
        { name: 'half_height', size: 1, type: 'float' },
        { name: 'radius', size: 1, type: 'float' }
      ],
      vertex: `
            uniform float slope;
            uniform float half_height;
            uniform float radius;
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

      uniformBuffer.updateFloat('slope', Math.tan(activeCamera.fov / 2));
      uniformBuffer.updateFloat('half_height', engine._gl.canvas.height / 2);
      uniformBuffer.updateFloat('radius', this.radius);
    }
  }

  getClassName() {
    return 'RoundPointMaterialPlugin';
  }

  getCustomCode(shaderType) {
    return shaderType === 'vertex'
      ? {
          CUSTOM_VERTEX_MAIN_END: `
                    gl_PointSize =  (radius * half_height) / (slope * gl_Position.z);
                  `
        }
      : {
          CUSTOM_FRAGMENT_MAIN_BEGIN: `
                if (length(gl_PointCoord.xy - vec2(0.5)) > 0.5)
                {
                    discard;
                }
            `
        };
  }
}
