const $page = document.getElementById('page');

function createLinkClick(href) {
  return function (event) {
    const url = new URL(href);

    if (url.pathname === window.location.pathname) {
      event.preventDefault();
      return;
    }

    const payload = {
      path: url.pathname,
      method: 'PUSH',
    };

    history.pushState(null, '', href);
    route(payload);

    // prevent page from reloading
    event.preventDefault();
    return false;
  }
}

function preventDefault(event) {
  event.preventDefault();
  return false;
}

function handlePopState(event) {
  const payload = { path: document.location.pathname, method: 'POP' };
  route(payload);
}

function route(state) {
  console.log('route', state);

  window.scrollTo(0, 0);
  document.body.scrollTop = 0;

  const slug = state.path.slice(1);
  const page = pages.find((it) => it.slug === slug) || pages[0];

  document.title = page.title;
  $page.innerHTML = page.html;
  updateLinks($page.getElementsByTagName('a'));

  return page;
}

const origin = window.location.origin;
function isExternalLink(link) {
  return link.href.startsWith('http') && !link.href.startsWith(origin);
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
      link.addEventListener('click', createLinkClick(link.href));
    }
  });
}

function maybeRevealEmail(event) {
  if (!event.isTrusted) return;

  event.target.href = `mailto:n@${location.host}`;
}

function load() {
  addBlankTargetToExternalLinks(document.getElementsByTagName('a'));

  const $email = document.getElementById('email');
  if ($email) {
    $email.addEventListener('keydown', maybeRevealEmail);
    $email.addEventListener('click', maybeRevealEmail);
  }

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
