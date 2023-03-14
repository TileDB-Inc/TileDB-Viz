import {
  Scene,
  Camera,
  Effect,
  PostProcess,
  RenderTargetTexture,
  Constants,
  Color4
} from '@babylonjs/core';

export class SPSHighQualitySplats {
  private scene: Scene;
  private postProcess: PostProcess;
  private renderTargets: RenderTargetTexture[];

  constructor(scene: Scene) {
    this.scene = scene;
    this.renderTargets = [];
    this.postProcess = null;
  }

  initializeRTTs(): RenderTargetTexture[] {
    const depthRenderTarget = new RenderTargetTexture(
      'LinearDepthRenderTarget',
      {
        width: this.scene.getEngine()._gl.canvas.width,
        height: this.scene.getEngine()._gl.canvas.height
      },
      this.scene,
      {
        generateDepthBuffer: true,
        format: Constants.TEXTUREFORMAT_RED,
        type: Constants.TEXTURETYPE_FLOAT
      }
    );

    const additiveColorRenderTarget = new RenderTargetTexture(
      'additiveColorRenderTarget',
      {
        width: this.scene.getEngine()._gl.canvas.width,
        height: this.scene.getEngine()._gl.canvas.height
      },
      this.scene,
      {
        generateDepthBuffer: true,
        format: Constants.TEXTUREFORMAT_RGBA,
        type: Constants.TEXTURETYPE_FLOAT
      }
    );
    additiveColorRenderTarget.clearColor = new Color4(0.0, 0.0, 0.0, 0.0);

    this.scene.customRenderTargets.push(depthRenderTarget);
    this.scene.customRenderTargets.push(additiveColorRenderTarget);

    this.renderTargets.push(depthRenderTarget, additiveColorRenderTarget);

    return [depthRenderTarget, additiveColorRenderTarget];
  }

  initializePostProcess() {
    const activeCamera: Camera | undefined = this.scene.activeCameras?.find(
      (camera: Camera) => {
        return !camera.name.startsWith('GUI');
      }
    );

    if (activeCamera === undefined) {
      throw new Error('Scene does not have an active camera');
    }

    Effect.ShadersStore['customFragmentShader'] = `
          #extension GL_EXT_frag_depth : enable
          precision highp float;
          varying vec2 vUV;
          uniform sampler2D textureSampler;
          uniform sampler2D additiveTexture;
    
          void main(void)
          {
    
              vec4 color = texture(additiveTexture, vUV);

              gl_FragColor = vec4(color.rgb / color.a, 1.0);
          }
      `;

    this.postProcess = new PostProcess(
      'normalization',
      'custom',
      null,
      ['additiveTexture'],
      1.0,
      activeCamera
    );

    const additiveRenderTargetTexture = this.renderTargets[1];

    this.postProcess.onApply = function (effect) {
      effect.setTexture('additiveTexture', additiveRenderTargetTexture);
    };
  }
}
