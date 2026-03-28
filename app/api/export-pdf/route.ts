import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";

const isDev = process.env.NODE_ENV === "development";

const CHROME_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
];

async function getBrowser() {
  if (isDev) {
    return puppeteer.launch({
      executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      headless: true,
      args: CHROME_ARGS,
    });
  }

  return puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/chromium-browser",
    headless: true,
    args: CHROME_ARGS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { html } = await req.json();

    if (!html || typeof html !== "string") {
      return NextResponse.json({ error: "Missing html field" }, { status: 400 });
    }

    const baseUrl = new URL(req.url).origin;

    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.emulateMediaType("screen");

    // 1. Load /print — picks up all real CSS (neu-document, themes, katex…)
    await page.goto(`${baseUrl}/print`, { waitUntil: "networkidle0" });

    // 2. Inject HTML into the empty <article> — no URL size limits
    await page.evaluate((content) => {
      const article = document.querySelector("article.neu-document");
      if (article) article.innerHTML = content;
    }, html);

    // 3. Let the browser re-layout with the injected content
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));

    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
      printBackground: true,
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=document.pdf",
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
