const path = require('path');
const loaderUtils = require('loader-utils');
const { SourceListMap, fromStringWithSourceMap } = require('source-list-map');

function getFileList(map, ...dependencies) {
  return dependencies.reduce((set, dep) => {
    if (path.extname(dep)) return set.add(dep);
    return new Set([...set, ...getFileList(map, ...map[dep])]);
  }, new Set());
}

module.exports = function main(source, map) {
  const node = map ? fromStringWithSourceMap(source, map) : new SourceListMap();
  if (!map) {
    node.add(source, loaderUtils.getRemainingRequest(this), source);
  }
  const options = loaderUtils.getOptions(this) || {};
  if (options.modules) {
    const config = JSON.parse(this.fs.readFileSync(path.join(this.context, 'moduleConfig.json')));
    getFileList(config.module, ...options.modules).forEach((f) => {
      const fpath = path.join(this.context, f);
      this.addDependency(fpath);
      const fcontent = this.fs.readFileSync(fpath).toString();
      node.add(fcontent, fpath, fcontent);
    });
  }
  node.add('\nmodule.exports=cc;');
  const result = node.toStringWithSourceMap();
  this.callback(null, result.source, result.map);
};
