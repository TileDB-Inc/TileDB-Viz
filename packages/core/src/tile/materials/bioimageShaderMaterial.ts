import { Scene, Effect, ShaderMaterial } from '@babylonjs/core';

export function BioimageShaderMaterial(
  name: string,
  scene: Scene,
  samplerType: string,
  channelCount: number
): ShaderMaterial {
  Effect.ShadersStore['BioimageVertexShader'] = `
    precision highp float;

    in vec3 position;
    in vec2 uv;

    uniform mat4 worldViewProjection;
    uniform mat4 world;
    uniform mat4 viewProjection;

    out vec2 vTexCoord;

    void main(void)
    {
      vec4 worldPos = world * vec4(position, 1.0);
      gl_Position = viewProjection * worldPos;

      vTexCoord = uv;
    }
  `;

  Effect.ShadersStore['BioimageFragmentShader'] = `
    precision highp ${samplerType};
    precision highp float;
    precision highp int;

    layout(std140) uniform tileOptions {
      ivec4 channelMapping[${channelCount.toFixed(0)}];
      vec4 ranges[${channelCount.toFixed(0)}]; 
      vec4 colors[${channelCount.toFixed(0)}];
    };
    
    uniform ${samplerType} texture_arr;

    in vec2 vTexCoord;

    void main() {
      vec4 color = vec4(0.0);
      
      for (int i = 0; i < ${channelCount.toFixed(0)}; ++i)
      {
        if (channelMapping[i].r == -1) continue;
        float intensity = float(texture(texture_arr, vec3(vTexCoord.xy, channelMapping[i].r)).r);
        color += colors[i] * clamp((intensity - ranges[i].x) / (ranges[i].y - ranges[i].x + 0.01), 0.0, 1.0);
      }
      
      glFragColor = vec4(color.rgb, 1.0);
    }
  `;

  const material = new ShaderMaterial(
    name,
    scene,
    {
      vertex: 'Bioimage',
      fragment: 'Bioimage'
    },
    {
      attributes: ['position', 'uv'],
      uniforms: [
        'world',
        'worldViewProjection',
        'viewProjection',
        'texture_arr'
      ],
      uniformBuffers: ['tileOptions']
    }
  );

  return material;
}
