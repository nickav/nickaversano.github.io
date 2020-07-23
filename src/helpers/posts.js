import { parseItems } from '@h/functions';

const context = require.context('~/public/_posts', true, /\.md$/);
const files = {};
context.keys().forEach(function(key) {
  files[key] = context(key);
});

const posts = parseItems(files);
console.log({ posts });
