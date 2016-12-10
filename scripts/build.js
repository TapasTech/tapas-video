const fs = require('fs');
const ensureDir = require('ensure-dir');
const promisify = require('es6-promisify');
const less = require('less');
const LessPluginAutoPrefix = require('less-plugin-autoprefix');
const LessPluginCleanCSS = require('less-plugin-clean-css');
const htmlmin = require('htmlmin');
const watch = require('watch');
const rollup = require('rollup');
const rollupConfig = require('./rollup.config');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const reICON = /'__(\w+)__'/g;
const lessPlugins = [
  new LessPluginAutoPrefix(),
  new LessPluginCleanCSS(),
];
var cache;

function loadData(key) {
  if (key.startsWith('ICON_')) {
    return readFile(`src/assets/${key.slice(5)}.svg`, 'utf8')
    .then(value => ({key, value}), err => {console.error(err);});
  }
}

function buildCSS() {
  return readFile('src/style.less', 'utf8')
  .then(input => less.render(input, {
    plugins: lessPlugins,
  }))
  .then(output => output.css);
}

function buildHTML() {
  return readFile('src/template.html', 'utf8')
  .then(input => htmlmin(input));
}

function buildJS() {
  return rollup.rollup(Object.assign({cache}, rollupConfig))
  .then(bundle => {
    cache = bundle;
    const res = bundle.generate(rollupConfig);
    return res.code;
  })
}

function buildAll() {
  return Promise.all([
    buildHTML(),
    buildCSS(),
    buildJS(),
    ensureDir('lib'),
  ])
  .then(([html, css, js]) => {
    const promises = [];
    js.replace(reICON, (m, key) => {
      promises.push(loadData(key));
    });
    return Promise.all(promises)
    .then(results => results.reduce((res, item) => Object.assign(res, item && {
      [item.key]: item.value,
    }), {
      STYLE: css,
      TEMPLATE: html,
    }))
    .then(icons => js.replace(reICON, (m, key) => JSON.stringify(icons[key] || '')))
    .then(code => writeFile(rollupConfig.dest, code, 'utf8'));
  });
}

const safeBuild = function () {
  function build() {
    willBuild = false;
    building = true;
    console.time('Build');
    return buildAll()
    .catch(err => {
      console.error(err);
    })
    .then(() => {
      console.timeEnd('Build');
      building = false;
      return willBuild && build();
    });
  }
  function safeBuild() {
    if (building) {
      willBuild = true;
      return;
    }
    build();
  }
  let building, willBuild;
  return safeBuild;
}();

if (process.argv.includes('-w')) {
  watch.watchTree('src', e => {
    safeBuild();
  });
} else {
  safeBuild();
}