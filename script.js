const projects = [
  {
    name: "hakogazou",
    description: "ボードゲームの箱画像を簡単に生成するツール。",
    language: "JavaScript",
    category: "tool",
    tags: ["boardgame", "image", "canvas"],
    demoUrl: "https://kaigemap.github.io/hakogazou/",
    repoUrl: "https://github.com/kaigemap/hakogazou",
    screenshotUrl: "assets/screenshots/hakogazou.png",
    updated: "2026-05-03",
  },
  {
    name: "zatsucard",
    description: "テストプレイ用の雑カードをブラウザでつくるツール。",
    language: "JavaScript",
    category: "tool",
    tags: ["boardgame", "prototype", "cards"],
    demoUrl: "https://kaigemap.github.io/zatsucard/",
    repoUrl: "https://github.com/kaigemap/zatsucard",
    screenshotUrl: "assets/screenshots/zatsucard.png",
    updated: "2026-05-03",
  },
  {
    name: "discord-streamkit-layer",
    description: "Discord StreamKit Overlay 用のカスタム CSS ツール。",
    language: "CSS",
    category: "stream",
    tags: ["discord", "obs", "overlay"],
    demoUrl: "https://kaigemap.github.io/discord-streamkit-layer/",
    repoUrl: "https://github.com/kaigemap/discord-streamkit-layer",
    screenshotUrl: "assets/screenshots/discord-streamkit-layer.png",
    updated: "2026-01-07",
  },
  {
    name: "BrowserSenkou",
    description: "ブラウザで供えるお線香。",
    language: "HTML",
    category: "experiment",
    tags: ["html", "small-tool"],
    demoUrl: "https://kaigemap.github.io/BrowserSenkou/",
    repoUrl: "https://github.com/kaigemap/BrowserSenkou",
    screenshotUrl: "assets/screenshots/BrowserSenkou.png",
    updated: "2023-01-11",
  },
  {
    name: "component-to-table",
    description: "Figma のコンポーネントと CSV から表を生成するための実験。",
    language: "HTML",
    category: "design",
    tags: ["figma", "csv", "table"],
    demoUrl: "",
    repoUrl: "https://github.com/kaigemap/component-to-table",
    screenshotUrl: "assets/screenshots/component-to-table.png",
    updated: "2025-11-30",
  },
  {
    name: "ccfolayer",
    description: "OBS でココフォリアを録画するときのカスタム CSS。",
    language: "CSS",
    category: "stream",
    tags: ["ccfolia", "obs", "css"],
    demoUrl: "https://note.com/kaige_h/m/me2ed31ea492f",
    repoUrl: "https://github.com/kaigemap/ccfolayer",
    screenshotUrl: "assets/screenshots/ccfolayer.png",
    updated: "2024-04-09",
  },
  {
    name: "html-clock",
    description: "HTML, CSS, JavaScript で描画する時計。配信用などに。",
    language: "HTML",
    category: "stream",
    tags: ["clock", "stream", "html"],
    demoUrl: "",
    repoUrl: "https://github.com/kaigemap/html-clock",
    screenshotUrl: "assets/screenshots/html-clock.png",
    updated: "2024-01-08",
  },
];

const categoryLabels = {
  design: "Design",
  experiment: "Experiment",
  stream: "Streaming",
  tool: "Tool",
};

const grid = document.querySelector("#project-grid");
const emptyMessage = document.querySelector("#empty-message");
const searchInput = document.querySelector("#search-input");
const filterButtons = document.querySelectorAll("[data-filter]");
const workCount = document.querySelector("#work-count");
const demoCount = document.querySelector("#demo-count");

let activeFilter = "all";

function normalize(value) {
  return value.toLowerCase().trim();
}

function projectMatches(project, query) {
  const text = normalize(
    [project.name, project.description, project.language, project.category, ...project.tags].join(" "),
  );
  return text.includes(query);
}

function createLink(href, label, variant) {
  const link = document.createElement("a");
  link.className = `button ${variant}`;
  link.href = href;
  link.textContent = label;
  return link;
}

function createProjectCard(project) {
  const article = document.createElement("article");
  article.className = "project-card";
  article.dataset.category = project.category;

  const screenshot = document.createElement("figure");
  screenshot.className = "project-screenshot";

  const image = document.createElement("img");
  image.src = project.screenshotUrl;
  image.alt = `${project.name} screenshot`;
  image.loading = "lazy";
  image.addEventListener("error", () => {
    screenshot.classList.add("is-missing");
    image.remove();
  });

  const placeholder = document.createElement("span");
  placeholder.textContent = project.name;
  screenshot.append(image, placeholder);

  const meta = document.createElement("div");
  meta.className = "project-meta";

  const category = document.createElement("span");
  category.textContent = categoryLabels[project.category];

  const updated = document.createElement("span");
  updated.textContent = project.updated;
  meta.append(category, updated);

  const title = document.createElement("h3");
  title.className = "project-title";
  title.textContent = project.name;

  const description = document.createElement("p");
  description.className = "project-description";
  description.textContent = project.description;

  const tagList = document.createElement("div");
  tagList.className = "tag-list";
  project.tags.forEach((tag) => {
    const item = document.createElement("span");
    item.className = "tag";
    item.textContent = tag;
    tagList.append(item);
  });

  const links = document.createElement("div");
  links.className = "project-links";

  if (project.demoUrl) {
    links.append(createLink(project.demoUrl, "Open", "primary"));
  }

  links.append(createLink(project.repoUrl, "GitHub", "secondary"));

  article.append(screenshot, meta, title, description, tagList, links);
  return article;
}

function renderProjects() {
  const query = normalize(searchInput.value);
  const filteredProjects = projects.filter((project) => {
    const filterMatches = activeFilter === "all" || project.category === activeFilter;
    return filterMatches && projectMatches(project, query);
  });

  grid.replaceChildren(...filteredProjects.map(createProjectCard));
  emptyMessage.hidden = filteredProjects.length > 0;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    renderProjects();
  });
});

searchInput.addEventListener("input", renderProjects);

if (workCount) {
  workCount.textContent = String(projects.length);
}

if (demoCount) {
  demoCount.textContent = String(projects.filter((project) => project.demoUrl).length);
}

renderProjects();
