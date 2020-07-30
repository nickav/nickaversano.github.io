const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const crypto = require('crypto');
const vm = require('vm');

const showdown = require('showdown');
const converter = new showdown.Converter();

const os_scan_directory = (dir, absolutePaths = true) => {
  const results = fs.readdirSync(dir);
  return absolutePaths ? results.map((file) => path.join(dir, file)) : results;
};

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

const os_scan_directory_and_read_entire_files = (dir, absolutePaths = true) => {
  const result = {};
  os_scan_directory(dir, true).forEach((file) => {
    const key = absolutePaths ? file : path.relative(dir, file);
    result[key] = os_read_entire_file(file);
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
    const isQuotted = value.startsWith(`'`) || value.startsWith(`"`);
    result[key] = isQuotted ? value.slice(1, value.length - 1) : value;
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
      body: converter.makeHtml(data.trim()),
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

const minifyHtml = (str) =>
  str.replace(/>\s+</gm, '><').replace(/\s{2,}/g, ' ');

const hashFile = (contents, type = 'sha1') => {
  const hash = crypto.createHash(type);
  hash.setEncoding('hex');
  hash.write(contents);
  hash.end();
  return hash.read();
};

const evalWithContext = (js, ctx = {}) => {
  return vm.runInContext(js, vm.createContext(ctx));
};

const stringify = (value) => {
  if (Array.isArray(value)) {
    return value.join('\n');
  }

  return value.toString();
};

const findMatchingBrace = (src, startIndex, openBrace, closeBrace) => {
  const startChar = src.charAt(startIndex);
  const matchForward = startChar === openBrace;
  const matchBackward = startChar === closeBrace;

  if (!matchForward && !matchBackward) {
    console.error(`startIndex must be a '${openBrace}' character!`);
    return -1;
  }

  const dir = matchForward ? 1 : -1;
  let index = startIndex + dir;
  let counter = 1;

  while (counter > 0 && index < src.length && index > 0) {
    const char = src.charAt(index);

    if (char === openBrace) {
      counter += dir;
    }

    if (char === closeBrace) {
      counter -= dir;
    }

    index += dir;
  }

  return counter === 0 ? index : -1;
};

const evaluateDynamicJs = (str, ctx = {}) => {
  let result = '';

  let prevIndex = 0;
  let openIndex = str.indexOf('{');

  while (openIndex >= 0) {
    const closeIndex = findMatchingBrace(str, openIndex, '{', '}');

    if (closeIndex < 0) {
      throw `Missing closing brace for expression: ${str.slice(
        openIndex,
        openIndex + 16
      )}...`;
    }

    const expr = str.slice(openIndex + 1, closeIndex - 1);
    const dynamicValue = stringify(evalWithContext(expr, ctx));

    result += str.slice(prevIndex, openIndex) + dynamicValue;

    prevIndex = closeIndex;
    openIndex = str.indexOf('{', closeIndex + 1);
  }

  result += str.slice(prevIndex);
  return result;
};

const inlineGlobals = (str, vars) => {
  str = '\n' + str;

  Object.keys(vars)
    .reverse()
    .forEach((key) => {
      const value = vars[key];

      const inline =
        typeof value === 'function'
          ? `var ${key} = ${value.toString()};`
          : `const ${key} = ${JSON.stringify(value)};`;
      str = `${inline}\n${str}`;
    });

  return str;
};

const run = () => {
  const publicPath = path.join(__dirname, '../public');
  const outputPath = path.join(__dirname, '../build');
  const srcPath = path.join(__dirname, '../src');
  const postsPath = path.join(srcPath, '_posts');
  const templatesPath = path.join(srcPath, '_templates');

  const posts = parseMarkdownFiles(
    os_scan_directory_and_read_entire_files(postsPath, false)
  );

  const srcFiles = os_scan_directory_and_read_entire_files(srcPath, false);
  const destFiles = {};

  const vars = {
    pages: [],
    posts,
  };

  const raw = (file) => {
    return fs.readFileSync(path.join(publicPath, file)).toString();
  };

  const ctx = {
    ...vars,
    raw,
    style: minifyCss(srcFiles['index.css']),
    title: 'Nick Aversano',
    content: '',
    meta: '',
  };

  const templates = os_scan_directory_and_read_entire_files(
    templatesPath,
    false
  );

  const doTemplate = (templateName, ctx) =>
    evaluateDynamicJs(templates[`${templateName}.html`], ctx);

  posts.forEach((post) => {
    ctx.title = post.title;
    ctx.post = post;
    post.html = doTemplate('post', ctx);
  });

  ctx.title = 'Nick Aversano';
  const homeHtml = doTemplate('home', ctx);
  vars.pages = [{ slug: '', title: 'Nick Aversano', html: homeHtml }];
  destFiles['index.js'] = inlineGlobals(srcFiles['index.js'], vars);

  const indexJsHash = hashFile(srcFiles['index.js']).slice(0, 8);

  const buildHtmlPage = (ctx, content) => {
    if (content) ctx.content = content;

    return minifyHtml(
      evaluateDynamicJs(srcFiles['index.html'], ctx).replace(
        '__JS_HASH__',
        indexJsHash
      )
    );
  };

  destFiles['index.html'] = buildHtmlPage(ctx, homeHtml);

  posts.forEach((post) => {
    ctx.title = post.title;
    const html = buildHtmlPage(ctx, post.html);
    destFiles[`${post.slug}.html`] = html;
  });

  os_remove_directory(outputPath);
  os_copy_directory(publicPath, outputPath);
  Object.keys(destFiles).forEach((key) => {
    const contents = destFiles[key];
    os_write_file(path.join(outputPath, key), contents);
  });
};

run();
