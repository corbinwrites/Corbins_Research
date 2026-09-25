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
.sidebar-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  color: var(--darkgray);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}
.sidebar-toggle:hover {
  color: var(--secondary);
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
`

export default (() => SidebarToggle) satisfies QuartzComponentConstructor
