
import {launchBrowser} from './capture-browser.js';
/**
 * @param {string} svgPath svg path
 * @param {string} pngPath png path
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
