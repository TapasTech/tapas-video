const fs = require('fs');
const ensureDir = require('ensure-dir');
const promisify = require('es6-promisify');
const less = require('less');
const watch = require('watch');
const rollup = require('rollup');
const rollupConfig = require('./rollup.config');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
var cache;

function loadData(key) {
  if (key.startsWith('ICON_')) {
    return readFile(`src/assets/${key.slice(5)}.svg`, 'utf8')
    .then(value => ({key, value}), err => {console.error(err);});
  }
}

function buildCSS() {
  return readFile('src/style.less', 'utf8')
  .then(input => less.render(input))
  .then(output => output.css);
}

function buildJS() {
  return Promise.all([
    buildCSS(),
    rollup.rollup(Object.assign({cache}, rollupConfig)),
    ensureDir('lib'),
  ])
  .then(([css, bundle]) => {
    cache = bundle;
    const res = bundle.generate(rollupConfig);
    const promises = [];
    const reICON = /'__(\w+)__'/g;
    res.code.replace(reICON, (m, key) => {
      promises.push(loadData(key));
    });
    return Promise.all(promises)
    .then(results => results.reduce((res, item) => Object.assign(res, item && {
      [item.key]: item.value,
    }), {
      STYLE: css,
    }))
    .then(icons => res.code.replace(reICON, (m, key) => JSON.stringify(icons[key] || '')))
    .then(code => writeFile(rollupConfig.dest, code, 'utf8'));
  });
}

const safeBuild = function () {
  function build() {
    willBuild = false;
    building = true;
    console.time('Build');
    return buildJS()
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