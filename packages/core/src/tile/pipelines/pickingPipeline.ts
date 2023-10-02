import {
  Scene,
  RenderTargetTexture,
  Constants,
  Color4,
  ArcRotateCamera
} from '@babylonjs/core';
import { getCamera } from '../utils/camera-utils';

export class GeometryPipeline {
  private scene: Scene;
  public renderTargets: RenderTargetTexture[] = [];
  private camera: ArcRotateCamera;
  private width!: number;
  private height!: number;

  constructor(scene: Scene) {
    this.scene = scene;
    this.camera = getCamera(this.scene, 'Main') as ArcRotateCamera;
  }

  initializeRTT(): RenderTargetTexture {
    const geometryRenderTarget = new RenderTargetTexture(
      'geometryRenderTarget',
      {
        width: this.scene.getEngine().getRenderWidth(),
        height: this.scene.getEngine().getRenderHeight()
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
    geometryRenderTarget.activeCamera = this.camera;

    if (!geometryRenderTarget.renderTarget) {
      throw new Error('Render target initialization failed');
    }

    this.scene.customRenderTargets.push(geometryRenderTarget);
    this.renderTargets.push(geometryRenderTarget);

    return geometryRenderTarget;
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
