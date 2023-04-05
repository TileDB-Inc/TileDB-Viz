import { Scene, Effect, ShaderMaterial } from '@babylonjs/core';

export function PointCloudDepthMaterial(
  scene: Scene,
  nearPlane: number,
  farPlane: number,
  fov: number,
  pointSize: number,
  pointType: string
): ShaderMaterial {
  const blendDistance = 10;

  Effect.ShadersStore['PointCloudDepthVertexShader'] = `
    precision highp float;

    #include<clipPlaneVertexDeclaration>

    in vec3 position;

    uniform mat4 worldViewProjection;
    uniform mat4 worldView;
    uniform mat4 projection;
    uniform mat4 world;
    uniform float pointSize;
    uniform float half_height;
    uniform vec3 minPoint;
    uniform vec3 maxPoint;

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

    flat out float linearDepth;

    void main(void)
    {
      gl_Position = worldViewProjection * vec4(position, 1.0);

      linearDepth = (gl_Position.w + ${nearPlane.toFixed(
        1
      )}) / ${farPlane.toFixed(1)};

      float originalDepth = gl_Position.w;
      float adjustedDepth = originalDepth + ${blendDistance.toFixed(1)};
      float adjust = adjustedDepth / originalDepth;

      vec4 wvPosition = worldView * vec4(position, 1.0);
      wvPosition.xyz = wvPosition.xyz * adjust;

      gl_Position = projection * wvPosition;

      vec4 worldPos = world * vec4(position, 1.0);
      #include<clipPlaneVertex>

      #ifdef fixed_screen_size
        gl_PointSize = pointSize;
      #endif
      #ifdef fixed_world_size
        gl_PointSize = (pointSize * half_height) / (${Math.tan(
          fov / 2
        )} * gl_Position.w);
      #endif
      #ifdef adaptive_world_size
        gl_PointSize = (pointSize / pow(2.0, float(getLOD(position))) * half_height) / (${Math.tan(
          fov / 2
        )} * gl_Position.w);
      #endif
    }
  `;

  Effect.ShadersStore['PointCloudDepthFragmentShader'] = `
    precision highp float;

    #include<clipPlaneFragmentDeclaration>

    flat in float linearDepth;

    void main(void)
    {
      #include<clipPlaneFragment>

      vec2 coords = gl_PointCoord.xy - vec2(0.5);

      if (coords.x * coords.x + coords.y * coords.y > 0.25)
      {
        discard;
      }

      glFragColor = vec4(linearDepth, 0.0, 0.0, 1.0);
    }
  `;

  const material = new ShaderMaterial(
    'PointCloudDepthShader',
    scene,
    {
      vertex: 'PointCloudDepth',
      fragment: 'PointCloudDepth'
    },
    {
      attributes: ['position'],
      uniforms: [
        'world',
        'worldView',
        'worldViewProjection',
        'projection',
        'pointSize',
        'half_height',
        'minPoint',
        'maxPoint'
      ],
      samplers: ['visibilityTexture'],
      defines: [pointType],
      useClipPlane: true
    }
  );

  material.pointsCloud = true;
  material.pointSize = pointSize;

  material.setFloat('pointSize', pointSize);
  material.setFloat('half_height', scene.getEngine().getRenderHeight() / 2);

  return material;
}
