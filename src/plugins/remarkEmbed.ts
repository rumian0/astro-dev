import { visit } from "unist-util-visit";

/**
 * remarkEmbed — leaf directives → responsive iframe embeds.
 *
 *   :::youtube{#id}        → YouTube embed
 *   :::bilibili{#bvid}     → Bilibili embed
 *   :::codepen{#id author} → CodePen embed
 *
 * Uses remark-directive (must be registered before this plugin).
 */
export function remarkEmbed() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (node.type !== "leafDirective") return;
      if (node.name !== "youtube" && node.name !== "bilibili" && node.name !== "codepen") return;

      const attributes = node.attributes || {};
      const id = attributes.id;
      if (!id) return;

      const data = node.data || (node.data = {});
      switch (node.name) {
        case "youtube":
          data.hName = "iframe";
          data.hProperties = {
            class: "video-embed",
            title: "YouTube Video Player",
            src: `https://www.youtube.com/embed/${id}`,
            frameBorder: 0,
            allow:
              "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
            allowFullScreen: true,
            loading: "lazy",
          };
          break;
        case "bilibili":
          data.hName = "iframe";
          data.hProperties = {
            class: "video-embed",
            title: "Bilibili Video Player",
            src: `//player.bilibili.com/player.html?isOutside=true&bvid=${id}`,
            frameBorder: 0,
            allowFullScreen: true,
            loading: "lazy",
          };
          break;
        case "codepen":
          data.hName = "iframe";
          data.hProperties = {
            class: "video-embed",
            title: "CodePen Embed",
            src: `https://codepen.io/${attributes.author}/embed/${id}`,
            frameBorder: 0,
            allowFullScreen: true,
            loading: "lazy",
          };
          break;
      }
    });
  };
}
