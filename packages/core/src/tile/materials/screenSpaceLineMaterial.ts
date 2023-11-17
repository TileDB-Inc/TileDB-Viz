import { Scene, Effect, ShaderMaterial } from '@babylonjs/core';

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
