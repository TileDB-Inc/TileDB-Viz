import {
  Scene,
  Camera,
  Effect,
  PostProcess,
  RenderTargetTexture,
  Constants,
  Color4
} from '@babylonjs/core';
import { TileDBPointCloudOptions } from '../utils/tiledb-pc';

export class SPSHighQualitySplats {
  private scene: Scene;
  private postProcess!: PostProcess;
  public renderTargets: RenderTargetTexture[] = [];
  private width!: number;
  private height!: number;

  constructor(scene: Scene) {
    this.scene = scene;
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
        format: Constants.TEXTUREFORMAT_R,
        type: Constants.TEXTURETYPE_FLOAT
      }
    );
    depthRenderTarget.clearColor = new Color4(1.0, 0.0, 0.0, 0.0);
    depthRenderTarget.setRenderingAutoClearDepthStencil(1, false);

    const additiveColorRenderTarget = new RenderTargetTexture(
      'additiveColorRenderTarget',
      {
        width: this.scene.getEngine()._gl.canvas.width,
        height: this.scene.getEngine()._gl.canvas.height
      },
      this.scene,
      {
        generateDepthBuffer: false,
        format: Constants.TEXTUREFORMAT_RGBA,
        type: Constants.TEXTURETYPE_FLOAT
      }
    );
    additiveColorRenderTarget.clearColor = new Color4(0.0, 0.0, 0.0, 0.0);
    additiveColorRenderTarget.setRenderingAutoClearDepthStencil(1, false);

    if (
      !depthRenderTarget.renderTarget ||
      !additiveColorRenderTarget.renderTarget
    ) {
      throw new Error('Render target initialization failed');
    }

    depthRenderTarget.renderTarget._shareDepth(
      additiveColorRenderTarget.renderTarget
    );

    additiveColorRenderTarget.skipInitialClear = true;
    additiveColorRenderTarget.onClearObservable.add(() => {
      this.scene
        .getEngine()
        .clear(additiveColorRenderTarget.clearColor, true, false, false);
    });

    this.scene.customRenderTargets.push(depthRenderTarget);
    this.scene.customRenderTargets.push(additiveColorRenderTarget);

    this.renderTargets.push(depthRenderTarget, additiveColorRenderTarget);

    return [depthRenderTarget, additiveColorRenderTarget];
  }

  initializePostProcess(options: TileDBPointCloudOptions) {
    if (this.scene.activeCamera === undefined) {
      throw new Error('Scene does not have an active camera');
    }

    const edlStrength = 0.4; //options.edlStrength || 0.4;
    const edlRadius = options.edlRadius || 1;
    const neighbourCount = options.edlNeighbours || 4;
    const neighbours: number[] = [];
    for (let c = 0; c < neighbourCount; c++) {
      neighbours[2 * c + 0] = Math.cos((2 * c * Math.PI) / neighbourCount);
      neighbours[2 * c + 1] = Math.sin((2 * c * Math.PI) / neighbourCount);
    }

    this.width = this.scene.getEngine().getRenderWidth();
    this.height = this.scene.getEngine().getRenderHeight();

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
        uniform vec4 clearColor;
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
                if(depth == 0.0)
                {
                sum += 100.0;
                }else{
                sum += max(0.0, log2(depth) - log2(neighbourDepth));
                //sum += max(0.0, depth - neighbourDepth);
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

          if (depth == 0.0)
          {
            gl_FragColor = vec4(clearColor.rgb * shade, 1.0);
          }
          else
          {
            gl_FragColor = vec4((cEDL.rgb / cEDL.a) * shade, 1.0);
          }

          // gl_FragColor = vec4(cEDL.rgb, 1.0);
        }
        `;

    this.postProcess = new PostProcess(
      'My custom post process',
      'custom',
      [
        'screenWidth',
        'screenHeight',
        'neighbours',
        'edlStrength',
        'radius',
        'clearColor'
      ],
      ['uEDLDepth', 'additiveTexture'],
      1.0,
      this.scene.activeCamera
    );

    this.postProcess.enablePixelPerfectMode = true;

    this.renderTargets[0].activeCamera = this.scene.activeCamera;
    this.renderTargets[1].activeCamera = this.scene.activeCamera;

    this.postProcess.onApply = (effect: Effect) => {
      effect.setFloat('screenWidth', this.width);
      effect.setFloat('screenHeight', this.height);
      effect.setArray2('neighbours', neighbours);
      effect.setFloat('edlStrength', edlStrength);
      effect.setFloat('radius', edlRadius);
      effect.setTexture('uEDLDepth', this.renderTargets[0]);
      effect.setTexture('additiveTexture', this.renderTargets[1]);
      effect.setColor4('clearColor', this.scene.clearColor, 1.0);
    };
  }

  public setActiveCamera(): void {
    const activeCamera: Camera | undefined = this.scene.activeCameras?.find(
      (camera: Camera) => {
        return !camera.name.startsWith('GUI');
      }
    );

    if (activeCamera === undefined) {
      throw new Error('Scene does not have an active camera');
    }

    this.renderTargets[0].activeCamera = activeCamera;
    this.renderTargets[1].activeCamera = activeCamera;

    activeCamera.attachPostProcess(this.postProcess);
  }

  resize(): void {
    this.width = this.scene.getEngine().getRenderWidth();
    this.height = this.scene.getEngine().getRenderHeight();

    this.renderTargets[0].resize({ height: this.height, width: this.width });
    this.renderTargets[1].resize({ height: this.height, width: this.width });

    if (
      !this.renderTargets[0].renderTarget ||
      !this.renderTargets[1].renderTarget
    ) {
      throw new Error('Render target initialization failed');
    }

    this.renderTargets[0].renderTarget._shareDepth(
      this.renderTargets[1].renderTarget
    );
  }
}
