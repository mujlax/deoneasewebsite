import type { Plugin } from "unified";
import type { Root } from "mdast";

/**
 * Remark plugin to remove frontmatter from the AST
 * This prevents frontmatter from being rendered in the content
 */
export const remarkRemoveFrontmatter: Plugin<void[], Root> = () => {
  return (tree) => {
    if (tree.children) {
      tree.children = tree.children.filter((node) => {
        // Remove frontmatter nodes (yaml nodes)
        return node.type !== "yaml";
      });
    }
  };
};
