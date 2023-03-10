import { MaterialPluginBase } from '@babylonjs/core';

export class RoundPointMaterialPlugin extends MaterialPluginBase {
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

  getClassName() {
    return 'RoundPointMaterialPlugin';
  }

  getCustomCode(shaderType) {
    return shaderType === 'vertex'
      ? null
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
