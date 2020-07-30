const $page = document.getElementById('page');

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

  let page = pages.find((it) => it.slug === slug);

  if (!page) {
    page = { title: '', html: 'Not Found!' };
  }

  document.title = page.title;
  $page.innerHTML = page.html;
  updateLinks($page.getElementsByTagName('a'));
}

const origin = window.location.origin;
function isExternalLink(link) {
  return link.href.startsWith('http') && link.origin !== origin;
}

function updateLinks(links) {
  addBlankTargetToExternalLinks(links);
  bindInternalLinkListeners(links);
}

function addBlankTargetToExternalLinks(links) {
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
  addBlankTargetToExternalLinks(document.getElementsByTagName('a'));

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
