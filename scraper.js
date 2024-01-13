const puppeteerExtra = require("puppeteer-extra");
const stealthPlugin = require("puppeteer-extra-plugin-stealth");

async function scrapeAliExpress() {
  try {
    const start = Date.now();

    puppeteerExtra.use(stealthPlugin());

    const browser = await puppeteerExtra.launch({
      headless: false,
      executablePath: "", // Add your path here
    });

    const page = await browser.newPage();

    const aliExpressSearchURL = "https://fr.aliexpress.com/w/wholesale-Machines-Café.html?spm=a2g0o.best.search_ranking.7.4e2b142dNKaRF1";

    try {
      await page.goto(aliExpressSearchURL, { waitUntil: "domcontentloaded" });

      let pageCount = 1;

      while (true) {
        console.log(`Scraping page ${pageCount}`);

        // Scroll down to load all products on the page
        await autoScroll(page);

        // Scrape products from the current page
        await scrapePage(page);

        // Navigate to the next page
        const hasNextPage = await goToNextPage(page);

        if (!hasNextPage) {
          console.log("No next button found. Reached the last page.");
          break;
        }

        pageCount++;

        // Add a delay to prevent making too many requests in a short period
        await page.waitForTimeout(3000);
      }
    } catch (error) {
      console.log("Error navigating to AliExpress search page:", error.message);
    }

    const end = Date.now();
    console.log(`Time in seconds: ${Math.floor((end - start) / 1000)}`);

    await browser.close();
    console.log("Browser closed");
  } catch (error) {
    console.log("Error at scrapeAliExpress:", error.message);
  }
}

async function scrapePage(page) {
  // Assuming the product names are within a certain class, adjust the selector accordingly
  const productNamesSelector = '.multi--titleText--nXeOvyr';

  await page.waitForSelector(productNamesSelector);

  const productNames = await page.evaluate((selector) => {
    const productNodes = document.querySelectorAll(selector);
    return Array.from(productNodes, (node) => node.textContent.trim());
  }, productNamesSelector);

  console.log("Number of products:", productNames.length);
  console.log("Product Names:", productNames);
}

async function goToNextPage(page) {
  const nextButtonSelector = '.comet-pagination-next .comet-pagination-item-link';
  const nextPageButton = await page.$(nextButtonSelector);

  if (nextPageButton) {
    await Promise.all([
      nextPageButton.click(),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }), // Increased timeout to 60 seconds
      page.waitForTimeout(5000) // Add a delay after clicking next button
    ]);
    return true;
  } else {
    console.log("No next button found. Reached the last page.");
    return false;
  }
}




async function getCurrentPageNumber(page) {
  // Extract the current page number
  const currentPageElement = await page.$('.comet-pagination-item-active');
  
  if (currentPageElement) {
    const currentPageText = await page.evaluate(el => el.textContent.trim(), currentPageElement);
    return parseInt(currentPageText, 10);
  } else {
    return 1; // Assume the first page if not found
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 1000;
      var scrollDelay = 3000;

      var timer = setInterval(async () => {
        var scrollHeightBefore = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeightBefore) {
          totalHeight = 0;
          await new Promise((resolve) => setTimeout(resolve, scrollDelay));

          // Calculate scrollHeight after waiting
          var scrollHeightAfter = document.body.scrollHeight;

          if (scrollHeightAfter > scrollHeightBefore) {
            // More content loaded, keep scrolling
            return;
          } else {
            // No more content loaded, stop scrolling
            clearInterval(timer);
            resolve();
          }
        }
      }, 200);
    });
  });
}

scrapeAliExpress();
