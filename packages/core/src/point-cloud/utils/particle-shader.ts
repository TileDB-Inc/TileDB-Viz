import {
  Effect,
  Engine,
  PostProcess,
  Scene,
  ShaderMaterial
} from '@babylonjs/core';
import { TileDBPointCloudOptions } from '.';
import { ArrayModelType } from '../../constants';

class ParticleShaderMaterial {
  shaderMaterial: ShaderMaterial;

  constructor(scene: Scene, neighbourCount: number, pointSize: number) {
    Effect.ShadersStore['customVertexShader'] = `
        attribute vec3 position;
        #include<bonesDeclaration>
        #include<morphTargetsVertexGlobalDeclaration>
        #include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]

        #include<instancesDeclaration>
        uniform mat4 viewProjection;
        uniform vec2 depthValues;
        #if defined(ALPHATEST) || defined(NEED_UV)
        varying vec2 vUV;
        uniform mat4 diffuseMatrix;
        #ifdef UV1
        attribute vec2 uv;
        #endif
        #ifdef UV2
        attribute vec2 uv2;
        #endif
        #endif
        varying float vDepthMetric;
        void main(void)
        {
            vec3 positionUpdated=position;
            #ifdef UV1
            vec2 uvUpdated=uv;
            #endif
            #include<morphTargetsVertexGlobal>
            #include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
            #include<instancesVertex>
            #include<bonesVertex>
            gl_Position=viewProjection*finalWorld*vec4(positionUpdated,1.0);
            #ifdef USE_REVERSE_DEPTHBUFFER
            vDepthMetric=((-gl_Position.z+depthValues.x)/(depthValues.y));
            #else
            vDepthMetric=((gl_Position.z+depthValues.x)/(depthValues.y));
            #endif
            #if defined(ALPHATEST) || defined(BASIC_RENDER)
            #ifdef UV1
            vUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
            #endif
            #ifdef UV2
            vUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));
            #endif
            #endif
            gl_PointSize = ${pointSize}.0;
        }
        `;

    Effect.ShadersStore['customFragmentShader'] = `
        #extension GL_EXT_frag_depth : enable
        precision highp float;

        #define NEIGHBOUR_COUNT ${neighbourCount}

        varying vec2 vUV;
        uniform sampler2D textureSampler;

        uniform float screenWidth;
        uniform float screenHeight;

        uniform vec2 neighbours[NEIGHBOUR_COUNT];
        uniform float edlStrength;
        uniform float radius;

        //uniform mat4 uProj;

        uniform sampler2D uEDLDepth;

        float response(float depth) {
            vec2 uvRadius = radius / vec2(screenWidth, screenHeight);

            float sum = 0.0;

            for(int i = 0; i < NEIGHBOUR_COUNT; i++){
            vec2 uvNeighbor = vUV + uvRadius * neighbours[i];

            float neighbourDepth = texture2D(uEDLDepth, uvNeighbor).r;
            neighbourDepth = (neighbourDepth == 1.0) ? 0.0 : neighbourDepth;

            if (neighbourDepth != 0.0) {
                if(depth == 0.0){
                sum += 100.0;
                }else{
                sum += max(0.0, depth - neighbourDepth);
                }
            }
            }

            return sum / float(NEIGHBOUR_COUNT);
        }

        void main(void)
        {
            vec4 cEDL = texture2D(textureSampler, vUV);

            float depth = texture2D(uEDLDepth, vUV).r;
            depth = (depth == 1.0) ? 0.0 : depth;
            float res = response(depth);
            float shade = exp(-res * 300.0 * edlStrength);

            gl_FragColor = vec4(cEDL.rgb * shade, cEDL.a);
            
            /*{
            float dl = pow(2.0, depth);
            vec4 dp = uProj * vec4(0.0, 0.0, -dl, 1.0);
            float pz = dp.z / dp.w;
            float fragDepth = (pz + 1.0) / 2.0;

            gl_FragDepthEXT = fragDepth;
            }*/

            /*if(depth == 0.0){
            discard;
            }*/
        }
        `;

    this.shaderMaterial = new ShaderMaterial(
      'shader',
      scene,
      {
        vertex: 'custom',
        fragment: 'custom'
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: [
          'world',
          'worldView',
          'worldViewProjection',
          'view',
          'projection'
        ]
      }
    );

    this.shaderMaterial.backFaceCulling = false;
  }

  public setShader(
    scene: Scene,
    model: ArrayModelType,
    options: TileDBPointCloudOptions,
    engine?: Engine
  ) {
    if (scene.activeCameras) {
      if (engine) {
        // add shader post-processing for EDL
        const edlStrength = options.edlStrength || 4.0;
        const edlRadius = options.edlRadius || 1.4;
        const neighbourCount = options.edlNeighbours || 8;
        const neighbours: number[] = [];
        for (let c = 0; c < neighbourCount; c++) {
          neighbours[2 * c + 0] = Math.cos((2 * c * Math.PI) / neighbourCount);
          neighbours[2 * c + 1] = Math.sin((2 * c * Math.PI) / neighbourCount);
        }

        const depthRenderer = scene.enableDepthRenderer(scene.activeCameras[0]);
        const depthTex = depthRenderer.getDepthMap();
        const screenWidth = engine?.getRenderWidth();
        const screenHeight = engine?.getRenderHeight();

        const postProcess = new PostProcess(
          'My custom post process',
          'custom',
          [
            'screenWidth',
            'screenHeight',
            'neighbours',
            'edlStrength',
            'radius'
          ],
          ['uEDLDepth'],
          1.0,
          scene.activeCameras[0]
        );

        if (model.useShader) {
          postProcess.onApply = function (effect: Effect) {
            effect.setFloat('screenWidth', screenWidth as number);
            effect.setFloat('screenHeight', screenHeight as number);
            effect.setArray2('neighbours', neighbours);
            effect.setFloat('edlStrength', edlStrength);
            effect.setFloat('radius', edlRadius);
            effect.setTexture('uEDLDepth', depthTex);
          };
        }
      }
    }
  }
}

export default ParticleShaderMaterial;
