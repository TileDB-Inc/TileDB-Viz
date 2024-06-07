import {
  Scene,
  Effect,
  ShaderMaterial,
  ShaderStore,
  ShaderLanguage
} from '@babylonjs/core';
import { FeatureType } from '@tiledb-inc/viz-common';
import { PointShape } from '../types';

export function PointCloudMaterialWebGPU(
  scene: Scene,
  featureType: FeatureType
): ShaderMaterial {
  let attributeName: string | undefined = undefined;
  let attributeType: string | undefined = undefined;
  let coloring: string | undefined = undefined;

  switch (featureType) {
    case FeatureType.RGB:
      attributeName = 'colorAttr';
      attributeType = 'vec3<f32>';
      coloring =
        'vertexOutputs.vColor = vec4<f32>(vertexInputs.colorAttr, pointOptions.pointOpacity);';
      break;
    case FeatureType.CATEGORICAL:
      attributeName = 'group';
      attributeType = 'i32';
      coloring =
        'vertexOutputs.vColor = mix(vec4<f32>(pointOptions.colorScheme[vertexInputs.group].rgb, pointOptions.pointOpacity), vec4<f32>(0), f32(vertexInputs.group > 31));';
      break;
  }

  ShaderStore.ShadersStoreWGSL[
    `PointCloudSimpleFT${featureType}VertexShader`
  ] = `
  #include<sceneUboDeclaration>
  #include<meshUboDeclaration>

  attribute position: vec3<f32>;
  attribute loc: vec3<f32>;
  attribute state: f32;

  struct FrameOptions {
    zoom: f32
  };

  var<uniform> frameOptions : FrameOptions;

  ${attributeName ? `attribute ${attributeName}: ${attributeType};` : ''}

  const selectionColor: vec4<f32> = vec4<f32>(0.0, 1.0, 0.0, 1.0);
  const pickColor: vec4<f32> = vec4<f32>(1.0, 0.0, 0.0, 1.0);

  struct PointOptions {
    pointSize: f32,
    color: vec4<f32>,
    colorScheme: array<vec4<f32>, 32>,
    pointOpacity: f32
  };

  var<uniform> pointOptions : PointOptions;

  varying vColor: vec4<f32>;

  @vertex
  fn main(input: VertexInputs) -> FragmentInputs
  {
    //var p: vec4<f32> = pointOptions.transformation * vec4<f32>(vertexInputs.loc, 1.0);
    //vertexOutputs.position = scene.viewProjection * (vec4<f32>(p.x, p.z, p.y, 1.0) + vec4<f32>(vertexInputs.position, 0.0));

    var scale: mat4x4<f32> = mat4x4<f32>(vec4<f32>(pointOptions.pointSize, 0, 0, 0), vec4<f32>(0, pointOptions.pointSize, 0, 0), vec4<f32>(0, 0, pointOptions.pointSize, 0), vec4<f32>(0, 0, 0, 1));
    vertexOutputs.position = scene.viewProjection * mesh.world * (vec4<f32>(vertexInputs.loc, 1.0) + scale * vec4<f32>(vertexInputs.position, 0.0));
    
    ${
      attributeName
        ? coloring
        : 'vertexOutputs.vColor = vec4<f32>(pointOptions.color.rgb, pointOptions.pointOpacity);'
    }
    
    if (vertexInputs.state == 1.0) {
      vertexOutputs.vColor = selectionColor;
    }
    else if (vertexInputs.state == 2.0) {
      vertexOutputs.vColor = pickColor;
    }
  }
`;

  ShaderStore.ShadersStoreWGSL[
    `PointCloudSimpleFT${featureType}FragmentShader`
  ] = `
  varying vColor: vec4<f32>;

  @fragment
  fn main(input : FragmentInputs) -> FragmentOutputs {
    fragmentOutputs.color = fragmentInputs.vColor;
  }
`;

  const material = new ShaderMaterial(
    'PointCloudSimpleShader',
    scene,
    {
      vertex: `PointCloudSimpleFT${featureType}`,
      fragment: `PointCloudSimpleFT${featureType}`
    },
    {
      attributes: attributeName
        ? ['position', 'loc', 'state', attributeName]
        : ['position', 'loc', 'state'],
      uniformBuffers: ['Scene', 'Mesh', 'pointOptions'],
      shaderLanguage: ShaderLanguage.WGSL,
      needAlphaBlending: true
    }
  );

  return material;
}

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
      float pointOpacity;
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

    layout(std140) uniform pointOptions {
      float pointSize;
      vec4 color;
      vec4 colorScheme[32];
      float pointOpacity;
    };

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

      glFragColor = vec4(vColor.rgb, pointOpacity);
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
      useClipPlane: true,
      needAlphaBlending: true
    }
  );

  material.pointsCloud = true;

  return material;
}
