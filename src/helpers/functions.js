export const parseFrontmatter = (content) => {
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

export const extractFrontmatterAndData = (data) => {
  const closeFrontmatterIndex = data.indexOf('---', 3);
  const hasFrontmatter = data.indexOf('---') === 0 && closeFrontmatterIndex > 3;

  if (!hasFrontmatter) {
    return [null, data];
  }

  const content = data.slice(3, closeFrontmatterIndex).trim();
  const rest = data.slice(closeFrontmatterIndex + 3);
  return [parseFrontmatter(content), rest];
};

export const parseItems = (files) =>
  Object.keys(files).map((path) => {
    const raw = files[path].default;

    const key = path.slice(2);
    const parts = key.split('-');
    const id = parseInt(parts[0], 10);
    const slug = parts
      .slice(1)
      .join('-')
      .replace(/\.md$/, '');

    const [props, data] = extractFrontmatterAndData(raw);

    return {
      id,
      slug,
      props,
      data: data.trim(),
    };
  });
