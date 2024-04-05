import {
  Scene,
  Effect,
  ShaderMaterial,
  ShaderStore,
  ShaderLanguage
} from '@babylonjs/core';

export function ImageShaderMaterialWebGPU(
  name: string,
  scene: Scene,
  samplerType: string,
  channelCount: number
): ShaderMaterial {
  ShaderStore.ShadersStoreWGSL[
    `Bioimage_${samplerType}_${channelCount}VertexShader`
  ] = `
    #include<sceneUboDeclaration>
    #include<meshUboDeclaration>

    attribute position : vec3<f32>;
    attribute uv : vec2<f32>;

    varying vTexCoord : vec2<f32>;

    @vertex
    fn main(input: VertexInputs) -> FragmentInputs
    {
      vertexOutputs.position = scene.viewProjection * mesh.world * vec4<f32>(vertexInputs.position, 1.0);
      vertexOutputs.vTexCoord = vertexInputs.uv;
    }
  `;

  ShaderStore.ShadersStoreWGSL[
    `Bioimage_${samplerType}_${channelCount}FragmentShader`
  ] = `
    varying vTexCoord : vec2<f32>;

    struct TileOptions {
      channelMapping : array<vec4<u32>, ${channelCount.toFixed(0)}>,
      ranges : array<vec4<f32>, ${channelCount.toFixed(0)}>,
      colors : array<vec4<f32>, ${channelCount.toFixed(0)}>
    };
    
    var<uniform> tileOptions : TileOptions;
    var texture_arr : texture_2d_array<${samplerType}>;

    @fragment
    fn main(input : FragmentInputs) -> FragmentOutputs {
      var color : vec4<f32> = vec4f(0.0);
      var coords = vec2<u32>(vec2<f32>(textureDimensions(texture_arr) - vec2<u32>(1)) * fragmentInputs.vTexCoord);
      
      for (var i : i32 = 0; i < ${channelCount.toFixed(0)}; i++) {
        if (tileOptions.channelMapping[i].r > ${channelCount.toFixed(0)}u) {
          continue;
        }

        let intensity : f32 = f32(textureLoad(texture_arr, coords, tileOptions.channelMapping[i].x, 0u).x);

        color += tileOptions.colors[i] * clamp((intensity - tileOptions.ranges[i].x) / (tileOptions.ranges[i].y - tileOptions.ranges[i].x + 0.01), 0.0, 1.0);
      }
      
      fragmentOutputs.color = vec4f(color.rgb, 1.0);
    }
  `;

  const material = new ShaderMaterial(
    name,
    scene,
    {
      vertex: `Bioimage_${samplerType}_${channelCount}`,
      fragment: `Bioimage_${samplerType}_${channelCount}`
    },
    {
      attributes: ['position', 'uv'],
      uniformBuffers: ['Scene', 'Mesh', 'tileOptions'],
      shaderLanguage: ShaderLanguage.WGSL
    }
  );

  material.backFaceCulling = false;

  return material;
}

export function ImageShaderMaterial(
  name: string,
  scene: Scene,
  samplerType: string,
  channelCount: number
): ShaderMaterial {
  Effect.ShadersStore[`Bioimage_${samplerType}_${channelCount}VertexShader`] = `
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

  Effect.ShadersStore[
    `Bioimage_${samplerType}_${channelCount}FragmentShader`
  ] = `
    precision highp ${samplerType};
    precision highp float;
    precision highp int;

    layout(std140) uniform tileOptions {
      uvec4 channelMapping[${channelCount.toFixed(0)}];
      vec4 ranges[${channelCount.toFixed(0)}]; 
      vec4 colors[${channelCount.toFixed(0)}];
    };
    
    uniform ${samplerType} texture_arr;

    in vec2 vTexCoord;

    void main() {
      vec4 color = vec4(0.0);
      
      for (int i = 0; i < ${channelCount.toFixed(0)}; ++i)
      {
        if (channelMapping[i].r > ${channelCount.toFixed(0)}u) continue;
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
      vertex: `Bioimage_${samplerType}_${channelCount}`,
      fragment: `Bioimage_${samplerType}_${channelCount}`
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

  material.backFaceCulling = false;

  return material;
}
