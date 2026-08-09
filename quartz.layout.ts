import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      "Study Home": "https://clevercharlatan.github.io/Corbins_Research",
      GitHub: "https://github.com/CleverCharlatan/Corbins_Research",
      ESV: "https://www.esv.org/",
    },
  }),
}

const explorerConfig = {
  title: "Navigation",
  folderDefaultState: "collapsed" as const,
  folderClickBehavior: "collapse" as const,
  useSavedState: true,
  mapFn: (node: any) => {
    const titleCase = (value: string) => {
      const minorWords = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "the", "to", "vs", "with"])
      const words = value.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().split(" ")

      return words
        .map((word, index) => {
          const lower = word.toLowerCase()
          const isEdgeWord = index === 0 || index === words.length - 1

          if (!isEdgeWord && minorWords.has(lower)) {
            return lower
          }

          return lower.replace(/^\p{L}/u, (letter) => letter.toUpperCase())
        })
        .join(" ")
    }

    if (node.slugSegment === "series") {
      node.displayName = "Series"
    } else if (node.slugSegment === "topics") {
      node.displayName = "Topics & Method Guides"
    } else if (node.slugSegment === "books-of-the-bible" || node.displayName === "Books of the Bible") {
      node.displayName = "Books of the Bible"
    } else if (node.displayName) {
      node.displayName = titleCase(node.displayName)
    }

    return node
  },
  sortFn: (a: any, b: any) => {
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1
    return a.displayName.localeCompare(b.displayName, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  },
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer(explorerConfig),
  ],
  right: [
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Graph({
      localGraph: {
        drag: true,
        zoom: true,
        depth: 1,
        scale: 1.1,
        repelForce: 0.5,
        centerForce: 0.3,
        linkDistance: 30,
        fontSize: 0.6,
        opacityScale: 1,
        showTags: true,
      },
      globalGraph: {
        drag: true,
        zoom: true,
        depth: -1,
        scale: 0.9,
        repelForce: 0.5,
        centerForce: 0.3,
        linkDistance: 30,
        fontSize: 0.6,
        opacityScale: 1,
        showTags: true,
      },
    }),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer(explorerConfig),
  ],
  right: [Component.Graph()],
}
