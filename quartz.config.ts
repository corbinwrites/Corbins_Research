import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Corbin's Research",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "en-US",
    baseUrl: "clevercharlatan.github.io/Corbins_Research",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "IBM Plex Sans",
        body: "Literata",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#fcfaf5",
          lightgray: "#ddd4c3",
          gray: "#b5ab98",
          darkgray: "#5c5141",
          dark: "#221d16",
          secondary: "#7a4d21",
          tertiary: "#4b6a4f",
          highlight: "rgba(122, 77, 33, 0.10)",
          textHighlight: "#f5d97b88",
        },
        darkMode: {
          light: "#191713",
          lightgray: "#3b342a",
          gray: "#7d7365",
          darkgray: "#ddd4c7",
          dark: "#f7f0e4",
          secondary: "#d8a15d",
          tertiary: "#8fb292",
          highlight: "rgba(216, 161, 93, 0.12)",
          textHighlight: "#d7b63b66",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.ESVCrossReference(),
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
