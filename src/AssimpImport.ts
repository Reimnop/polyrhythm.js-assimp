import { mat3, mat4, quat, vec3 } from "gl-matrix";
import { NodeAnimation, NodeMesh, Scene, SceneAnimation, SceneCamera, SceneLight, SceneLightType, SceneMaterial, SceneMesh, SceneNode, TypedKey, Vertex } from "polyrhythmjs";
import { AssimpSceneAnimation } from "./SceneAnimation";

export class AssimpImport {
    private assimpJs: any;
    private readonly files: Map<string, ArrayBuffer> = new Map<string, ArrayBuffer>();

    async loadAssimp() {
        const assimp = require("assimpjs");
        this.assimpJs = await assimp();
    }

    pushFile(path: string, data: ArrayBuffer) {
        this.files.set(path, data);
    }

    loadScene(): Scene {
        const json = this.getAssimpJson();
        const rootNode = this.loadSceneNode(json.rootnode, json);
        const cameras = [...this.loadSceneCameras(json)];
        const lights = [...this.loadSceneLights(json)];
        const meshes = [...this.loadSceneMeshes(json)];
        const materials = [...this.loadSceneMaterials(json)];
        const animations = [...this.loadSceneAnimations(json)];
        return { rootNode, cameras, lights, meshes, materials, animations };
    }

    private *loadSceneAnimations(json: any): Iterable<SceneAnimation> {
        if (json.animations) {
            for (const animation of json.animations) {
                const name = animation.name;
                const durationInTicks = animation.duration;
                const ticksPerSecond = animation.tickspersecond;
                const nodeAnimations = [...this.loadNodeAnimations(animation)];
                yield new AssimpSceneAnimation(name, durationInTicks, ticksPerSecond, nodeAnimations);
            }
        }
    }

    private *loadNodeAnimations(animation: any): Iterable<NodeAnimation> {
        if (animation.channels) {
            for (const channel of animation.channels) {
                const name = channel.name;
                const positionKeys = [...this.loadPositionKeys(channel)];
                const scaleKeys = [...this.loadScaleKeys(channel)];
                const rotationKeys = [...this.loadRotationKeys(channel)];
                yield { name, positionKeys, scaleKeys, rotationKeys };
            }
        }
    }

    private *loadPositionKeys(channel: any): Iterable<TypedKey<vec3>> {
        if (channel.positionkeys) {
            for (const key of channel.positionkeys) {
                const time = key[0];
                const value = vec3.fromValues(key[1][0], key[1][1], key[1][2]);
                yield { time, value };
            }
        }
    }

    private *loadScaleKeys(channel: any): Iterable<TypedKey<vec3>> {
        if (channel.scalingkeys) {
            for (const key of channel.scalingkeys) {
                const time = key[0];
                const value = vec3.fromValues(key[1][0], key[1][1], key[1][2]);
                yield { time, value };
            }
        }
    }

    private *loadRotationKeys(channel: any): Iterable<TypedKey<quat>> {
        if (channel.rotationkeys) {
            for (const key of channel.rotationkeys) {
                const time = key[0];
                const value = quat.fromValues(key[1][1], key[1][2], key[1][3], key[1][0]);
                yield { time, value };
            }
        }
    }

    private *loadSceneMaterials(json: any): Iterable<SceneMaterial> {
        if (json.materials) {
            for (const material of json.materials) {
                const matProperties = material.properties;
                const matDiffuse = matProperties.find((prop: any) => prop.key === "$clr.diffuse")?.value ?? [1.0, 1.0, 1.0, 1.0];
                const matMetallic = matProperties.find((prop: any) => prop.key === "$mat.metallicFactor")?.value ?? 0.0;
                const matRoughness = matProperties.find((prop: any) => prop.key === "$mat.roughnessFactor")?.value ?? 0.0;
                const albedo = vec3.fromValues(matDiffuse[0], matDiffuse[1], matDiffuse[2]);
                const metallic = matMetallic;
                const roughness = matRoughness;
                yield { 
                    name: "Material", 
                    albedo, 
                    metallic, 
                    roughness 
                };
            }
        }
    }

    private *loadSceneMeshes(json: any): Iterable<SceneMesh> {
        if (json.meshes) {
            for (const mesh of json.meshes) {
                const name = mesh.name;
                const vertices = this.getMeshVertices(mesh);
                const faces = mesh.faces;
                const indices = faces.flat();
                yield { name, vertices, indices };
            }
        }
    }

    private getMeshVertices(mesh: any): Vertex[] {
        const vertices: Vertex[] = [];
        for (let i = 0; i < mesh.vertices.length / 3; i++) {
            const position = vec3.fromValues(
                mesh.vertices[i * 3 + 0],
                mesh.vertices[i * 3 + 1],
                mesh.vertices[i * 3 + 2]
            );
            const normal = vec3.fromValues(
                mesh.normals[i * 3 + 0],
                mesh.normals[i * 3 + 1],
                mesh.normals[i * 3 + 2]
            );
            // TODO: This is very wrong
            const color = vec3.fromValues(1.0, 1.0, 1.0);
            vertices.push({ position, normal, color });
        }
        return vertices;
    }

    private *loadSceneLights(json: any): Iterable<SceneLight> {
        if (json.lights) {
            for (const light of json.lights) {
                const name = light.name;
                const type = this.getLightType(light.type);
                const color = vec3.fromValues(light.diffusecolor[0], light.diffusecolor[1], light.diffusecolor[2]);
                const intensity = light.attenuationconstant;
                const innerConeAngle = light.angleinnercone ?? 0.0;
                const outerConeAngle = light.angleoutercone ?? 0.0;
                const range = light.attenuationlinear;
                const falloff = light.attenuationquadratic;
                yield {
                    name,
                    type,
                    color,
                    intensity,
                    innerConeAngle,
                    outerConeAngle,
                    range,
                    falloff
                };
            }
        }
    }

    private getLightType(type: number): SceneLightType {
        switch (type) {
            case 1: return SceneLightType.Directional;
            case 2: return SceneLightType.Point;
            case 3: return SceneLightType.Spot;
            default: throw new Error(`Unknown light type: ${type}`);
        }
    }

    private *loadSceneCameras(json: any): Iterable<SceneCamera> {
        if (json.cameras) {
            for (const camera of json.cameras) {
                const name = camera.name;
                const farClipPlane = camera.clipplanefar;
                const nearClipPlane = camera.clipplanenear;
                const horizontalFov = camera.horizontalfov;
                const up = vec3.fromValues(camera.up[0], camera.up[1], camera.up[2]);
                const lookAt = vec3.fromValues(camera.lookat[0], camera.lookat[1], camera.lookat[2]);
                const right = vec3.cross(vec3.create(), up, lookAt);
                const rotationMatrix = mat3.fromValues(
                    right[0], up[0], lookAt[0], 
                    right[1], up[1], lookAt[1], 
                    right[2], up[2], lookAt[2]
                );
                const rotation = quat.fromMat3(quat.create(), rotationMatrix);
                yield {
                    name,
                    nearClipPlane,
                    farClipPlane,
                    horizontalFov,
                    rotation
                };
            }
        }
    }

    private loadSceneNode(nodeJson: any, json: any): SceneNode {
        const name = nodeJson.name;
        const transform = nodeJson.transformation;
        const meshes: NodeMesh[] = [];
        const children: SceneNode[] = [];
        
        if (nodeJson.meshes) {
            for (const mesh of nodeJson.meshes) {
                meshes.push({
                    meshIndex: mesh,
                    materialIndex: json.meshes[mesh].materialindex
                });
            }
        }
        if (nodeJson.children) {
            for (const child of nodeJson.children) {
                children.push(this.loadSceneNode(child, json));
            }
        }
        return {
            name,
            transform: mat4.fromValues(
                transform[0], transform[4], transform[8], transform[12],
                transform[1], transform[5], transform[9], transform[13],
                transform[2], transform[6], transform[10], transform[14],
                transform[3], transform[7], transform[11], transform[15],
            ),
            meshes,
            children
        };
    }

    private getAssimpJson(): any {
        const fileList = new this.assimpJs.FileList();
        for (const [path, data] of this.files.entries())
            fileList.AddFile(path, new Uint8Array(data));

        const result = this.assimpJs.ConvertFileList(fileList, "assjson");
        if (!result.IsSuccess() || result.FileCount() === 0)
            throw new Error(`Assimp failed to convert files! Error code: ${result.GetErrorCode()}`);

        const resultFile = result.GetFile(0);
        const textDecoder = new TextDecoder();
        const jsonContent = textDecoder.decode(resultFile.GetContent());
        return JSON.parse(jsonContent);
    }
}