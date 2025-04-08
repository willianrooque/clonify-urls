const express = require('express');
const { chromium } = require('playwright');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url, limit = 5 } = req.body;
  if (!url) return res.status(400).json({ error: 'URL não fornecida' });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // ⬇️ Exemplo genérico para VTEX — você pode adaptar depois
    const productLinks = await page.$$eval('a[href*="/p"]', links =>
      [...new Set(links.map(link => link.href))].slice(0, 5)
    );

    const results = [];

    for (const link of productLinks.slice(0, limit)) {
      const prodPage = await browser.newPage();
      await prodPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });

      const title = await prodPage.$eval('[class*=productName]', el => el.textContent.trim()).catch(() => '');
      const price = await prodPage.$eval('[class*=sellingPrice]', el => el.textContent.trim()).catch(() => '');
      const image = await prodPage.$eval('img[src*="products"]', img => img.src).catch(() => '');
      const description = await prodPage.$eval('div[class*=description]', el => el.textContent.trim()).catch(() => '');

      results.push({ link, title, price, image, description });
      await prodPage.close();
    }

    await browser.close();
    res.json({ results });
  } catch (err) {
    await browser.close();
    console.error('Erro na raspagem:', err);
    res.status(500).json({ error: 'Erro ao raspar os produtos.' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Scraper online na porta ${PORT}`);
});
