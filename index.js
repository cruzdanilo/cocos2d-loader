const path = require('path');
const loaderUtils = require('loader-utils');
const { RawSource, OriginalSource, ConcatSource } = require('webpack-sources');

function getFileList(map, dependencies, list = []) {
  dependencies.forEach((dep) => {
    if (path.extname(dep)) {
      if (!list.includes(dep)) list.push(dep);
    } else getFileList(map, map[dep], list);
  });
  return list;
}

module.exports = async function loader(content) {
  const sourcePath = loaderUtils.getRemainingRequest(this);
  const concat = new ConcatSource(new OriginalSource(`${content}\n`, sourcePath));
  const options = loaderUtils.getOptions(this) || {};
  if (options.modules) {
    this.async();
    const config = JSON.parse(this.fs.readFileSync(path.join(this.context, 'moduleConfig.json')));
    const sources = await Promise.all(getFileList(config.module, options.modules).map(async (f) => {
      const fpath = path.join(this.context, f);
      const source = await new Promise((resolve, reject) => this.fs.readFile(fpath, (err, data) => {
        if (err) reject(err);
        else resolve(new OriginalSource(`${data.toString()}\n`, fpath));
      }));
      this.addDependency(fpath);
      return source;
    }));
    sources.forEach(source => concat.add(source));
  }
  concat.add(new RawSource(`export ${options.exports ? `{${options.exports.join()}}` : 'default cc'};\n`));
  const result = concat.sourceAndMap();
  this.callback(null, result.source, result.map);
};
