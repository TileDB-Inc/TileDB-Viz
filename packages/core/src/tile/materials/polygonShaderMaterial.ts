import { Scene, Effect, ShaderMaterial } from '@babylonjs/core';

export function PolygonShaderMaterial(
  name: string,
  scene: Scene
): ShaderMaterial {
  Effect.ShadersStore['PolygonVertexShader'] = `
    precision highp float;
    precision highp int;

    in vec3 position;
    in uvec2 id;

    uniform mat4 worldViewProjection;
    uniform mat4 world;
    uniform mat4 viewProjection;

    flat out uvec2 vId;

    void main(void)
    {
      vec4 worldPos = world * vec4(position, 1.0);
      
      vId = id;
      gl_Position = viewProjection * worldPos;
    }
  `;

  Effect.ShadersStore['PolygonFragmentShader'] = `
    precision highp float;
    precision highp int;

    layout(location = 0) out uvec4 color;

    flat in uvec2 vId;

    void main() {
      uint polygonColor = (255u << 24) + (0u << 16) + (124u << 8) + 100u;
      color = uvec4(vId, polygonColor, 1u);
    }
  `;

  const material = new ShaderMaterial(
    name,
    scene,
    {
      vertex: 'Polygon',
      fragment: 'Polygon'
    },
    {
      attributes: ['position', 'id'],
      uniforms: ['world', 'worldViewProjection', 'viewProjection']
    }
  );

  material.backFaceCulling = false;

  return material;
}
