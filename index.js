const express = require('express');
const { chromium } = require('playwright');
const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url, limit = 5 } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { timeout: 60000 });

    const productLinks = await page.$$eval('a[href]', (elements) =>
      [...new Set(elements.map(e => e.href).filter(href =>
        href.includes('/p') || href.includes('/produto') || href.includes('/product')
      ))]
    );

    const results = [];
    for (let i = 0; i < Math.min(limit, productLinks.length); i++) {
      const link = productLinks[i];
      const productPage = await browser.newPage();
      await productPage.goto(link, { timeout: 60000 });

      const title = await productPage.textContent('h1, .product-title, .productName_1r').catch(() => "");
      const price = await productPage.textContent('.price, .sellingPrice, .price-characteristic').catch(() => "");
      const image = await productPage.getAttribute('img', 'src').catch(() => "");
      const description = await productPage.textContent('.productDescription, .description').catch(() => "");

      results.push({ link, title, price, image, description });
      await productPage.close();
    }

    await browser.close();
    res.json({ results });
  } catch (err) {
    await browser.close();
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Scraper online na porta ${PORT}`));
