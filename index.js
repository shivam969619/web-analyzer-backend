import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "*",
    methods: "GET,POST",
    credentials: true,
  })
);

app.post("/api/audit", async (req, res) => {
  console.log("Received request:", req.body);
  const { url } = req.body;
  if (!url) {
    console.log("URL is missing");
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: puppeteer.executablePath() // Use Puppeteer's bundled Chromium
    });
    const page = await browser.newPage();
    console.log("Navigating to:", url);
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log("Navigation complete.");

    await page.addScriptTag({
      url: "https://cdn.jsdelivr.net/npm/axe-core@4.3.1/axe.min.js",
    });

    await page.waitForFunction(() => typeof window.axe !== "undefined");

    const results = await page.evaluate(async () => {
      try {
        return await window.axe.run();
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log("Audit results:", results);
    const analyzedResults = analyzeResults(results);
    await browser.close();
    console.log("Analysis complete:", analyzedResults);
    res.json(analyzedResults);
  } catch (error) {
    console.error("Error during audit:", error);
    res.status(500).send("Error performing accessibility audit");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

function analyzeResults(results) {
  const visualIssues = results.violations.filter(
    (issue) =>
      issue.tags.includes("cat.color") ||
      issue.tags.includes("cat.text-alternatives")
  );
  const auditoryIssues = results.violations.filter((issue) =>
    issue.tags.includes("cat.audio-video")
  );
  const motorIssues = results.violations.filter(
    (issue) =>
      issue.tags.includes("cat.keyboard") || issue.tags.includes("cat.focus")
  );
  const cognitiveIssues = results.violations.filter(
    (issue) =>
      issue.tags.includes("cat.language") || issue.tags.includes("cat.time")
  );

  return {
    visual: visualIssues,
    auditory: auditoryIssues,
    motor: motorIssues,
    cognitive: cognitiveIssues,
  };
}
