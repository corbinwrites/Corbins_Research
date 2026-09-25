import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const SidebarToggle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <div class={classNames(displayClass, "sidebar-toggle-container")}>
      <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle Sidebar">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide-menu"
        >
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      </button>
      <h2 class="page-title">
        <a href={baseDir}>{title}</a>
      </h2>
    </div>
  )
}

SidebarToggle.beforeDOMLoaded = `
  document.addEventListener("nav", () => {
    const toggle = document.getElementById("sidebar-toggle")
    const page = document.querySelector(".page")
    
    if (toggle && page) {
      toggle.addEventListener("click", () => {
        page.classList.toggle("sidebar-collapsed")
        
        // Save state to localStorage
        const isCollapsed = page.classList.contains("sidebar-collapsed")
        localStorage.setItem("sidebar-collapsed", isCollapsed ? "true" : "false")
      })
      
      // Load state from localStorage on initial load
      const savedState = localStorage.getItem("sidebar-collapsed")
      if (savedState === "true") {
        page.classList.add("sidebar-collapsed")
      } else {
        page.classList.remove("sidebar-collapsed")
      }
    }
  })
`

SidebarToggle.css = `
.sidebar-toggle-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.sidebar-toggle-container h2.page-title {
  font-size: 1.75rem;
  margin: 0;
  font-family: var(--titleFont);
  transition: opacity 0.2s ease, transform 0.3s ease;
}

.sidebar-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--darkgray);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  transition: color 0.2s ease;
}

.sidebar-toggle:hover {
  color: var(--secondary);
}

.sidebar-toggle svg {
  width: 24px;
  height: 24px;
}

/* Ensure it is hidden on mobile where the native mobile menu is used */
@media all and (max-width: 800px) {
  .sidebar-toggle {
    display: none !important;
  }
}

.page > #quartz-body {
  transition: grid-template-columns 0.3s ease;
}

@media all and (min-width: 1200px) {
  .page.sidebar-collapsed > #quartz-body {
    grid-template-columns: 3rem auto 320px !important;
  }
}

@media all and (min-width: 800px) and (max-width: 1200px) {
  .page.sidebar-collapsed > #quartz-body {
    grid-template-columns: 3rem auto !important;
  }
}

.sidebar.left {
  transition: padding 0.3s ease;
  overflow-x: hidden;
}

.page.sidebar-collapsed .sidebar.left {
  padding-right: 0;
  padding-left: 0.5rem;
}

/* We need to apply transitions to the children of the sidebar so they slide out nicely */
.sidebar.left > *:not(.sidebar-toggle-container) {
  transition: opacity 0.2s ease, transform 0.3s ease;
  min-width: 250px;
  transform: translateX(0);
}

.page.sidebar-collapsed .sidebar.left > *:not(.sidebar-toggle-container) {
  opacity: 0;
  pointer-events: none;
  transform: translateX(-100%);
}

.page.sidebar-collapsed .sidebar-toggle-container h2.page-title {
  opacity: 0;
  pointer-events: none;
  transform: translateX(-100%);
}
`

export default (() => SidebarToggle) satisfies QuartzComponentConstructor
