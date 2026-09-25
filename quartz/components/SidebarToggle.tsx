import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const SidebarToggle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <div class={classNames(displayClass, "sidebar-toggle-container")}>
      <button
        class="sidebar-toggle sidebar-toggle-left"
        data-sidebar-toggle="left"
        aria-controls="left-sidebar"
        aria-label="Hide navigation sidebar"
        aria-expanded="true"
        title="Hide navigation sidebar"
      >
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
    const page = document.querySelector(".page")
    if (!page) return

    for (const toggle of document.querySelectorAll("[data-sidebar-toggle]")) {
      const side = toggle.getAttribute("data-sidebar-toggle")
      if (side !== "left" && side !== "right") continue

      const stateClass = "sidebar-" + side + "-collapsed"
      const storageKey = "sidebar-" + side + "-collapsed"
      let savedState = localStorage.getItem(storageKey)

      // Preserve the state saved by the original single-sidebar control.
      if (side === "left" && savedState === null) {
        savedState = localStorage.getItem("sidebar-collapsed")
      }

      page.classList.toggle(stateClass, savedState === "true")

      const updateToggle = () => {
        const isCollapsed = page.classList.contains(stateClass)
        const label = isCollapsed ? "Show" : "Hide"
        const sidebarName = side === "left" ? "navigation sidebar" : "reading sidebar"
        toggle.setAttribute("aria-expanded", String(!isCollapsed))
        toggle.setAttribute("aria-label", label + " " + sidebarName)
        toggle.setAttribute("title", label + " " + sidebarName)
      }

      updateToggle()
      const handleToggle = () => {
        page.classList.toggle(stateClass)
        localStorage.setItem(storageKey, page.classList.contains(stateClass) ? "true" : "false")
        updateToggle()
      }

      toggle.addEventListener("click", handleToggle)
      window.addCleanup(() => toggle.removeEventListener("click", handleToggle))
    }
  })
`

SidebarToggle.css = `
.sidebar-toggle-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  min-width: 2.75rem;
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
  padding: 0.5rem;
  min-width: 2.75rem;
  min-height: 2.75rem;
  color: var(--darkgray);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.sidebar-toggle:hover {
  color: var(--secondary);
}

.sidebar-toggle svg {
  width: 24px;
  height: 24px;
}

/* The Explorer supplies the native left navigation toggle on mobile. */
@media all and (max-width: 800px) {
  .sidebar-toggle-left {
    display: none !important;
  }
}

.page > #quartz-body {
  transition: grid-template-columns 0.3s ease;
}

@media all and (min-width: 1200px) {
  .page.sidebar-left-collapsed > #quartz-body {
    grid-template-columns: 3rem minmax(0, 1fr) 320px !important;
  }

  .page.sidebar-right-collapsed > #quartz-body {
    grid-template-columns: 320px minmax(0, 1fr) 3rem !important;
  }

  .page.sidebar-left-collapsed.sidebar-right-collapsed {
    max-width: none;
    margin: 0;
  }

  .page.sidebar-left-collapsed.sidebar-right-collapsed > #quartz-body {
    grid-template-columns: 3rem minmax(0, 1fr) 3rem !important;
  }
}

@media all and (min-width: 800px) and (max-width: 1200px) {
  .page.sidebar-left-collapsed > #quartz-body {
    grid-template-columns: 3rem minmax(0, 1fr) !important;
  }
}

@media all and (min-width: 800px) {
  .sidebar.left,
  .sidebar.right {
    transition: padding 0.3s ease;
    overflow-x: hidden;
  }

  .page.sidebar-left-collapsed > #quartz-body .sidebar.left {
    padding-right: 2px;
    padding-left: 2px;
  }

  .page.sidebar-right-collapsed > #quartz-body .sidebar.right {
    padding-left: 2px;
    padding-right: 2px;
  }

  .page.sidebar-left-collapsed .sidebar-toggle-container,
  .page.sidebar-right-collapsed .sidebar-toggle-container {
    width: 44px;
    min-width: 44px;
  }

  .page.sidebar-left-collapsed .sidebar-toggle-container h2.page-title {
    display: none;
  }

  .page.sidebar-right-collapsed .sidebar.right .sidebar-toggle-container {
    justify-content: center;
  }

  .sidebar.left > *:not(.sidebar-toggle-container) {
    transition: opacity 0.2s ease, transform 0.3s ease;
    min-width: 250px;
    transform: translateX(0);
  }

  .sidebar.right > *:not(.sidebar-toggle-container) {
    transition: opacity 0.2s ease, transform 0.3s ease;
    min-width: 250px;
    transform: translateX(0);
  }

  .page.sidebar-left-collapsed .sidebar.left > *:not(.sidebar-toggle-container) {
    opacity: 0;
    pointer-events: none;
    transform: translateX(-100%);
  }

  .page.sidebar-right-collapsed .sidebar.right > *:not(.sidebar-toggle-container) {
    opacity: 0;
    pointer-events: none;
    transform: translateX(100%);
  }

}

.sidebar.right .sidebar-toggle-container {
  justify-content: flex-end;
}

@media all and (max-width: 1199px) {
  .sidebar.right .sidebar-toggle-container {
    position: fixed;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 3;
    padding: 0.2rem;
    border: 1px solid var(--lightgray);
    border-radius: 6px;
    background: var(--light);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .sidebar.right > *:not(.sidebar-toggle-container) {
    overflow: hidden;
    transition: opacity 0.2s ease, transform 0.3s ease, max-height 0.3s ease;
  }

  .page.sidebar-right-collapsed .sidebar.right > *:not(.sidebar-toggle-container) {
    flex: 0 0 0 !important;
    max-height: 0 !important;
    margin: 0;
    opacity: 0;
    pointer-events: none;
    transform: translateX(100%);
  }
}
`

export default (() => SidebarToggle) satisfies QuartzComponentConstructor
