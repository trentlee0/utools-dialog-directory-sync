const fs = require('fs')
const { resolve } = require('path')
const { generateFeatures } = require('utools-utils')
const ncc = require('@vercel/ncc')
const plugin = require('./plugin.json')
const main = require('./dist/main')

function build(config) {
  console.log('Start building ...')
  const { distDir, replaces, copyDirs } = config

  for (const dir of copyDirs) {
    fs.cpSync(dir, distDir, { recursive: true })
  }

  for (const replace of replaces) {
    const newContent = replace.action(fs.readFileSync(replace.source).toString())
    fs.writeFileSync(replace.destination, newContent)
  }
  console.log('Finish building!')
}

const distDir = resolve(__dirname, 'dist')
ncc(resolve(__dirname, 'node_modules/utools-utils/dist/index.js'), {
  externals: [],
  filterAssetBase: process.cwd(),
  sourceMap: false,
  watch: false,
  target: 'es2015'
}).then(({ code, map, assets }) => {
  const nodeModules = resolve(distDir, 'node_modules')
  if (!fs.existsSync(nodeModules)) {
    fs.mkdirSync(nodeModules)
  }
  fs.writeFileSync(resolve(nodeModules, 'utools-utils.js'), code)
})

build({
  distDir,
  replaces: [
    {
      source: resolve(__dirname, 'plugin.json'),
      destination: resolve(distDir, 'plugin.json'),
      action: () => {
        delete main['default']
        plugin.features = generateFeatures(main)
        const res = JSON.stringify(plugin, null, 2)
        console.log('plugin.json: ')
        console.log(res)
        return res
      }
    }
  ],
  copyDirs: [resolve(__dirname, 'public')]
})
