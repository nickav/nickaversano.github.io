if (typeof posts === 'undefined') posts = [];
if (typeof pages === 'undefined') pages = [];

const content = document.getElementById('content');

function onLinkClick(event) {
  const href = event.target.href;
  const url = new URL(href);

  if (url.pathname === window.location.pathname) {
    event.preventDefault();
    return;
  }

  history.pushState(null, '', href);

  const payload = {
    path: url.pathname,
    method: 'PUSH',
  };
  route(payload);

  // prevent page from reloading
  event.preventDefault();
}

function handlePopState(event) {
  const payload = { path: document.location.pathname, method: 'POP' };
  route(payload);
}

function route(state) {
  console.log('route', state);

  const slug = state.path.slice(1);

  let page =
    posts.find((it) => it.slug === slug) ||
    pages.find((it) => it.slug === slug);

  console.log({ posts, pages });

  if (!page) {
    page = { title: '', html: 'Not Found!' };
  }

  document.title = titleify(page.title, 'Nick Aversano');
  content.innerHTML = page.html;
  bindInternalLinkListeners(content.getElementsByTagName('a'));
}

const origin = window.location.origin;
function isExternalLink(link) {
  return link.href.startsWith('http') && link.origin !== origin;
}

function addBlankTargetToExternalLinks() {
  var links = document.getElementsByTagName('a');
  for (var i = 0, n = links.length; i < n; i++) {
    const it = links[i];
    if (isExternalLink(it)) {
      it.target = '_blank';
    }
  }
}

function bindInternalLinkListeners(links) {
  Array.from(links).forEach((link) => {
    if (!isExternalLink(link)) {
      link.addEventListener('click', onLinkClick);
    }
  });
}

function load() {
  addBlankTargetToExternalLinks();

  const $year = document.getElementById('year');
  if ($year) {
    $year.innerText = new Date().getFullYear();
  }

  const historyIsSupported = typeof history.pushState === 'function';

  if (historyIsSupported) {
    window.addEventListener('popstate', handlePopState);
    bindInternalLinkListeners(document.getElementsByTagName('a'));
  }
}

window.addEventListener('load', load);
