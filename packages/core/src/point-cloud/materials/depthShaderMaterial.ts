import {
  Scene,
  Camera,
  Effect,
  Material,
  ShaderMaterial
} from '@babylonjs/core';

export function PointCloudDepthMaterial(
  scene: Scene,
  camera: Camera,
  pointSize: number
): Material {
  const nearPlane = camera.minZ;
  const farPlane = camera.maxZ;
  const blendDistance = 10;

  Effect.ShadersStore['PointCloudDepthVertexShader'] = `
    precision highp float;

    #include<clipPlaneVertexDeclaration>

    in vec3 position;

    uniform float pointSize;
    uniform mat4 worldViewProjection;
    uniform mat4 worldView;
    uniform mat4 projection;
    uniform mat4 world;
    uniform float pointSize;

    flat out float linearDepth;

    void main(void)
    {
      gl_PointSize = pointSize;
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
    'LinearDepthShader',
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
        'pointSize'
      ],
      useClipPlane: true
    }
  );

  material.pointsCloud = true;
  material.pointSize = pointSize;
  material.disableLighting = true;

  return material;
}
