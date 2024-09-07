import {
  Scene,
  Camera,
  Effect,
  PostProcess,
  ArcRotateCamera,
  ShaderStore,
  ShaderLanguage,
  StorageBuffer,
  WebGPUEngine
} from '@babylonjs/core';
import { getCamera } from '../utils/camera-utils';
import { getViewArea } from '../utils/helpers';

export class MinimapPipelineWebGPU {
  private scene: Scene;
  private postProcess!: PostProcess;
  private baseWidth: number;
  private baseHeight: number;
  private camera?: Camera;

  constructor(scene: Scene, baseWidth: number, baseHeight: number) {
    this.scene = scene;

    this.camera = getCamera(this.scene, 'Minimap');
    this.baseWidth = baseWidth;
    this.baseHeight = baseHeight;
  }

  initializePostProcess() {
    if (!this.camera) {
      return;
    }

    ShaderStore.ShadersStoreWGSL['MinimapPostProcessFragmentShader'] = `
        var textureSampler: texture_2d<f32>;
        var textureSamplerSampler: sampler;

        varying vUV: vec2<f32>;

        struct Options {
          visibleArea: vec4<f32> // L-T-R-B
        }

        var<storage, read> options: Options;
        const border: vec4<f32> = vec4<f32>(0, 0, 1, 1);

        fn sdAxisAlignedRect(uv: vec2<f32>, tl: vec2<f32>, br: vec2<f32>) -> f32
        {
          var d: vec2<f32> = max(tl-uv, uv-br);
          return length(max(vec2(0.0), d)) + min(0.0, max(d.x, d.y));
        }
  
        @fragment
        fn main(input : FragmentInputs) -> FragmentOutputs {
          var baseColor: vec3<f32> = textureSample(textureSampler, textureSamplerSampler, fragmentInputs.vUV).rgb;

          var dist: f32 = sdAxisAlignedRect(fragmentInputs.vUV, options.visibleArea.xy, options.visibleArea.zw);
          var borderDist: f32 = sdAxisAlignedRect(fragmentInputs.vUV, border.xy, border.zw);

          baseColor = mix(vec3<f32>(0.0, 0.0, 0.0), baseColor, 1.0 - 1.0 / (350.0 * abs(borderDist) + 1.0));

          if (dist <= 0.0)
          {
            baseColor = mix(vec3<f32>(1.0, 0.0, 0.0), baseColor, 1.0 - 1.0 / (50.0 * abs(dist) + 1.0));
          }

          fragmentOutputs.color = vec4<f32>(baseColor, 1.0);
        }
      `;

    this.postProcess = new PostProcess(
      'Minimap Post Process',
      'MinimapPostProcess',
      {
        camera: this.camera,
        engine: this.scene.getEngine(),
        reusable: true,
        shaderLanguage: ShaderLanguage.WGSL,
        uniformBuffers: ['options']
      }
    );

    this.postProcess.enablePixelPerfectMode = true;
    const buffer = new StorageBuffer(
      this.scene.getEngine() as WebGPUEngine,
      16
    );

    this.postProcess.onApplyObservable.add((effect: Effect) => {
      const mainCamera = getCamera(this.scene, 'Main') as ArcRotateCamera;

      if (!mainCamera) {
        return;
      }

      (effect.getEngine() as WebGPUEngine).setTextureSampler(
        'textureSamplerSampler',
        this.postProcess.inputTexture.texture
      );

      // effect.setTextureSampler(
      //   'textureSamplerSampler',
      //   this.postProcess.inputTexture.texture
      // );

      const pointTR = {
        x: mainCamera?.orthoRight ?? 0,
        z: mainCamera?.orthoTop ?? 0
      };
      const pointBR = {
        x: mainCamera?.orthoRight ?? 0,
        z: mainCamera?.orthoBottom ?? 0
      };
      const center = { x: mainCamera.target.x, z: -mainCamera.target.z };

      let [bottom, top, left, right] = getViewArea(
        pointTR,
        pointBR,
        center,
        mainCamera.beta,
        mainCamera.alpha
      );

      top = Math.max(Math.min(this.baseHeight, top), 0) / this.baseHeight;
      bottom = Math.max(Math.min(this.baseHeight, bottom), 0) / this.baseHeight;
      left = Math.max(Math.min(this.baseWidth, left), 0) / this.baseWidth;
      right = Math.max(Math.min(this.baseWidth, right), 0) / this.baseWidth;

      buffer.update(new Float32Array([left, 1 - top, right, 1 - bottom]));
      (effect.getEngine() as WebGPUEngine).setStorageBuffer('options', buffer);
      //effect.setStorageBuffer('options', buffer);
    });
  }
}
