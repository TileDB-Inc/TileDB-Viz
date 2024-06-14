import {
  Constants,
  CreatePlane,
  Mesh,
  Plane,
  RawTexture2DArray,
  Scene,
  ShaderMaterial,
  Texture,
  UniformBuffer
} from '@babylonjs/core';
import { TypedArray } from '../../types';
import { Datatype } from '@tiledb-inc/tiledb-cloud/lib/v2';
import {
  ImageShaderMaterial,
  ImageShaderMaterialWebGPU
} from '../../materials/imageShaderMaterial';
import { TileContent, TileUpdateOptions } from '../tileContent';
import { ImageDataContent } from '../../../types';
import { Tile } from '../tile';

export type ImageUpdateOptions = TileUpdateOptions & {
  UBO?: UniformBuffer;
  data?: {
    raw: TypedArray;
    width: number;
    height: number;
    depth: number;
    dtype: Datatype;
    channelLimit: number;
  };
};

const textureOptions: Map<
  Datatype,
  {
    format: number;
    filtering: number;
    type: number;
    samplerType: string;
    webGPUSampleType: string;
  }
> = new Map([
  [
    Datatype.Uint8,
    {
      format: Constants.TEXTUREFORMAT_RED_INTEGER,
      type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
      filtering: Texture.NEAREST_SAMPLINGMODE,
      samplerType: 'usampler2DArray',
      webGPUSampleType: 'u32'
    }
  ],
  [
    Datatype.Int8,
    {
      format: Constants.TEXTUREFORMAT_RED_INTEGER,
      type: Constants.TEXTURETYPE_BYTE,
      filtering: Texture.NEAREST_SAMPLINGMODE,
      samplerType: 'isampler2DArray',
      webGPUSampleType: 'i32'
    }
  ],
  [
    Datatype.Uint16,
    {
      format: Constants.TEXTUREFORMAT_RED_INTEGER,
      type: Constants.TEXTURETYPE_UNSIGNED_SHORT,
      filtering: Texture.NEAREST_SAMPLINGMODE,
      samplerType: 'usampler2DArray',
      webGPUSampleType: 'u32'
    }
  ],
  [
    Datatype.Float32,
    {
      format: Constants.TEXTUREFORMAT_RED,
      type: Constants.TEXTURETYPE_FLOAT,
      filtering: Texture.NEAREST_SAMPLINGMODE,
      samplerType: 'sampler2DArray',
      webGPUSampleType: 'f32'
    }
  ]
]);

export class ImageContent extends TileContent {
  private texture?: RawTexture2DArray;
  private material?: ShaderMaterial;

  constructor(scene: Scene, tile: Tile<ImageDataContent, ImageContent>) {
    super(scene, tile);

    //Create plane mesh for the image tile
    const mesh = CreatePlane(
      tile.id.toString(),
      {
        width: 2 * tile.boundingInfo.boundingBox.extendSize.x,
        height: 2 * tile.boundingInfo.boundingBox.extendSize.z,
        sideOrientation: Mesh.DOUBLESIDE,
        sourcePlane: new Plane(0, 1, 0, 0)
      },
      scene
    );

    // Hide image tile untill data are loaded
    // Visibility should be restored once the data are loaded
    mesh.visibility = 0;
    mesh.isPickable = false;
    mesh.position = tile.boundingInfo.boundingBox.center;

    // The it the top level image tile so add both layer mask to be renderered by all cameras
    mesh.layerMask = tile.mask;

    // Remove unwanted rotations added by default
    mesh.rotation.x = Math.PI * 1.5;
    mesh.rotation.y = 0;
    mesh.rotation.z = 0;

    // Add mesh to the list of meshes
    this.meshes.push(mesh);
  }

  public update(options: ImageUpdateOptions) {
    super.update(options);

    if (options.data) {
      this.onDataUpdate(options.data);
    }

    if (options.UBO) {
      this.material?.setUniformBuffer('tileOptions', options.UBO);
    }
  }

  private onDataUpdate(data: {
    raw: TypedArray;
    width: number;
    height: number;
    depth: number;
    dtype: Datatype;
    channelLimit: number;
  }): void {
    if (this.tile.content.length === 0) {
      // This is a virtual tile so we skip
      return;
    }

    const textureConfig = textureOptions.get(data.dtype);
    if (!textureConfig) {
      console.error(`Unsupported type ${data.dtype} for texture array`);
      return;
    }

    if (this.texture) {
      // The tile is already visible so we need to clear textures to update
      this.texture.dispose();
    }

    this.material = this.scene.getEngine().isWebGPU
      ? ImageShaderMaterialWebGPU(
          this.tile.id.toString(),
          this.scene,
          textureConfig.webGPUSampleType,
          data.channelLimit
        )
      : ImageShaderMaterial(
          this.tile.id.toString(),
          this.scene,
          textureConfig.samplerType,
          data.channelLimit
        );

    this.texture = new RawTexture2DArray(
      data.raw,
      data.width,
      data.height,
      data.depth,
      textureConfig.format,
      this.scene,
      false,
      false,
      textureConfig.filtering,
      textureConfig.type
    );

    this.texture.wrapU = RawTexture2DArray.CLAMP_ADDRESSMODE;
    this.texture.wrapV = RawTexture2DArray.CLAMP_ADDRESSMODE;

    this.material.setTexture('texture_arr', this.texture);

    for (const mesh of this.meshes) {
      mesh.material = this.material;
      mesh.visibility = 1;
    }
  }
}
