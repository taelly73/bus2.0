import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add robust article fetching endpoint
  app.get("/api/article", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      console.log(`Fetching URL: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch URL: ${response.statusText}` });
      }
      
      let html = await response.text();
      
      // Attempt to fix paths / clean up somewhat
      const doc = new JSDOM(html, { url });
      
      // Use readability to extract article text
      const reader = new Readability(doc.window.document);
      const article = reader.parse();
      
      if (!article) {
        return res.status(404).json({ error: "Could not extract article content" });
      }

      return res.json({
        title: article.title,
        content: article.textContent,
        html: article.content, // HTML version optionally keeping formatting
        excerpt: article.excerpt
      });
    } catch (e: any) {
      console.error("Error fetching article:", e);
      return res.status(500).json({ error: e.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
