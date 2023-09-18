import { Scene, Camera, Effect, PostProcess } from '@babylonjs/core';
import { getCamera } from '../utils';

export class MinimapPipeline {
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

    Effect.ShadersStore['MinimapPostProcessFragmentShader'] = `
        precision highp float;
  
        varying vec2 vUV;
        uniform sampler2D textureSampler;

        uniform vec4 visibleArea; // L-T-R-B
        const vec4 border = vec4(0, 0, 1, 1);

        float sdAxisAlignedRect(vec2 uv, vec2 tl, vec2 br)
        {
          vec2 d = max(tl-uv, uv-br);
          return length(max(vec2(0.0), d)) + min(0.0, max(d.x, d.y));
        }
  
        void main(void)
        {
          vec3 baseColor = texture2D(textureSampler, vUV).rgb;

          float dist = sdAxisAlignedRect(vUV, visibleArea.xy, visibleArea.zw);
          float borderDist = sdAxisAlignedRect(vUV, border.xy, border.zw);

          baseColor.rgb = mix(vec3(0.0, 0.0, 0.0), baseColor.rgb, 1.0 - 1.0 / (350.0 * abs(borderDist) + 1.0));

          if (dist <= 0.0)
          {
            baseColor.rgb = mix(vec3(1.0, 0.0, 0.0), baseColor.rgb, 1.0 - 1.0 / (50.0 * abs(dist) + 1.0));
          }

          gl_FragColor = vec4(baseColor, 1.0);
        }
      `;

    this.postProcess = new PostProcess(
      'Minimap post process',
      'MinimapPostProcess',
      ['visibleArea'],
      null,
      1.0,
      this.camera
    );

    this.postProcess.enablePixelPerfectMode = true;

    this.postProcess.onApply = (effect: Effect) => {
      const mainCamera = getCamera(this.scene, 'Main');

      if (!mainCamera) {
        return;
      }

      const top =
        Math.min(
          this.baseHeight,
          Math.max(mainCamera.position.z + (mainCamera?.orthoTop ?? 0), 0)
        ) / this.baseHeight;
      const bottom =
        Math.min(
          this.baseHeight,
          Math.max(mainCamera.position.z + (mainCamera?.orthoBottom ?? 0), 0)
        ) / this.baseHeight;
      const left =
        Math.min(
          this.baseWidth,
          Math.max(mainCamera.position.x + (mainCamera?.orthoLeft ?? 0), 0)
        ) / this.baseWidth;
      const right =
        Math.min(
          this.baseWidth,
          Math.max(mainCamera.position.x + (mainCamera?.orthoRight ?? 0), 0)
        ) / this.baseWidth;

      effect.setArray4('visibleArea', [left, 1 - top, right, 1 - bottom]);
    };
  }
}
