
import {launchBrowser} from './capture-browser.js';
/**
 Renders an SVG file to a PNG via a headless browser screenshot.
 @param {string} svgPath absolute file path of the source SVG
 @param {string} pngPath destination path for the rendered PNG
 */
export default async function convertSvg2Png(svgPath, pngPath) {
  let page;

  try {
    const browser = await launchBrowser();
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(`file://${svgPath}`);

    await page.locator('svg').first().screenshot({
      omitBackground: true,
      path: pngPath,
      type: 'png',
    });
  } finally {
    if (page) {
      await page.close();
    }
  }
}
