import {
  MaterialPluginBase,
  Material,
  AbstractMesh,
  Scene,
  Nullable,
  MaterialDefines,
  Engine,
  SubMesh,
  UniformBuffer
} from '@babylonjs/core';
import { Feature, FeatureType } from '@tiledb-inc/viz-common';

export class CategoricalMaterialPlugin extends MaterialPluginBase {
  private _isEnabled = false;
  private _feature?: Feature;
  private _colorScheme: Float32Array;
  private _groupMap: Float32Array;

  public get colorScheme(): Float32Array {
    return this._colorScheme;
  }

  public set colorScheme(value: Float32Array) {
    this._colorScheme = value;
  }

  public get groupMap(): Float32Array {
    return this._groupMap;
  }

  public set groupMap(value: Float32Array) {
    this._groupMap = value;
  }

  public get feature(): Feature | undefined {
    return this._feature;
  }

  public set feature(value: Feature | undefined) {
    this._feature = value;

    this.markAllDefinesAsDirty();
  }

  constructor(material: Material) {
    super(material, 'Categorical', 199, {
      FEATURE_TYPE: FeatureType.NON_RENDERABLE
    });

    this._colorScheme = new Float32Array(128).fill(1);
    this._groupMap = new Float32Array(512).fill(32);
  }

  getUniforms(): {
    ubo?:
      | {
          name: string;
          size?: number | undefined;
          type?: string | undefined;
          arraySize?: number | undefined;
        }[]
      | undefined;
    vertex?: string | undefined;
    fragment?: string | undefined;
  } {
    return {
      ubo: [
        { name: 'colorScheme', size: 4, type: 'vec4', arraySize: 32 },
        { name: 'groupMap', size: 4, type: 'vec4', arraySize: 192 }
        // Arbitrary upper limit to conform with 896 minimum. Deprecating WebGL2 will result in removing that limit
        // Workaround for alignment issue with float/int array
      ]
    };
  }

  getClassName(): string {
    return 'CategoricalMaterialPlugin';
  }

  getAttributes(attributes: string[], scene: Scene, mesh: AbstractMesh): void {
    attributes.push('group');
  }

  prepareDefinesBeforeAttributes(
    defines: MaterialDefines,
    scene: Scene,
    mesh: AbstractMesh
  ): void {
    defines['FEATURE_TYPE'] = this._feature?.type ?? FeatureType.NON_RENDERABLE;
  }

  getCustomCode(shaderType: string): Nullable<{ [pointName: string]: string }> {
    switch (shaderType) {
      case 'vertex':
        return {
          CUSTOM_VERTEX_DEFINITIONS: `
            #if (FEATURE_TYPE == ${FeatureType.CATEGORICAL})
              attribute int group;

              flat varying vec4 vColor;
            #endif
          `,
          CUSTOM_VERTEX_MAIN_END: `
            #if (FEATURE_TYPE == ${FeatureType.CATEGORICAL})
              int category = int(groupMap[group / 4][group % 4]);
              if (category > 31) {
                vColor = vec4(0.0);
              }
              else {
                vColor = colorScheme[category];
              }
            #endif
          `
        };
      case 'fragment':
        return {
          CUSTOM_FRAGMENT_DEFINITIONS: `
            #if (FEATURE_TYPE == ${FeatureType.CATEGORICAL})
              flat varying vec4 vColor;
            #endif
          `,
          CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
            #if (FEATURE_TYPE == ${FeatureType.CATEGORICAL})
              if (vColor.a == 0.0) {
                discard;
              }

              diffuseColor = vColor.rgb;
            #endif
          `
        };
      default:
        return null;
    }
  }

  bindForSubMesh(
    uniformBuffer: UniformBuffer,
    scene: Scene,
    engine: Engine,
    subMesh: SubMesh
  ): void {
    if (!this._isEnabled) {
      return;
    }

    uniformBuffer.updateFloatArray('colorScheme', this._colorScheme);
    uniformBuffer.updateFloatArray('groupMap', this._groupMap);
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
