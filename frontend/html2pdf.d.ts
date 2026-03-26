declare module "html2pdf.js" {
  interface Html2CanvasOptions {
    scale?: number;
    useCORS?: boolean;
    logging?: boolean;
    windowWidth?: number;
    windowHeight?: number;
    backgroundColor?: string;
    [key: string]: unknown;
  }

  interface JsPdfOptions {
    unit?: "pt" | "mm" | "cm" | "in" | "px" | "pc" | "em" | "ex";
    format?: "a0" | "a1" | "a2" | "a3" | "a4" | "a5" | "letter" | "legal" | string;
    orientation?: "portrait" | "landscape" | "p" | "l";
  }

  interface Html2PdfOptions {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: { type?: "jpeg" | "png" | "webp"; quality?: number };
    html2canvas?: Html2CanvasOptions;
    jsPDF?: JsPdfOptions;
    pagebreak?: { mode?: string | string[]; before?: string; after?: string; avoid?: string };
  }

  type OutputType = "blob" | "bloburi" | "bloburl" | "datauristring" | "datauri" | "dataurl" | "arraybuffer";

  interface Html2PdfInstance {
    set(options: Html2PdfOptions): Html2PdfInstance;
    from(element: HTMLElement | string): Html2PdfInstance;
    save(): Promise<void>;
    output(type: OutputType): Promise<Blob | string | ArrayBuffer>;
    outputPdf(type?: string): unknown;
    then(fn: (pdf: unknown) => void): Html2PdfInstance;
  }

  function html2pdf(): Html2PdfInstance;
  function html2pdf(element: HTMLElement, options?: Html2PdfOptions): Html2PdfInstance;
  export default html2pdf;
}
