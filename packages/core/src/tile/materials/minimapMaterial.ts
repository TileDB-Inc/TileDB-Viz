import { Scene, Effect, ShaderMaterial } from '@babylonjs/core';

export function MinimapShaderMaterial(
  name: string,
  scene: Scene,
  samplerType: string,
  channelCount: number
): ShaderMaterial {
  Effect.ShadersStore[
    `BioimageMinimap_${samplerType}_${channelCount}VertexShader`
  ] = `
    precision highp float;

    in vec3 position;
    in vec2 uv;

    uniform mat4 worldViewProjection;
    uniform mat4 world;
    uniform mat4 viewProjection;

    uniform vec4 visibleArea;
    uniform vec2 screenSize;
    uniform vec2 minimapSize;
    uniform vec2 margins;

    out vec2 vTexCoord;

    void main(void)
    {
      vec2 unitsPerPixel = vec2(2.0) / screenSize;

      gl_Position = (vec4(position, 1.0) * vec4(minimapSize, 0.0, 1.0) + vec4(margins, 0.0, 0.0)) * vec4(unitsPerPixel.x, -unitsPerPixel.y, 0.0, 1.0) - vec4(1.0, -1.0, 0.99, 0.0);

      vTexCoord = uv;
    }
  `;

  Effect.ShadersStore[
    `BioimageMinimap_${samplerType}_${channelCount}FragmentShader`
  ] = `
    precision highp ${samplerType};
    precision highp float;
    precision highp int;

    layout(std140) uniform tileOptions {
      ivec4 channelMapping[${channelCount.toFixed(0)}];
      vec4 ranges[${channelCount.toFixed(0)}]; 
      vec4 colors[${channelCount.toFixed(0)}];
    };
    
    uniform ${samplerType} texture_arr;
    uniform vec4 visibleArea; // L-T-R-B

    in vec2 vTexCoord;

    float sdAxisAlignedRect(vec2 uv, vec2 tl, vec2 br)
    {
      vec2 d = max(tl-uv, uv-br);
      return length(max(vec2(0.0), d)) + min(0.0, max(d.x, d.y));
    }

    void main() {
      vec4 color = vec4(0.0);
      
      for (int i = 0; i < ${channelCount.toFixed(0)}; ++i)
      {
        if (channelMapping[i].r == -1) continue;
        float intensity = float(texture(texture_arr, vec3(vTexCoord.xy, channelMapping[i].r)).r);
        color += colors[i] * clamp((intensity - ranges[i].x) / (ranges[i].y - ranges[i].x + 0.01), 0.0, 1.0);
      }

      float dist = sdAxisAlignedRect(vTexCoord, visibleArea.xy, visibleArea.zw);

      if (dist <= 0.0)
      {
        color.rgb = mix(vec3(1.0, 0.0, 0.0), color.rgb, 1.0 - 1.0 / (50.0 * abs(dist) + 1.0));
      }
      
      glFragColor = vec4(color.rgb, 1.0);
    }
  `;

  const material = new ShaderMaterial(
    name,
    scene,
    {
      vertex: `BioimageMinimap_${samplerType}_${channelCount}`,
      fragment: `BioimageMinimap_${samplerType}_${channelCount}`
    },
    {
      attributes: ['position', 'uv'],
      uniforms: [
        'world',
        'worldViewProjection',
        'viewProjection',
        'texture_arr',
        'screenSize',
        'minimapSize',
        'margins',
        'visibleArea'
      ],
      uniformBuffers: ['tileOptions']
    }
  );

  material.backFaceCulling = false;

  return material;
}
