// index.js
const express = require("express");
const { chromium } = require("playwright");
const app = express();
const port = process.env.PORT || 10000;

app.use(express.json());

app.post("/scrape", async (req, res) => {
  const { url, limit = 1 } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(url, { timeout: 60000 });

    // Pega os links dos produtos (genérico para VTEX, Shopify, etc)
    const productLinks = await page.$$eval("a[href]", (links) => {
      return links
        .map((a) => a.href)
        .filter((href) => /produto|product|item|/i.test(href))
        .filter((value, index, self) => self.indexOf(value) === index) // remove duplicados
        .slice(0, 10);
    });

    if (productLinks.length === 0) throw new Error("Nenhum link de produto encontrado");

    const htmlSamples = [];
    for (let i = 0; i < Math.min(limit, productLinks.length); i++) {
      const productPage = await browser.newPage();
      await productPage.goto(productLinks[i], { timeout: 60000 });
      const html = await productPage.content();
      htmlSamples.push({ url: productLinks[i], html });
      await productPage.close();
    }

    await browser.close();
    return res.json({ samples: htmlSamples });
  } catch (err) {
    await browser.close();
    return res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Scraper online 🚀");
});

app.listen(port, () => {
  console.log("Scraper online na porta " + port);
});
