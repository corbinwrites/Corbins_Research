import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const SidebarToggle: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <button class={classNames(displayClass, "sidebar-toggle")} id="sidebar-toggle" aria-label="Toggle Sidebar">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-collapse">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="3" x2="9" y2="21"></line>
      </svg>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-expand">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="3" x2="9" y2="21"></line>
        <polyline points="13 8 17 12 13 16"></polyline>
      </svg>
    </button>
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
.sidebar.left {
  position: relative;
}

.sidebar-toggle {
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: 50%;
  cursor: pointer;
  padding: 0.25rem;
  color: var(--darkgray);
  position: absolute;
  top: 5.5rem;
  right: -0.5rem;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, color 0.2s ease, right 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.sidebar-toggle:hover {
  color: var(--secondary);
  border-color: var(--secondary);
  transform: scale(1.05);
}

.sidebar-toggle svg {
  width: 18px;
  height: 18px;
}

.sidebar-toggle .icon-expand {
  display: none;
}

.page.sidebar-collapsed .sidebar-toggle .icon-collapse {
  display: none;
}

.page.sidebar-collapsed .sidebar-toggle .icon-expand {
  display: block;
}

@media all and (max-width: 1200px) {
  .sidebar-toggle {
    display: none;
  }
}

.page > #quartz-body {
  transition: grid-template-columns 0.3s ease;
}

.page.sidebar-collapsed > #quartz-body {
  grid-template-columns: 0px auto 320px !important;
}

.sidebar.left > *:not(.sidebar-toggle) {
  transition: opacity 0.2s ease, transform 0.3s ease;
  width: 250px;
}

.page.sidebar-collapsed .sidebar.left > *:not(.sidebar-toggle) {
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50px);
}
`

export default (() => SidebarToggle) satisfies QuartzComponentConstructor
