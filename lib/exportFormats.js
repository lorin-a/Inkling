/**
 * Format helpers for the Brand page Export menu. Each function takes a
 * palette (array of hex strings) and the project meta, returns a string
 * ready for clipboard or download, plus a content-type and filename.
 */

export const FORMATS = [
  { id: "css", label: "CSS variables", ext: "css", mime: "text/css" },
  { id: "figma", label: "Figma Variables (JSON)", ext: "json", mime: "application/json" },
  { id: "tailwind", label: "Tailwind config", ext: "js", mime: "application/javascript" },
  { id: "hex", label: "Hex list", ext: "txt", mime: "text/plain" },
  { id: "preset", label: "Brand preset (JSON)", ext: "json", mime: "application/json" },
  { id: "pdf", label: "Brand book (PDF)", ext: "pdf", mime: "application/pdf", action: "print" },
];

export function formatExport(format, { palette, project, roles, gradients }) {
  const slug = project?.slug || "brand";
  const ts = new Date().toISOString().slice(0, 10);
  switch (format) {
    case "css":
      return {
        content: toCssVars(palette, roles, project, gradients),
        filename: `${slug}-tokens-${ts}.css`,
        mime: "text/css",
      };
    case "figma":
      return {
        content: toFigmaVariables(palette, roles, project, gradients),
        filename: `${slug}-figma-variables-${ts}.json`,
        mime: "application/json",
      };
    case "tailwind":
      return {
        content: toTailwind(palette, roles, project),
        filename: `${slug}-tailwind.config.js`,
        mime: "application/javascript",
      };
    case "hex":
      return {
        content: palette.join("\n"),
        filename: `${slug}-palette-${ts}.txt`,
        mime: "text/plain",
      };
    case "preset":
      return {
        content: toPreset(palette, roles, project, gradients),
        filename: `${slug}-brand-preset-${ts}.json`,
        mime: "application/json",
      };
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

function toCssVars(palette, roles, project, gradients) {
  const lines = [`/* ${project?.name || "Brand"} — generated ${new Date().toISOString()} */`, ":root {"];
  palette.forEach((hex, i) => lines.push(`  --color-${i + 1}: ${hex};`));
  if (roles) {
    lines.push("");
    lines.push("  /* Role mapping (luminance-derived) */");
    for (const [k, v] of Object.entries(roles)) {
      if (typeof v === "string" && v.startsWith("#")) {
        lines.push(`  --${k}: ${v};`);
      }
    }
  }
  if (gradients?.length) {
    lines.push("");
    lines.push("  /* Gradients */");
    gradients.forEach((g, i) => lines.push(`  --gradient-${i + 1}: ${g};`));
  }
  lines.push("}");
  return lines.join("\n");
}

/**
 * Figma Variables JSON format that’s importable via the Figma Variables
 * panel’s "Import" option (or via the official Variables REST API).
 * Reference: https://help.figma.com/hc/en-us/articles/15145852043927
 */
function toFigmaVariables(palette, roles, project) {
  const collectionName = project?.name || "Brand";
  const variables = {};
  palette.forEach((hex, i) => {
    variables[`color/${i + 1}`] = {
      type: "COLOR",
      value: hex,
      resolvedType: "COLOR",
    };
  });
  if (roles) {
    for (const [k, v] of Object.entries(roles)) {
      if (typeof v === "string" && v.startsWith("#")) {
        variables[`role/${k}`] = { type: "COLOR", value: v, resolvedType: "COLOR" };
      }
    }
  }
  return JSON.stringify(
    {
      version: "1.0.0",
      collection: collectionName,
      modes: ["default"],
      variables,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

function toTailwind(palette, roles, project) {
  const slug = (project?.slug || "brand").replace(/[^a-z0-9]/gi, "_");
  const colors = {};
  palette.forEach((hex, i) => (colors[`${slug}-${i + 1}`] = hex));
  if (roles) {
    for (const [k, v] of Object.entries(roles)) {
      if (typeof v === "string" && v.startsWith("#")) {
        colors[`${slug}-${k}`] = v;
      }
    }
  }
  return `/** ${project?.name || "Brand"} — generated ${new Date().toISOString()} */
module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(colors, null, 6).replace(/\n/g, "\n      ")}
    }
  }
};
`;
}

function toPreset(palette, roles, project, gradients) {
  return JSON.stringify(
    {
      project,
      palette,
      roles: roles || null,
      gradients: gradients || [],
      exportedAt: new Date().toISOString(),
      source: "moodbuilder",
    },
    null,
    2,
  );
}
