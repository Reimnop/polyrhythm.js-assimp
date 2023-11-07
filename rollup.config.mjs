import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default [
    {
        input: "src/index.ts",
        output: {
            dir: "build",
            format: "esm",
            name: "polyrhythmjs-assimp-import",
            sourcemap: true,
            globals: {
                "gl-matrix": "glMatrix"
            }
        },
        plugins: [
            typescript(),
            commonjs(),
            nodeResolve(),
            terser()
        ]
    }
];