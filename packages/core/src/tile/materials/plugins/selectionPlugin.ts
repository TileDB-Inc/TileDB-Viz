import {
  MaterialPluginBase,
  Material,
  AbstractMesh,
  Scene,
  Nullable
} from '@babylonjs/core';

export class SelectionMaterialPlugin extends MaterialPluginBase {
  private _isEnabled = false;
  private isWebGPU = false;

  constructor(material: Material) {
    super(material, 'Selection', 200);

    this.isWebGPU = material.getScene().getEngine().isWebGPU;
  }

  getClassName(): string {
    return 'SelectionMaterialPlugin';
  }

  getAttributes(attributes: string[], scene: Scene, mesh: AbstractMesh): void {
    attributes.push('state');
  }

  getCustomCode(shaderType: string): Nullable<{ [pointName: string]: string }> {
    switch (shaderType) {
      case 'vertex':
        return {
          CUSTOM_VERTEX_DEFINITIONS: `
            attribute ${this.isWebGPU ? 'uint' : 'float'} state;
            
            const vec4 selectionColor = vec4(0.0, 1.0, 0.0, 1.0);
            const vec4 pickColor = vec4(1.0, 0.0, 0.0, 1.0);

            flat varying vec4 vColor;
          `,
          CUSTOM_VERTEX_MAIN_END: `
            if (state == ${this.isWebGPU ? '1u' : '1.0'}) {
              vColor = selectionColor;
            }
            else if (state == ${this.isWebGPU ? '2u' : '2.0'}) {
              vColor = pickColor;
            }
            else {
              vColor = vec4(0.0);
            }
          `
        };
      case 'fragment':
        return {
          CUSTOM_FRAGMENT_DEFINITIONS: `
            flat varying vec4 vColor;
          `,
          CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
            diffuseColor = mix(diffuseColor, vColor.rgb, vColor.a);
          `
        };
      default:
        return null;
    }
  }

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  set isEnabled(enabled: boolean) {
    if (this._isEnabled === enabled) {
      return;
    }
    this._isEnabled = enabled;
    // when it's changed, we need to mark the material as dirty so the shader is rebuilt.
    this.markAllDefinesAsDirty();
    this._enable(this._isEnabled);
  }
}
