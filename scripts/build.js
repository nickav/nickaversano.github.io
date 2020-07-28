const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const crypto = require('crypto');

const showdown = require('showdown');
const converter = new showdown.Converter();

const os_scan_directory = (dir) =>
  fs.readdirSync(dir).map((file) => path.join(dir, file));

const os_read_entire_file = (path) => {
  try {
    return fs.readFileSync(path).toString();
  } catch (err) {}
  return null;
};

const os_write_file = (path, contents) => {
  fs.writeFileSync(path, contents);
};

const os_copy_directory = (from, to) => {
  childProcess.execSync(`cp -r ${from} ${to}`);
};

const os_scan_directory_and_read_entire_files = (dir) => {
  const result = {};
  os_scan_directory(dir).forEach((file) => {
    result[file] = os_read_entire_file(file);
  });
  return result;
};

const os_remove_directory = (dir) => {
  childProcess.execSync(`rm -rf ${dir}`);
};

const path_basename = (file) => path.basename(file);

const parseFrontmatter = (content) => {
  const lines = content.split('\n');

  const result = {};
  lines.forEach((line) => {
    const firstColonIndex = line.indexOf(':');
    const delimIndex =
      firstColonIndex > 0 ? firstColonIndex : line.indexOf('=');
    if (delimIndex < 0) return;

    const key = line.slice(0, delimIndex).trim();
    const value = line.slice(delimIndex + 1).trim();
    result[key] = value;
  });

  return result;
};

const extractFrontmatterAndData = (data) => {
  const closeFrontmatterIndex = data.indexOf('---', 3);
  const hasFrontmatter = data.indexOf('---') === 0 && closeFrontmatterIndex > 3;

  if (!hasFrontmatter) {
    return [null, data];
  }

  const content = data.slice(3, closeFrontmatterIndex).trim();
  const rest = data.slice(closeFrontmatterIndex + 3);
  return [parseFrontmatter(content), rest];
};

const parseMarkdownFiles = (files) =>
  Object.keys(files).map((file) => {
    const raw = files[file];

    const key = path_basename(file);
    const parts = key.split('-');
    const id = parseInt(parts[0], 10);
    const slug = parts.slice(1).join('-').replace(/\.md$/, '');

    const [props, data] = extractFrontmatterAndData(raw);

    return {
      id,
      slug,
      html: converter.makeHtml(data.trim()),
      ...props,
    };
  });

const minifyCss = (str) => {
  str = str.replace(/\/\*(.|\n)*?\*\//g, '');
  str = str.replace(/\s*(\{|\}|\[|\]|\(|\)|\:|\;|\,)\s*/g, '$1');
  str = str.replace(/#([\da-fA-F])\1([\da-fA-F])\2([\da-fA-F])\3/g, '#$1$2$3');
  str = str.replace(
    /:[\+\-]?0(rem|em|ec|ex|px|pc|pt|vh|vw|vmin|vmax|%|mm|cm|in)/g,
    ':0'
  );
  str = str.replace(/\n/g, '');
  str = str.replace(/;\}/g, '}');
  str = str.replace(/^\s+|\s+$/g, '');
  return str;
};

const hashFile = (contents, type = 'sha1') => {
  const hash = crypto.createHash(type);
  hash.setEncoding('hex');
  hash.write(contents);
  hash.end();
  return hash.read();
};

const matchAll = (str, regex) => {
  if (!regex.global) {
    const result = str.match(regex);
    return result ? [result] : [];
  }

  const result = [];
  let match = null;
  while ((match = regex.exec(str))) {
    result.push(match);
  }
  return result;
};

const evalWithContext = (js, context) => {
  return function () {
    return eval(js);
  }.call(context);
};

const evaluateDynamicJs = (str, ctx = {}) => {
  let result = str;

  matchAll(str, /{(.*)}/g).forEach((match) => {
    const expr = match[1];
    const value = evalWithContext(expr, ctx);
    result =
      result.slice(0, match.index) +
      value +
      result.slice(match.index + match[0].length);
  });

  return result;
};

const publicPath = path.join(__dirname, '../public');
const outputPath = path.join(__dirname, '../build');
const srcPath = path.join(__dirname, '../src');
const postsPath = path.join(publicPath, '_posts');

const posts = parseMarkdownFiles(
  os_scan_directory_and_read_entire_files(postsPath)
);

const ctx = {
  posts,
};

const indexJs = os_read_entire_file(path.join(srcPath, 'index.js'));
const indexCss = minifyCss(
  os_read_entire_file(path.join(srcPath, 'index.css'))
);
const indexHtml = evaluateDynamicJs(
  os_read_entire_file(path.join(srcPath, 'index.html')),
  ctx
)
  .replace('__RANDOM__', Math.random())
  .replace('__JS_HASH__', hashFile(indexJs))
  .replace(
    '<link rel="stylesheet" href="./index.css" />',
    `<style>${indexCss}</style>`
  );

os_remove_directory(outputPath);
os_copy_directory(publicPath, outputPath);

os_write_file(path.join(outputPath, 'index.html'), indexHtml);
os_write_file(
  path.join(outputPath, 'index.js'),
  `const posts = ${JSON.stringify(posts)};\n\n${indexJs}`
);
