// Client-side script to load Cal.com Embed and hook trigger elements

document.addEventListener("nav", () => {
  // Check if we have Cal elements on the current page
  const hasCalElements = document.querySelector("[data-cal-link]")
  if (!hasCalElements) return

  const w = window as any

  // Initialize Cal script if not already loaded
  if (!w.Cal) {
    ;(function (C: any, A: string, L: string) {
      let p = function (a: any, ar: any) {
        a.q.push(ar)
      }
      let d = C.document
      C.Cal =
        C.Cal ||
        function () {
          let cal = C.Cal
          let ar = arguments
          if (!cal.loaded) {
            cal.ns = {}
            cal.q = cal.q || []
            d.head.appendChild(d.createElement("script")).src = A
            cal.loaded = true
          }
          if (ar[0] === L) {
            const api: any = function () {
              p(api, arguments)
            }
            const namespace = ar[1]
            api.q = api.q || []
            typeof namespace === "string"
              ? (cal.ns[namespace] = cal.ns[namespace] || api) &&
                p(api, ar) &&
                p(cal, ["initNamespace", namespace])
              : p(cal, ar)
            return
          }
          p(cal, ar)
        }
    })(window, "https://app.cal.com/embed/embed.js", "init")
  }

  // Initialize namespaces
  w.Cal("init", "video-chat-or-call", { origin: "https://app.cal.com" })
  w.Cal("init", "meetup", { origin: "https://app.cal.com" })

  // Set global configurations
  w.Cal.config = w.Cal.config || {}
  w.Cal.config.forwardQueryParams = true

  const uiConfig = {
    cssVarsPerTheme: {
      light: {
        "cal-brand": "#7a4d21",
      },
      dark: {
        "cal-brand": "#d8a15d",
      },
    },
    hideEventTypeDetails: false,
    layout: "month_view",
  }

  // Configure UI for each namespace
  if (w.Cal.ns["video-chat-or-call"]) {
    w.Cal.ns["video-chat-or-call"]("ui", uiConfig)
  }
  if (w.Cal.ns["meetup"]) {
    w.Cal.ns["meetup"]("ui", uiConfig)
  }
})
