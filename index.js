const path = require('path');
const loaderUtils = require('loader-utils');
const { SourceNode } = require('source-map');

function getFileList(map, ...dependencies) {
  return dependencies.reduce((set, dep) => {
    if (path.extname(dep)) return set.add(dep);
    return new Set([...set, ...getFileList(map, ...map[dep])]);
  }, new Set());
}

module.exports = function main(source, sourceMap) {
  const node = sourceMap ? SourceNode.fromStringWithSourceMap(source, sourceMap) :
    new SourceNode(1, 1, loaderUtils.getRemainingRequest(this), source);
  const options = loaderUtils.getOptions(this) || {};
  if (options.modules) {
    const config = JSON.parse(this.fs.readFileSync(path.join(this.context, 'moduleConfig.json')));
    getFileList(config.module, ...options.modules).forEach((f) => {
      const abs = path.join(this.context, f);
      this.addDependency(abs);
      node.add(new SourceNode(1, 1, f, this.fs.readFileSync(abs).toString()));
    });
  }
  node.add('\nmodule.exports=cc;');
  const result = node.toStringWithSourceMap();
  this.callback(null, result.code, result.map.toJSON());
};
