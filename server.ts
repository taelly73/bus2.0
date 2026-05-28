import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import OpenAI from "openai";
import fs from "fs";

// Load data into memory for AI Retrieval
const fullDataPath = path.join(process.cwd(), 'src/full_data.json');
let transitData: any[] = [];
try {
  const dataRaw = fs.readFileSync(fullDataPath, 'utf-8');
  transitData = JSON.parse(dataRaw);
} catch (e) {
  console.error("Failed to load transit data for AI:", e);
}

// Format the data as context for the AI
const getTransitContextString = () => {
  return transitData.map(d => `ID:${d.id} Title:${d.title} Date:${d.date} Category:${d.category}`).join("\n");
};

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // Initialize DeepSeek API Client via OpenAI SDK
  const getAiClient = () => {
    const apiKey = process.env.DEEPSEEK_API_KEY || "sk-e0549cc1f8274d9394d779b92c64268c";
    return new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: apiKey
    });
  };

  // AI Endpoint for Smart Search / Q&A
  app.post("/api/ai/ask", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) return res.status(400).json({ error: "Query is required" });
      
      const openai = getAiClient();
      
      const prompt = `You are a helpful Transit Information AI Assistant (智能公交助理) for Beijing Public Transport.
The user is asking: "${query}"

Here is the index of all current transit announcements:
${getTransitContextString()}

Answer the user's question directly based on the context above. If you identify relevant announcements, please list them by their ID exactly as "ID:[id number]" or mention their titles so the user can look them up. Answer in Chinese. Keep the response concise, helpful, and friendly. Do not hallucinate transit lines not in the context.`;

      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "deepseek-v4-flash",
      });
      
      return res.json({ text: completion.choices[0].message.content });
    } catch (e: any) {
      console.error("Error in AI Q&A:", e);
      return res.status(500).json({ error: e.message || "Internal server error" });
    }
  });

  // AI Endpoint for Summarization
  app.post("/api/ai/summarize", async (req, res) => {
    try {
      const { content, title } = req.body;
      if (!content) return res.status(400).json({ error: "Content is required" });
      
      const openai = getAiClient();
      
      const prompt = `Please summarize the following Beijing Public Transport announcement. Extract the core information: affected lines, stop changes, and effective dates. Keep it very concise (bullet points). Title: ${title} Content: ${content}. Answer in Chinese.`;

      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "deepseek-v4-flash",
      });
      
      return res.json({ text: completion.choices[0].message.content });
    } catch (e: any) {
      console.error("Error in AI Summarization:", e);
      return res.status(500).json({ error: e.message || "Internal server error" });
    }
  });

  // Add robust article fetching endpoint
  app.get("/api/article", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      console.log(`Fetching URL: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
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

  // Real-time bus tracking endpoint
  app.get("/api/bus/realtime", async (req, res) => {
    try {
      const line = req.query.line as string;
      if (!line) {
        return res.status(400).json({ error: "Bus line name is required" });
      }
      
      const apiKey = process.env.TRANSIT_API_KEY;
      if (!apiKey) {
        throw new Error("TRANSIT_API_KEY environment variable is required to fetch real-time data.");
      }
      
      // Mocking the real integration request to a hypothetical transit data API
      const targetUrl = `https://api.transit.data.gov/v1/realtime?line=${encodeURIComponent(line)}&apiKey=${apiKey}`;
      const response = await fetch(targetUrl);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch transit data from ${targetUrl}` });
      }
      
      const data = await response.json();
      return res.json(data);
    } catch (e: any) {
      console.error("Error fetching real-time bus data:", e);
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
