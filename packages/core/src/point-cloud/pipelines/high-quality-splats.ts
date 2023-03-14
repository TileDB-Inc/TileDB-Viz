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

  initializePostProcess(options) {
    const activeCamera: Camera | undefined = this.scene.activeCameras?.find(
      (camera: Camera) => {
        return !camera.name.startsWith('GUI');
      }
    );

    if (activeCamera === undefined) {
      throw new Error('Scene does not have an active camera');
    }

    const edlStrength = options.edlStrength || 4.0;
    const edlRadius = options.edlRadius || 1.4;
    const neighbourCount = options.edlNeighbours || 8;
    const neighbours: number[] = [];
    for (let c = 0; c < neighbourCount; c++) {
      neighbours[2 * c + 0] = Math.cos((2 * c * Math.PI) / neighbourCount);
      neighbours[2 * c + 1] = Math.sin((2 * c * Math.PI) / neighbourCount);
    }

    const screenWidth = this.scene.getEngine().getRenderWidth();
    const screenHeight = this.scene.getEngine().getRenderHeight();

    Effect.ShadersStore['customFragmentShader'] = `
      precision highp float;

      #define NEIGHBOUR_COUNT ${neighbourCount}

      varying vec2 vUV;
      uniform sampler2D textureSampler;

      uniform float screenWidth;
      uniform float screenHeight;

      uniform vec2 neighbours[NEIGHBOUR_COUNT];
      uniform float edlStrength;
      uniform float radius;

      //uniform mat4 uProj;

      uniform sampler2D uEDLDepth;
      uniform sampler2D additiveTexture;

      float response(float depth) {
          vec2 uvRadius = radius / vec2(screenWidth, screenHeight);

          float sum = 0.0;

          for(int i = 0; i < NEIGHBOUR_COUNT; i++){
          vec2 uvNeighbor = vUV + uvRadius * neighbours[i];

          float neighbourDepth = texture2D(uEDLDepth, uvNeighbor).r;
          neighbourDepth = (neighbourDepth == 1.0) ? 0.0 : neighbourDepth;

          if (neighbourDepth != 0.0) {
              if(depth == 0.0){
              sum += 100.0;
              }else{
              sum += max(0.0, depth - neighbourDepth);
              }
          }
          }

          return sum / float(NEIGHBOUR_COUNT);
      }

      void main(void)
      {
          float depth = texture2D(uEDLDepth, vUV).r;
          vec4 cEDL = texture2D(additiveTexture, vUV);
          depth = (depth == 1.0) ? 0.0 : depth;
          float res = response(depth);
          float shade = exp(-res * 300.0 * edlStrength);

          gl_FragColor = vec4((cEDL.rgb / cEDL.a) * shade, 1.0);
      }
      `;

    this.postProcess = new PostProcess(
      'My custom post process',
      'custom',
      ['screenWidth', 'screenHeight', 'neighbours', 'edlStrength', 'radius'],
      ['uEDLDepth', 'additiveTexture'],
      1.0,
      activeCamera
    );
    const depthTexture = this.renderTargets[0];
    const additiveTexture = this.renderTargets[1];

    this.postProcess.onApply = function (effect: Effect) {
      effect.setFloat('screenWidth', screenWidth as number);
      effect.setFloat('screenHeight', screenHeight as number);
      effect.setArray2('neighbours', neighbours);
      effect.setFloat('edlStrength', edlStrength);
      effect.setFloat('radius', edlRadius);
      effect.setTexture('uEDLDepth', depthTexture);
      effect.setTexture('additiveTexture', additiveTexture);
    };
  }
}
