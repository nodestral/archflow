/**
 * Export utilities for ArchFlow diagrams.
 * Converts rendered SVG to downloadable PNG or SVG files.
 */

import type React from "react";

/**
 * Serialize the ArchFlow SVG element to a string.
 */
function serializeSVG(container: HTMLElement, bgOverride?: string): string | null {
  const svg = container.querySelector("svg");
  if (!svg) return null;

  // Clone to avoid modifying the original
  const clone = svg.cloneNode(true) as SVGElement;

  // Inline the background color from the container div (or override)
  const bg = bgOverride ?? getComputedStyle(container).backgroundColor;
  if (bg && bg !== "rgba(0, 0, 0, 0)") {
    // Insert a rect as background
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const vb = clone.getAttribute("viewBox")?.split(" ").map(Number) ?? [0, 0, 800, 400];
    rect.setAttribute("width", String(vb[2]));
    rect.setAttribute("height", String(vb[3]));
    rect.setAttribute("fill", bg);
    clone.insertBefore(rect, clone.firstChild);
  }

  // Ensure xmlns is set
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  return new XMLSerializer().serializeToString(clone);
}

/**
 * Download a blob as a file.
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export the ArchFlow diagram as a PNG file.
 *
 * @param container - The outer div returned by `ref` on ArchFlow's wrapper
 * @param filename - Output filename (default: "archflow-diagram.png")
 * @param scale - Pixel ratio for output quality (default: 2, retina)
 */
export function exportPNG(
  container: HTMLElement,
  filename = "archflow-diagram.png",
  scale = 2,
  bgOverride?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const svgString = serializeSVG(container, bgOverride);
    if (!svgString) {
      reject(new Error("No SVG found in container"));
      return;
    }

    // Get SVG dimensions from viewBox
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) {
      reject(new Error("Failed to parse SVG"));
      return;
    }

    const vb = (svgEl.getAttribute("viewBox")?.split(" ").map(Number) ?? [0, 0, 800, 400]);
    const width = vb[2];
    const height = vb[3];

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Failed to create canvas context"));
      return;
    }

    // Scale for retina
    ctx.scale(scale, scale);

    // Draw SVG to canvas via Image
    const img = new Image();
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          downloadBlob(pngBlob, filename);
          resolve();
        } else {
          reject(new Error("Failed to create PNG blob"));
        }
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG into image"));
    };

    img.src = url;
  });
}

/**
 * Export the ArchFlow diagram as an SVG file.
 *
 * @param container - The outer div returned by `ref` on ArchFlow's wrapper
 * @param filename - Output filename (default: "archflow-diagram.svg")
 */
export function exportSVG(
  container: HTMLElement,
  filename = "archflow-diagram.svg"
): void {
  const svgString = serializeSVG(container);
  if (!svgString) {
    throw new Error("No SVG found in container");
  }

  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, filename);
}

/**
 * React hook that provides export functions bound to a ref.
 *
 * Usage:
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * const { exportPNG, exportSVG } = useArchflowExport(ref);
 *
 * return (
 *   <>
 *     <ArchFlow ref={ref} ... />
 *     <button onClick={() => exportPNG()}>Download PNG</button>
 *     <button onClick={() => exportSVG()}>Download SVG</button>
 *   </>
 * );
 * ```
 */
export function useArchflowExport(ref: React.RefObject<HTMLElement | null>) {
  const doExportPNG = async (filename?: string, scale?: number, bgOverride?: string) => {
    if (!ref.current) throw new Error("Ref not attached");
    return exportPNG(ref.current, filename, scale, bgOverride);
  };

  const doExportSVG = (filename?: string) => {
    if (!ref.current) throw new Error("Ref not attached");
    exportSVG(ref.current, filename);
  };

  return { exportPNG: doExportPNG, exportSVG: doExportSVG };
}
