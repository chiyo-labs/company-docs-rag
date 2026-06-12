import fs from "fs";
import pdfParse from "pdf-parse";

export type PdfPage = { pageNumber: number; text: string };

/**
 * PDFをページ単位でテキスト抽出する。
 * pagerender コールバックでページごとのテキストをキャプチャし、
 * 空白ページは除外して返す。
 */
export async function parsePdf(filePath: string): Promise<PdfPage[]> {
  const buffer = fs.readFileSync(filePath);
  const pages: PdfPage[] = [];
  let pageIndex = 0;

  await pdfParse(buffer, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pagerender: async (pageData: any): Promise<string> => {
      pageIndex++;
      const current = pageIndex;

      const textContent = await pageData.getTextContent();
      let text = "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of textContent.items as any[]) {
        text += item.str ?? "";
        if (item.hasEOL) text += "\n";
      }

      const trimmed = text.trim();
      if (trimmed) {
        pages.push({ pageNumber: current, text: trimmed });
      }
      return text;
    },
  });

  return pages;
}
