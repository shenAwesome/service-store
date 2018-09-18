import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import sourceMaps from 'rollup-plugin-sourcemaps'
import camelCase from 'lodash.camelcase'
import typescript from 'rollup-plugin-typescript2'
import json from 'rollup-plugin-json'
const pkg = require('./package.json')
import collectSass from 'rollup-plugin-collect-sass'

const libraryName = 'service-store'

const globals = {
  //'lodash': 'lodash'
};

const externals = ["immer", "lodash", "react", "react-redux", "redux", "classnames"]

export default {
  input: `src/index.ts`,
  output: [
    { file: pkg.main, format: 'cjs', sourcemap: true, globals }, //common js bundle
    { file: pkg.module, format: 'es', sourcemap: true, globals } //es bundle
  ],
  external: externals,//modules you don't wanna include in bundle 
  watch: {
    include: 'src/**',
  },
  plugins: [
    json(),// Allow json resolution 
    collectSass(),
    typescript({ useTsconfigDeclarationDir: true }),// Compile TypeScript files 
    commonjs(), // Allow bundling common js modules 
    resolve(),//Allow node_modules resolution https://github.com/rollup/rollup-plugin-node-resolve#usage
    sourceMaps()// Resolve source maps to the original source
  ]
}
