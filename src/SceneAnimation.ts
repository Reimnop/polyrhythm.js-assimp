import { NodeAnimation, SceneAnimation } from "polyrhythmjs";

export class AssimpSceneAnimation implements SceneAnimation {
    public name: string;
    public durationInTicks: number;
    public ticksPerSecond: number;
    public nodeAnimations: NodeAnimation[];

    private readonly nodeAnimationMap: Map<string, NodeAnimation> = new Map<string, NodeAnimation>();

    constructor(name: string, durationInTicks: number, ticksPerSecond: number, nodeAnimations: NodeAnimation[]) {
        this.name = name;
        this.durationInTicks = durationInTicks;
        this.ticksPerSecond = ticksPerSecond;
        this.nodeAnimations = nodeAnimations;
        for (const nodeAnimation of nodeAnimations) {
            this.nodeAnimationMap.set(nodeAnimation.name, nodeAnimation);
        }
    }

    getNodeAnimation(name: string): NodeAnimation | null {
        return this.nodeAnimationMap.get(name) || null;
    }
}