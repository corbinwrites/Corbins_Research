import { QuartzTransformerPlugin } from "../types"

export const ESVCrossReference: QuartzTransformerPlugin = () => {
  return {
    name: "ESVCrossReference",
    textTransform(_ctx, src) {
      let text = src.toString()
      // 1. Remove invisible range links: [[Bible/ESV/...#17|]] or with escaped pipe
      text = text.replaceAll(/\[\[[^\]\n]+(?:\\?\|)\s*\]\]/g, "")
      // 2. Unwrap [[Bible/ESV/...|Label]] or [[Bible/ESV/...\|Label]] to plain Label
      text = text.replaceAll(/\[\[Bible\/ESV\/[^\]\n]+?(?:\\?\|)([^\]\n]+?)\]\]/g, "$1")
      return text
    },
    externalResources() {
      return {
        js: [
          {
            loadTime: "beforeDOMReady",
            contentType: "inline",
            spaPreserve: true,
            script: `
              window.ESV_CROSSREF_OPTIONS = {
                border_color: 'CDBFAF',
                border_radius: 14,
                header_font_color: '2A221B',
                body_font_color: '2A221B',
                footer_font_color: '7B6B58',
                header_background_color: 'F6F1E8',
                body_background_color: 'FCFAF5',
                footer_background_color: 'F6F1E8',
                header_font_size: 20,
                body_font_size: 18,
                footer_font_size: 14,
                header_font_family: 'IBM Plex Sans',
                body_font_family: 'Literata',
                footer_font_family: 'IBM Plex Sans'
              };
            `,
          },
          {
            loadTime: "afterDOMReady",
            contentType: "external",
            spaPreserve: true,
            src: "https://static.esvmedia.org/crossref/crossref.min.js",
          },
        ],
      }
    },
  }
}

