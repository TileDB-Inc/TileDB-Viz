import {
  Scene,
  Effect,
  ShaderMaterial,
  ShaderStore,
  ShaderLanguage,
  UniformBuffer
} from '@babylonjs/core';

export function ScreenSpaceLineMaterialWebGPU(scene: Scene): ShaderMaterial {
  ShaderStore.ShadersStoreWGSL['ScreenSpaceLineVertexShader'] = `
    attribute position: vec3<f32>;

    struct Options {
      screenWidth: f32,
      screenHeight: f32
    }

    var<uniform> options: Options;

    @vertex
    fn main(input: VertexInputs) -> FragmentInputs
    {
      var x: f32 = 2.0 * (vertexInputs.position.x / options.screenWidth) - 1.0;
      var y: f32 = 2.0 * (vertexInputs.position.y / options.screenHeight) - 1.0;
      vertexOutputs.position = vec4<f32>(x, y, 0.5, 1.0);
    }
  `;

  ShaderStore.ShadersStoreWGSL['ScreenSpaceLineFragmentShader'] = `
    @fragment
    fn main(input : FragmentInputs) -> FragmentOutputs {
      fragmentOutputs.color = vec4(1.0);
    }
  `;

  const material = new ShaderMaterial(
    'ScreenSpaceLineShader',
    scene,
    {
      vertex: 'ScreenSpaceLine',
      fragment: 'ScreenSpaceLine'
    },
    {
      attributes: ['position'],
      uniformBuffers: ['options'],
      shaderLanguage: ShaderLanguage.WGSL
    }
  );

  material.fillMode = ShaderMaterial.LineStripDrawMode;
  material.backFaceCulling = false;

  const buffer = new UniformBuffer(scene.getEngine());
  buffer.addUniform('screenWidth', 1, 0);
  buffer.addUniform('screenHeight', 1, 0);

  buffer.updateFloat('screenWidth', scene.getEngine().getRenderWidth());
  buffer.updateFloat('screenHeight', scene.getEngine().getRenderHeight());
  buffer.update();

  material.setUniformBuffer('options', buffer);

  return material;
}

export function ScreenSpaceLineMaterial(scene: Scene): ShaderMaterial {
  Effect.ShadersStore['ScreenSpaceLineVertexShader'] = `
    precision highp float;

    in vec3 position;

    uniform mat4 worldViewProjection;
    uniform mat4 world;
    uniform mat4 viewProjection;

    uniform float screenWidth;
    uniform float screenHeight;

    void main(void)
    {
      float x = 2.0 * (position.x / screenWidth) - 1.0;
      float y = 2.0 * (position.y / screenHeight) - 1.0;
      gl_Position = vec4(x, y, 0.5, 1.0);
    }
  `;

  Effect.ShadersStore['ScreenSpaceLineFragmentShader'] = `
    precision highp float;

    void main() {
      glFragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
  `;

  const material = new ShaderMaterial(
    'ScreenSpaceLineShader',
    scene,
    {
      vertex: 'ScreenSpaceLine',
      fragment: 'ScreenSpaceLine'
    },
    {
      attributes: ['position'],
      uniforms: [
        'world',
        'worldViewProjection',
        'viewProjection',
        'screenWidth',
        'screenHeight'
      ]
    }
  );

  material.fillMode = ShaderMaterial.LineLoopDrawMode;
  material.backFaceCulling = false;

  material.setFloat('screenWidth', scene.getEngine().getRenderWidth());
  material.setFloat('screenHeight', scene.getEngine().getRenderHeight());

  return material;
}
