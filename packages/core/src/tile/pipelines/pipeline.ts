import {
  Scene,
  Camera,
  Effect,
  PostProcess,
  RenderTargetTexture,
  Constants,
  Color4
} from '@babylonjs/core';
import { getCamera } from '../utils';

export class GeometryPipeline {
  private scene: Scene;
  private postProcess!: PostProcess;
  public renderTargets: RenderTargetTexture[] = [];
  private width!: number;
  private height!: number;
  private camera: Camera;

  constructor(scene: Scene) {
    this.scene = scene;

    this.camera = getCamera(this.scene, 'Main');
  }

  initializeRTTs(): RenderTargetTexture[] {
    const geometryRenderTarget = new RenderTargetTexture(
      'geometryRenderTarget',
      {
        width: this.scene.getEngine()._gl.canvas.width,
        height: this.scene.getEngine()._gl.canvas.height
      },
      this.scene,
      {
        generateDepthBuffer: true,
        format: Constants.TEXTUREFORMAT_RGBA_INTEGER,
        type: Constants.TEXTURETYPE_UNSIGNED_INTEGER,
        samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
        generateMipMaps: false
      }
    );

    geometryRenderTarget.clearColor = new Color4(0, 0, 0, 0);

    if (!geometryRenderTarget.renderTarget) {
      throw new Error('Render target initialization failed');
    }

    this.scene.customRenderTargets.push(geometryRenderTarget);
    this.renderTargets.push(geometryRenderTarget);

    return [geometryRenderTarget];
  }

  initializePostProcess() {
    this.width = this.scene.getEngine().getRenderWidth();
    this.height = this.scene.getEngine().getRenderHeight();

    Effect.ShadersStore['customFragmentShader'] = `
      precision highp float;
      precision highp int;

      varying vec2 vUV;
      uniform sampler2D textureSampler;
      uniform highp usampler2D geometryTexture;

      void main(void)
      {
        uint color = texture2D(geometryTexture, vUV).b;
        vec3 baseColor = texture2D(textureSampler, vUV).rgb;

        float red = float(color >> 24) / 255.0;
        float green = float((color << 8) >> 24) / 255.0;
        float blue = float((color << 16) >> 24) / 255.0;
        float alpha = float((color << 24) >> 24) / 255.0;

        gl_FragColor = vec4(baseColor * (1.0 - alpha) + vec3(red, green, blue) * alpha, 1.0);
      }
    `;

    this.postProcess = new PostProcess(
      'My custom post process',
      'custom',
      null,
      ['geometryTexture'],
      1.0,
      this.camera
    );

    this.postProcess.enablePixelPerfectMode = true;

    this.renderTargets[0].activeCamera = this.camera;

    this.postProcess.onApply = (effect: Effect) => {
      effect.setTexture('geometryTexture', this.renderTargets[0]);
    };
  }

  public setActiveCamera(): void {
    this.renderTargets[0].activeCamera = this.camera;

    this.camera.attachPostProcess(this.postProcess);
  }

  public resize(): void {
    this.width = this.scene.getEngine().getRenderWidth();
    this.height = this.scene.getEngine().getRenderHeight();

    this.renderTargets[0].resize({ height: this.height, width: this.width });

    if (!this.renderTargets[0].renderTarget) {
      throw new Error('Render target initialization failed');
    }
  }
}
