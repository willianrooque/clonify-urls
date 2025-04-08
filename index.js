const express = require('express');
const { chromium } = require('playwright');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());

app.post('/scrape', async (req, res) => {
  const { url, limit } = req.body;

  if (!url || !limit) {
    return res.status(400).json({ error: 'Parâmetros ausentes: url e limit são obrigatórios.' });
  }

  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Aguarda links de produto aparecerem
    await page.waitForSelector('a[href*="/p"]', { timeout: 10000 });

    // Extrai todos os links que parecem ser de produtos
    const productLinks = await page.$$eval('a[href*="/p"]', (elements) => {
      const hrefs = elements.map((el) => el.href);
      return [...new Set(hrefs)].slice(0, 10); // Remove duplicados, pega no máximo 10
    });

    if (productLinks.length === 0) {
      return res.status(404).json({ error: 'Nenhum link de produto encontrado.' });
    }

    // Limita quantidade baseada no input do usuário
    const limitedLinks = productLinks.slice(0, parseInt(limit));

    // Acessa o primeiro link e extrai o HTML completo
    const productPage = await browser.newPage();
    await productPage.goto(limitedLinks[0], { waitUntil: 'domcontentloaded', timeout: 60000 });
    const htmlContent = await productPage.content();

    await browser.close();

    return res.json({
      html: htmlContent,
      links: limitedLinks
    });
  } catch (err) {
    if (browser) await browser.close();
    return res.status(500).json({ error: 'Erro no scraping', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Scraper online na porta ${PORT}`);
});
