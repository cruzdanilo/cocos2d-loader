const path = require('path');
const loaderUtils = require('loader-utils');
const UglifyJS = require('uglify-es');

function getFileList(map, ...dependencies) {
  return dependencies.reduce((list, dep) => {
    if (path.extname(dep)) {
      if (!list.includes(dep)) list.push(dep);
    } else {
      list.push(...getFileList(map, ...map[dep]));
    }
    return list;
  }, []);
}

module.exports = function main(source) {
  const sources = { [loaderUtils.getRemainingRequest(this)]: source };
  const options = loaderUtils.getOptions(this) || {};
  if (options.modules) {
    const config = JSON.parse(this.fs.readFileSync(path.join(this.context, 'moduleConfig.json')));
    Object.assign(sources, ...getFileList(config.module, ...options.modules).map((file) => {
      const abs = path.join(this.context, file);
      this.addDependency(abs);
      return { [abs]: this.fs.readFileSync(abs).toString() };
    }));
  }
  const result = UglifyJS.minify(sources, { compress: { dead_code: true } });
  if (result.error) this.emitError(result.error);
  return `${result.code};module.exports=cc`;
};
