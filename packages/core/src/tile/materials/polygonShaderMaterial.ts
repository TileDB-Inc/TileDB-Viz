import {
  Scene,
  Effect,
  ShaderMaterial,
  ShaderStore,
  ShaderLanguage
} from '@babylonjs/core';
import { FeatureType } from '@tiledb-inc/viz-common';
import {
  COLOR_GROUPS,
  HIGHLIGHTED_STATE,
  MAX_CATEGORIES,
  SELECTED_STATE
} from '../constants';

export function PolygonShaderMaterialWebGPU(
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
        'vertexOutputs.vColor = vec4<f32>(vertexInputs.colorAttr, polygonOptions.opacity);';
      break;
    case FeatureType.CATEGORICAL:
      attributeName = 'group';
      attributeType = 'i32';
      coloring = `
        let category: i32 = i32(polygonOptions.groupMap[vertexInputs.group / 4][vertexInputs.group % 4]);
        vertexOutputs.vColor = mix(vec4<f32>(polygonOptions.colorScheme[category].rgb, polygonOptions.opacity), vec4<f32>(0), f32(category > 31));`;
      break;
  }

  ShaderStore.ShadersStoreWGSL[`PolygonFT${featureType}VertexShader`] = `
    #include<sceneUboDeclaration>
    #include<meshUboDeclaration>

    attribute position : vec3<f32>;
    attribute state : u32;
    ${attributeName ? `attribute ${attributeName}: ${attributeType};` : ''}

    const stateColorMap = array(
      vec4<f32>(0.0),
      vec4<f32>(0.0, 1.0, 0.0, 1.0),
      vec4<f32>(0.0, 0.0, 1.0, 1.0),
    );

    struct PolygonOptions {
      color: vec4<f32>,
      opacity: f32,
      colorScheme: array<vec4<f32>, ${COLOR_GROUPS.toFixed(0)}>,
      groupMap: array<vec4<f32>, ${MAX_CATEGORIES.toFixed(0)}>
    };

    var<uniform> polygonOptions : PolygonOptions;

    varying vColor: vec4<f32>;

    @vertex
    fn main(input: VertexInputs) -> FragmentInputs
    {
      vertexOutputs.position = scene.viewProjection * mesh.world * vec4<f32>(vertexInputs.position, 1.0);

      ${
        attributeName
          ? coloring
          : 'vertexOutputs.vColor = vec4<f32>(polygonOptions.color.rgb, polygonOptions.opacity);'
      }

      vertexOutputs.vColor = mix(vertexOutputs.vColor, stateColorMap[vertexInputs.state], f32(vertexInputs.state));
    }
  `;

  ShaderStore.ShadersStoreWGSL[`PolygonFT${featureType}FragmentShader`] = `
  varying vColor: vec4<f32>;

  @fragment
  fn main(input : FragmentInputs) -> FragmentOutputs {
    fragmentOutputs.color = fragmentInputs.vColor;
  }
`;

  const material = new ShaderMaterial(
    'PolygonSimpleShader',
    scene,
    {
      vertex: `PolygonFT${featureType}`,
      fragment: `PolygonFT${featureType}`
    },
    {
      attributes: attributeName
        ? ['position', 'state', attributeName]
        : ['position', 'state'],
      uniformBuffers: ['Scene', 'Mesh', 'polygonOptions'],
      shaderLanguage: ShaderLanguage.WGSL,
      needAlphaBlending: true
    }
  );

  material.backFaceCulling = false;

  return material;
}

export function PolygonShaderMaterialWebGL(scene: Scene): ShaderMaterial {
  Effect.ShadersStore['PolygonVertexShader'] = `
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
    uniform mat4 viewProjection;

    layout(std140) uniform polygonOptions {
      vec4 color;
      float opacity;
      vec4 colorScheme[${COLOR_GROUPS.toFixed(0)}];
      vec4 groupMap[${MAX_CATEGORIES.toFixed(0)}];
    };

    flat out vec4 vColor;

    void main(void)
    {
      gl_Position = worldViewProjection * vec4(position, 1.0);

      #include<clipPlaneVertex>

      #if (FEATURE_TYPE == ${FeatureType.RGB})
        vColor = vec4(colorAttr, 1.0);
      #elif (FEATURE_TYPE == ${FeatureType.CATEGORICAL})
        int category = int(groupMap[group / 4][group % 4]);
        if (category > 31) {
          vColor = vec4(0.0);
        }
        else {
          vColor = colorScheme[category];
        }
      #elif (FEATURE_TYPE == ${FeatureType.FLAT_COLOR})
        vColor = color;
      #endif

      if (state == ${HIGHLIGHTED_STATE.toFixed(1)}) {
        vColor = selectionColor;
      }
      else if (state == ${SELECTED_STATE.toFixed(1)}) {
        vColor = pickColor;
      }
    }
  `;

  Effect.ShadersStore['PolygonFragmentShader'] = `
    precision highp float;
    
    #include<clipPlaneFragmentDeclaration>

    layout(std140) uniform polygonOptions {
      vec4 color;
      float opacity;
      vec4 colorScheme[${COLOR_GROUPS.toFixed(0)}];
      vec4 groupMap[${MAX_CATEGORIES.toFixed(0)}];
    };


    flat in vec4 vColor;

    void main() {
      #include<clipPlaneFragment>

      #if (FEATURE_TYPE == ${FeatureType.CATEGORICAL})
        if (vColor.a == 0.0) {
          discard;
        }
      #endif

      glFragColor = vec4(vColor.rgb, opacity);
    }
  `;

  const material = new ShaderMaterial(
    'PolygonSimpleShader',
    scene,
    {
      vertex: 'Polygon',
      fragment: 'Polygon'
    },
    {
      attributes: ['position', 'colorAttr', 'group', 'state'],
      uniforms: ['world', 'worldViewProjection', 'viewProjection'],
      uniformBuffers: ['polygonOptions'],
      defines: ['FEATURE_TYPE'],
      shaderLanguage: ShaderLanguage.GLSL,
      useClipPlane: true,
      needAlphaBlending: true
    }
  );

  material.backFaceCulling = false;

  return material;
}
