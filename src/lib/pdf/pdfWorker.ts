"use client";
import { pdfjs } from "react-pdf";

// Only runs in the browser — pdfjs-dist uses Promise.withResolvers which is
// unavailable in older Node versions used during SSR.
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}
