const content = document.getElementById('content');

//content.innerHTML = posts.map(e => e.id).join('\n');

// Really simple "hot" loader
window.addEventListener("focus", () => setTimeout(() => window.location.reload(), 300));
