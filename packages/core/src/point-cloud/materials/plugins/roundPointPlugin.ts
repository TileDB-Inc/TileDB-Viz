import {
  MaterialPluginBase,
  Camera,
  RawTexture,
  Vector3
} from '@babylonjs/core';

export enum PointType {
  FixedScreenSizePoint,
  FixedWorldSizePoint,
  AddaptiveWorldSizePoint
}

export class RoundPointMaterialPlugin extends MaterialPluginBase {
  radius = 1;
  visibilityTexture: RawTexture = null;
  minPoint: Vector3;
  maxPoint: Vector3;
  pointType: PointType;

  get isEnabled() {
    return this._isEnabled;
  }

  set isEnabled(enabled) {
    if (this._isEnabled === enabled) {
      return;
    }
    this._isEnabled = enabled;
    this.markAllDefinesAsDirty();
    this._enable(this._isEnabled);
  }

  _isEnabled = false;

  constructor(material) {
    super(material, 'RoundPoint', 1001, {
      FIXED_SCREEN_SIZE: false,
      FIXED_WORLD_SIZE: false,
      ADDAPTIVE_WORLD_SIZE: false
    });
  }

  getUniforms() {
    return {
      ubo: [
        { name: 'slope', size: 1, type: 'float' },
        { name: 'half_height', size: 1, type: 'float' },
        { name: 'radius', size: 1, type: 'float' },
        { name: 'minPoint', size: 3, type: 'vec3' },
        { name: 'maxPoint', size: 3, type: 'vec3' }
      ],
      vertex: `
            uniform float slope;
            uniform float half_height;
            uniform float radius;
            uniform vec3 minPoint;
            uniform vec3 maxPoint;
        `
    };
  }

  getSamplers(samplers) {
    samplers.push('visibilityTexture');
  }

  prepareDefines(defines, scene, mesh) {
    switch (this.pointType) {
      case PointType.FixedScreenSizePoint:
        defines.FIXED_SCREEN_SIZE = true;
        defines.FIXED_WORLD_SIZE = false;
        defines.ADDAPTIVE_WORLD_SIZE = false;
        break;
      case PointType.FixedWorldSizePoint:
        defines.FIXED_SCREEN_SIZE = false;
        defines.FIXED_WORLD_SIZE = true;
        defines.ADDAPTIVE_WORLD_SIZE = false;
        break;
      case PointType.AddaptiveWorldSizePoint:
        defines.FIXED_SCREEN_SIZE = false;
        defines.FIXED_WORLD_SIZE = false;
        defines.ADDAPTIVE_WORLD_SIZE = true;
        break;
    }
  }

  bindForSubMesh(uniformBuffer, scene, engine, subMesh) {
    if (this._isEnabled) {
      const activeCamera: Camera | undefined = scene.activeCameras?.find(
        (camera: Camera) => {
          return !camera.name.startsWith('GUI');
        }
      );

      uniformBuffer.updateFloat('slope', Math.tan(activeCamera.fov / 2));
      uniformBuffer.updateFloat('half_height', engine._gl.canvas.height / 2);
      uniformBuffer.updateFloat('radius', this.radius);

      uniformBuffer.updateFloat3(
        'minPoint',
        this.minPoint.x,
        this.minPoint.y,
        this.minPoint.z
      );
      uniformBuffer.updateFloat3(
        'maxPoint',
        this.maxPoint.x,
        this.maxPoint.y,
        this.maxPoint.z
      );

      uniformBuffer.setTexture('visibilityTexture', this.visibilityTexture);
    }
  }

  getClassName() {
    return 'RoundPointMaterialPlugin';
  }

  getCustomCode(shaderType) {
    return shaderType === 'vertex'
      ? {
          CUSTOM_VERTEX_DEFINITIONS: `
              precision highp int;
              uniform highp usampler2D visibilityTexture;

              int part1By2(int x)
              {
                x &= 0x000003ff;                  
                x = (x ^ (x << 16)) & 0xff0000ff;
                x = (x ^ (x <<  8)) & 0x0300f00f;
                x = (x ^ (x <<  4)) & 0x030c30c3;
                x = (x ^ (x <<  2)) & 0x09249249;
                return x;
              }

              int decodeMorton(ivec3 index, uint lod)
              {
                int marker = 1 << (3 * int(lod));
                return marker | ((part1By2(index.z) << 2) + (part1By2(index.y) << 1) + part1By2(index.x));
              }

              ivec3 calculateIndex(vec3 pos, uint lod)
              {
                float parts = pow(2.0, float(lod));

                vec3 step = (maxPoint - minPoint) / parts;
                return ivec3(floor((pos - minPoint) / step));
              }

              int countBits(uint childBitset, uint index)
              {
                int counter = 0;
                
                for (uint i = 0u; i < index; ++i)
                {
                  if ((childBitset & (1u << i)) > 0u)
                  {
                    ++counter;
                  }
                }
                
                return counter;
              }

              int getLOD(vec3 pos)
              {
                int textureIndex = 0;
                for (uint i = 1u; i < 10u; ++i)
                {
                  uvec4 texel = texelFetch(visibilityTexture, ivec2(textureIndex, 0), 0);
                  int morton = decodeMorton(calculateIndex(pos, i), i);
                  
                  int childIndex = morton - ((morton >> 3) << 3);
                  
                  if ((texel.x & (1u << childIndex)) > 0u)
                  {
                    textureIndex += int(texel.g) + countBits(texel.r, uint(childIndex));
                  }
                  else
                  {
                    return int(i) - 1;
                  }
                }
                
                return 10;
              }
            `,
          CUSTOM_VERTEX_MAIN_END: `
            #ifdef FIXED_SCREEN_SIZE
              gl_PointSize = radius;
            #endif
            #ifdef FIXED_WORLD_SIZE
              gl_PointSize = (radius * half_height) / (slope * gl_Position.z);
            #endif
            #ifdef ADDAPTIVE_WORLD_SIZE
              gl_PointSize = (radius / pow(2.0, float(getLOD(position))) * half_height) / (slope * gl_Position.z);
            #endif
          `
        }
      : {
          CUSTOM_FRAGMENT_MAIN_BEGIN: `
          if (length(gl_PointCoord.xy - vec2(0.5)) > 0.5)
          {
              discard;
          }
        `
        };
  }
}