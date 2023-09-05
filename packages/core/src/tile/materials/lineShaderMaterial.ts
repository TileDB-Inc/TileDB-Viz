import { Scene, Effect, ShaderMaterial } from '@babylonjs/core';

export function LineShaderMaterial(name: string, scene: Scene): ShaderMaterial {
  Effect.ShadersStore['LineVertexShader'] = `
    precision highp float;

    in vec3 position;

    uniform mat4 worldViewProjection;
    uniform mat4 world;
    uniform mat4 viewProjection;

    void main(void)
    {
      vec4 worldPos = world * vec4(position, 1.0);
      gl_Position = viewProjection * worldPos;
    }
  `;

  Effect.ShadersStore['LineFragmentShader'] = `
    precision highp float;

    void main() {
      glFragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `;

  const material = new ShaderMaterial(
    name,
    scene,
    {
      vertex: 'Line',
      fragment: 'Line'
    },
    {
      attributes: ['position'],
      uniforms: ['world', 'worldViewProjection', 'viewProjection']
    }
  );

  material.backFaceCulling = false;
  material.fillMode = ShaderMaterial.LineListDrawMode;

  return material;
}
