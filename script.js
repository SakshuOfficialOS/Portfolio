const root = document.documentElement;
const body = document.body;

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  syncCurrentYear();
  enhanceHeaderOnScroll();
  initDemoForm();

  // Detect the active page so one shared script can power both documents.
  const page = root.dataset.page || "home";
  if (page === "thumbnails") {
    initThumbnailsLibrary();
  }
});

function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");

  if (!toggle || !nav) {
    return;
  }

  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
    body.classList.remove("menu-open");
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    nav.classList.toggle("is-open", !isOpen);
    body.classList.toggle("menu-open", !isOpen);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) {
      closeMenu();
    }
  });
}

function syncCurrentYear() {
  document.querySelectorAll("#year").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

function enhanceHeaderOnScroll() {
  const header = document.querySelector(".site-header");

  if (!header) {
    return;
  }

  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 16);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
}

function initDemoForm() {
  const form = document.querySelector(".contact-form");
  const note = document.querySelector(".form-note");

  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (note) {
      note.textContent = "Front-end demo only. Connect this form to a backend or service like Formspree later.";
    }
  });
}

async function initThumbnailsLibrary() {
  const grid = document.getElementById("thumbnailGrid");
  const status = document.getElementById("thumbnailStatus");
  const resultsCount = document.getElementById("resultsCount");
  const categoryFilters = document.getElementById("categoryFilters");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");

  if (!grid || !status || !resultsCount || !categoryFilters || !searchInput || !sortSelect) {
    return;
  }

  const state = {
    allItems: [],
    visibleItems: [],
    activeCategory: "All",
    query: "",
    sortBy: "newest",
    activeIndex: 0
  };

  try {
    // The gallery is data-driven so adding new work only requires updating the JSON file.
    const response = await fetch("assets/thumbnails.json");
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    state.allItems = await response.json();
    renderCategoryFilters(state.allItems, categoryFilters, state, applyFilters);
    applyFilters();
    status.textContent = "Browse the library and click any card to open the preview.";
  } catch (error) {
    console.error("Failed to load thumbnails.json", error);
    status.textContent = "Unable to load thumbnails.json. Run this project from a local server such as VS Code Live Server.";
    grid.innerHTML = '<div class="thumbnail-empty">The thumbnails library could not be loaded. Check the console and confirm you are not using file://.</div>';
    return;
  }

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    applyFilters();
  });

  sortSelect.addEventListener("change", (event) => {
    state.sortBy = event.target.value;
    applyFilters();
  });

  initLightbox(state);

  function applyFilters() {
    const filtered = state.allItems.filter((item) => {
      const matchesCategory = state.activeCategory === "All" || item.category === state.activeCategory;
      const haystack = [
        item.title,
        item.category,
        item.client || "",
        ...(item.tags || [])
      ].join(" ").toLowerCase();
      const matchesQuery = !state.query || haystack.includes(state.query);
      return matchesCategory && matchesQuery;
    });

    state.visibleItems = sortItems(filtered, state.sortBy);
    resultsCount.textContent = String(state.visibleItems.length);

    if (!state.visibleItems.length) {
      grid.innerHTML = '<div class="thumbnail-empty">No thumbnails match this search yet. Try a different keyword or category.</div>';
      return;
    }

    grid.innerHTML = "";
    state.visibleItems.forEach((item, index) => {
      grid.appendChild(createThumbnailCard(item, index, state));
    });
  }
}

function renderCategoryFilters(items, container, state, applyFilters) {
  const categories = ["All", ...new Set(items.map((item) => item.category).filter(Boolean))];
  container.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${category === state.activeCategory ? " is-active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      state.activeCategory = category;
      container.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.remove("is-active"));
      button.classList.add("is-active");
      applyFilters();
    });
    container.appendChild(button);
  });
}

function sortItems(items, sortBy) {
  const cloned = [...items];

  if (sortBy === "az") {
    return cloned.sort((a, b) => a.title.localeCompare(b.title));
  }

  return cloned.sort((a, b) => {
    const first = new Date(a.date).getTime();
    const second = new Date(b.date).getTime();
    return sortBy === "oldest" ? first - second : second - first;
  });
}

function createThumbnailCard(item, index, state) {
  const card = document.createElement("article");
  card.className = "thumbnail-card";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "thumbnail-card-button";
  button.setAttribute("aria-label", `Open preview for ${item.title}`);

  const visual = document.createElement("div");
  visual.className = "thumbnail-visual";

  const image = document.createElement("img");
  image.src = `assets/thumbnails/${item.file}`;
  image.alt = item.title;
  attachImageFallback(image, item);
  visual.appendChild(image);

  const meta = document.createElement("div");
  meta.className = "thumbnail-meta";
  meta.innerHTML = `
    <h2>${escapeHtml(item.title)}</h2>
    <strong>${escapeHtml(item.category)}</strong>
    <span>${escapeHtml(item.client || "Independent Project")}</span>
  `;

  if (item.link) {
    const link = document.createElement("a");
    link.className = "thumbnail-link";
    link.href = item.link;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Visit Link";
    link.addEventListener("click", (event) => event.stopPropagation());
    meta.appendChild(link);
  }

  button.appendChild(visual);
  button.appendChild(meta);
  button.addEventListener("click", () => openLightbox(index, state));
  card.appendChild(button);

  return card;
}

function initLightbox(state) {
  const lightbox = document.getElementById("lightbox");
  const closeButtons = document.querySelectorAll("[data-close-lightbox]");
  const prevButton = document.getElementById("lightboxPrev");
  const nextButton = document.getElementById("lightboxNext");

  if (!lightbox || !prevButton || !nextButton) {
    return;
  }

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeLightbox);
  });

  prevButton.addEventListener("click", () => stepLightbox(-1, state));
  nextButton.addEventListener("click", () => stepLightbox(1, state));

  document.addEventListener("keydown", (event) => {
    const isOpen = lightbox.classList.contains("is-open");

    if (!isOpen) {
      return;
    }

    if (event.key === "Escape") {
      closeLightbox();
    }

    if (event.key === "ArrowRight") {
      stepLightbox(1, state);
    }

    if (event.key === "ArrowLeft") {
      stepLightbox(-1, state);
    }
  });
}

function openLightbox(index, state) {
  const lightbox = document.getElementById("lightbox");
  const image = document.getElementById("lightboxImage");
  const title = document.getElementById("lightboxTitle");
  const category = document.getElementById("lightboxCategory");
  const client = document.getElementById("lightboxClient");
  const date = document.getElementById("lightboxDate");
  const tags = document.getElementById("lightboxTags");
  const link = document.getElementById("lightboxLink");

  if (!lightbox || !image || !title || !category || !client || !date || !tags || !link) {
    return;
  }

  const item = state.visibleItems[index];
  if (!item) {
    return;
  }

  state.activeIndex = index;

  image.src = `assets/thumbnails/${item.file}`;
  image.alt = item.title;
  attachImageFallback(image, item);

  title.textContent = item.title;
  category.textContent = item.category || "-";
  client.textContent = item.client || "Independent Project";
  date.textContent = formatDate(item.date);

  tags.innerHTML = "";
  (item.tags || []).forEach((tag) => {
    const chip = document.createElement("span");
    chip.textContent = tag;
    tags.appendChild(chip);
  });

  if (item.link) {
    link.href = item.link;
    link.hidden = false;
  } else {
    link.hidden = true;
    link.removeAttribute("href");
  }

  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  body.classList.add("menu-open");
}

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) {
    return;
  }

  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  body.classList.remove("menu-open");
}

function stepLightbox(direction, state) {
  if (!state.visibleItems.length) {
    return;
  }

  const nextIndex = (state.activeIndex + direction + state.visibleItems.length) % state.visibleItems.length;
  openLightbox(nextIndex, state);
}

function attachImageFallback(image, item) {
  image.onerror = () => {
    // Missing files fall back to an inline SVG so the library stays usable before assets are added.
    image.src = createPlaceholderImage(item.title, item.category);
  };
}

function createPlaceholderImage(title, category) {
  const safeTitle = escapeHtml(title);
  const safeCategory = escapeHtml(category || "Thumbnail");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#141b24" />
          <stop offset="100%" stop-color="#06090d" />
        </linearGradient>
        <radialGradient id="glowA" cx="22%" cy="22%" r="38%">
          <stop offset="0%" stop-color="#b9ff66" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#b9ff66" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glowB" cx="84%" cy="18%" r="36%">
          <stop offset="0%" stop-color="#50b7ff" stop-opacity="0.72" />
          <stop offset="100%" stop-color="#50b7ff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#bg)" />
      <rect width="1600" height="900" fill="url(#glowA)" opacity="0.35" />
      <rect width="1600" height="900" fill="url(#glowB)" opacity="0.28" />
      <rect x="72" y="70" width="1456" height="760" rx="44" fill="#ffffff" fill-opacity="0.03" stroke="#ffffff" stroke-opacity="0.1" />
      <text x="120" y="190" fill="#b9ff66" font-size="42" font-family="Arial, sans-serif" font-weight="700" letter-spacing="5">${safeCategory.toUpperCase()}</text>
      <text x="120" y="330" fill="#f5f7fa" font-size="112" font-family="Arial, sans-serif" font-weight="700">${safeTitle}</text>
      <text x="120" y="770" fill="#9aa4b3" font-size="42" font-family="Arial, sans-serif">Add image file to assets/thumbnails/ to replace this preview.</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value || "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(parsed);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
