const path = require('path');
const loaderUtils = require('loader-utils');
const { RawSource, OriginalSource, ConcatSource } = require('webpack-sources');

function getFileList(map, ...dependencies) {
  return dependencies.reduce((set, dep) => {
    if (path.extname(dep)) return set.add(dep);
    return new Set([...set, ...getFileList(map, ...map[dep])]);
  }, new Set());
}

module.exports = function main(source) {
  const sourcePath = loaderUtils.getRemainingRequest(this);
  const concat = new ConcatSource(new OriginalSource(source, sourcePath));
  const options = loaderUtils.getOptions(this) || {};
  if (options.modules) {
    const config = JSON.parse(this.fs.readFileSync(path.join(this.context, 'moduleConfig.json')));
    getFileList(config.module, ...options.modules).forEach((f) => {
      const fpath = path.join(this.context, f);
      this.addDependency(fpath);
      concat.add(new OriginalSource(this.fs.readFileSync(fpath).toString(), fpath));
    });
  }
  concat.add(new RawSource('\nmodule.exports=cc;'));
  const result = concat.sourceAndMap();
  this.callback(null, result.source, result.map);
};
