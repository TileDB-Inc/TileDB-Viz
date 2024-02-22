import { Scene, Effect, ShaderMaterial } from '@babylonjs/core';
import { FeatureType } from '../../types';
import { PointShape } from '../types';

export function PointCloudMaterial(scene: Scene): ShaderMaterial {
  Effect.ShadersStore['PointCloudSimpleVertexShader'] = `
    precision highp float;
    precision highp int;

    #include<clipPlaneVertexDeclaration>

    in vec3 position;
    in float state;

    const vec4 selectionColor = vec4(0.0, 1.0, 0.0, 1.0);
    const vec4 pickColor = vec4(1.0, 0.0, 0.0, 1.0);

    #if (FEATURE_TYPE == ${FeatureType.RGB})
      in vec3 colorAttr;
    #elif (FEATURE_TYPE == ${FeatureType.CATEGORICAL})
      in int group;
    #endif

    uniform mat4 worldViewProjection;
    uniform mat4 world;

    layout(std140) uniform pointOptions {
      float pointSize;
      vec4 color;
      vec4 colorScheme[32];
    };

    flat out vec4 vColor;

    void main(void)
    {
      gl_Position = worldViewProjection * vec4(position, 1.0);
      gl_PointSize = pointSize;

      #include<clipPlaneVertex>

      #if (FEATURE_TYPE == ${FeatureType.RGB})
        vColor = vec4(colorAttr, 1.0);
      #elif (FEATURE_TYPE == ${FeatureType.CATEGORICAL})
        if (group > 31) {
          vColor = vec4(0.0);
        }
        else {
          vColor = colorScheme[group];
        }
        //gl_PointSize = max(1.0, pointSize * vColor.a);
      #elif (FEATURE_TYPE == ${FeatureType.FLAT_COLOR})
        vColor = color;
      #endif

      if (state == 1.0) {
        vColor = selectionColor;
      }
      else if (state == 2.0) {
        vColor = pickColor;
      }
    }
  `;

  Effect.ShadersStore['PointCloudSimpleFragmentShader'] = `
    precision highp float;

    #include<clipPlaneFragmentDeclaration>

    flat in vec4 vColor;

    void main(void)
    {
      #include<clipPlaneFragment>

      #if (POINT_TYPE == ${PointShape.CIRCLE})
        vec2 coords = gl_PointCoord.xy - vec2(0.5);

        float distance = coords.x * coords.x + coords.y * coords.y;

        if (distance > 0.25)
        {
          discard;
        }
      #endif

      #if (FEATURE_TYPE == ${FeatureType.CATEGORICAL})
        if (vColor.a == 0.0) {
          discard;
        }
      #endif

      glFragColor = vec4(vColor.rgb, 1.0);
    }
  `;

  const material = new ShaderMaterial(
    'PointCloudSimpleShader',
    scene,
    {
      vertex: 'PointCloudSimple',
      fragment: 'PointCloudSimple'
    },
    {
      attributes: ['position', 'colorAttr', 'group', 'state'],
      uniforms: ['worldViewProjection', 'world'],
      defines: ['POINT_TYPE', 'FEATURE_TYPE'],
      uniformBuffers: ['pointOptions'],
      useClipPlane: true
    }
  );

  material.pointsCloud = true;

  return material;
}
