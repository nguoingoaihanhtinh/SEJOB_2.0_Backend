import axios from "axios";
import pdf from "pdf-parse";

/**
 * Robust helper to download and parse PDF/Text with fallback to OCR
 */
export async function downloadAndParseCv(url: string): Promise<string> {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const dataBuffer = Buffer.from(response.data);
    const pdfData = await pdf(dataBuffer);
    let text = pdfData.text || "";

    // Fallback Strategy: If PDF is an image (no text), use OCR.space Free API
    if (text.trim().length < 50 && url.startsWith("http")) {
      const apiKey = process.env.OCR_API_KEY || "helloworld";
      try {
        const ocrUrl = `https://api.ocr.space/parse/imageurl?apikey=${apiKey}&url=${encodeURIComponent(url)}&language=eng&isOverlayRequired=false`;
        const ocrRes = await axios.get(ocrUrl);

        if (ocrRes.data && ocrRes.data.ParsedResults && ocrRes.data.ParsedResults.length > 0) {
          text = ocrRes.data.ParsedResults.map((r: any) => r.ParsedText).join("\n") || "";
        }
      } catch (ocrErr: any) {
        console.warn("OCR.space fallback failed:", ocrErr.message);
      }
    }
    return text;
  } catch (err: any) {
    console.warn(`Failed to parse PDF from ${url}:`, err.message);
    return "";
  }
}
