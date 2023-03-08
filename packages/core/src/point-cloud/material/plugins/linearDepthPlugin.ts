import { MaterialPluginBase, Camera } from '@babylonjs/core';

export class LinearDepthMaterialPlugin extends MaterialPluginBase {

    get isEnabled() {
        return this._isEnabled;
    }

    set isEnabled(enabled) {
        if (this._isEnabled === enabled) {
            return;
        }
        this._isEnabled = enabled;
        this.markAllDefinesAsDirty();
        this._enable(this._isEnabled);
    }

    _isEnabled = false;

    constructor(material) {
        super(material, "LinearDepth", 1001);
    }

    getClassName() {
        return "LinearDepthMaterialPlugin";
    }

    getUniforms() {
        return {
            "ubo": [
                { name: "nearPlane", size: 1, type: "float" },
                { name: "farPlane", size: 1, type: "float" },
            ],
            "vertex":
                `
                uniform float nearPLane;
                uniform float farPlane;
            `,
        };
    }

    bindForSubMesh(uniformBuffer, scene, engine, subMesh) {
        const activeCamera: Camera | undefined = scene.activeCameras?.find(
            (camera: Camera) => {
              return !camera.name.startsWith('GUI');
            }
          );
        uniformBuffer.updateFloat("nearPlane", activeCamera.minZ);
        uniformBuffer.updateFloat("farPlane", activeCamera.maxZ);
    }

    getCustomCode(shaderType) {
        return shaderType === "vertex" ? {
            "CUSTOM_VERTEX_DEFINITIONS": `
                varying float vDepthMetric;
            `,
            "CUSTOM_VERTEX_MAIN_END": `
                vDepthMetric = (gl_Position.z + nearPlane) / farPlane;
            `,
        } : {
            "CUSTOM_FRAGMENT_DEFINITIONS": `
                varying float vDepthMetric;
            `,
            "CUSTOM_FRAGMENT_MAIN_END": `
                gl_FragColor = vec4(vDepthMetric, 0.0, 0.0, 1.0);
            `,
        };
    }
}