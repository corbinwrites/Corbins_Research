// Cal.com element-click embed — mirrors the official Cal.com generated code,
// adapted to re-run on Quartz SPA nav transitions.

document.addEventListener("nav", () => {
  const w = window as any

  // Official Cal.com IIFE loader (idempotent — safe to call on every nav)
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
          if (typeof namespace === "string") {
            cal.ns[namespace] = cal.ns[namespace] || api
            p(api, ar)
            p(cal, ["initNamespace", namespace])
          } else p(cal, ar)
          return
        }
        p(cal, ar)
      }
  })(window, "https://app.cal.com/embed/embed.js", "init")

  w.Cal.config = w.Cal.config || {}
  w.Cal.config.forwardQueryParams = true

  const uiConfig = {
    cssVarsPerTheme: {
      light: { "cal-brand": "#7a4d21" },
      dark: { "cal-brand": "#d8a15d" },
    },
    hideEventTypeDetails: false,
    layout: "month_view",
  }

  // Video Chat or Call
  w.Cal("init", "video-chat-or-call", { origin: "https://app.cal.com" })
  w.Cal.ns["video-chat-or-call"]("ui", uiConfig)

  // Face-to-Face Meetup
  w.Cal("init", "meetup", { origin: "https://app.cal.com" })
  w.Cal.ns["meetup"]("ui", uiConfig)
})
