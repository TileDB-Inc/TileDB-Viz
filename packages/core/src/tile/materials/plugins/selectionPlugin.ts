import {
  MaterialPluginBase,
  Material,
  AbstractMesh,
  Scene,
  Nullable
} from '@babylonjs/core';

export class SelectionMaterialPlugin extends MaterialPluginBase {
  private _isEnabled = false;

  constructor(material: Material) {
    super(material, 'Selection', 200);
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
            attribute float state;

            flat varying float uState;
          `,
          CUSTOM_VERTEX_MAIN_END: `
            uState = state;
          `
        };
      case 'fragment':
        return {
          CUSTOM_FRAGMENT_DEFINITIONS: `
            const vec3 selectionColor = vec3(0.0, 1.0, 0.0);
            const vec3 pickColor = vec3(1.0, 0.0, 0.0);

            flat varying float uState;
          `,
          CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
            if (uState == 1.0) {
              diffuseColor = selectionColor;
            }
            else if (uState == 2.0) {
              diffuseColor = pickColor;
            }
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
