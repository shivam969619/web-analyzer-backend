import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();
app.use(express.json());
// app.use(
//   // cors({
//   //   origin: "https://web-analyzer.vercel.app",
//   //   methods: "GET,POST",
//   //   credentials: true,
//   // })
// );
app.use(
  cors({
    origin: "*",
    methods: "GET,POST",
    credentials: true,
  })
);
app.post("/api/audit", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    console.log("Navigating to:", url);
    await page.goto(url);
    console.log("Navigation complete.");

    // Inject axe-core script into the page
    await page.addScriptTag({
      url: "https://cdn.jsdelivr.net/npm/axe-core@4.3.1/axe.min.js",
    });

    // Wait for axe-core to be available in the page context
    await page.waitForFunction(() => typeof window.axe !== "undefined");

    // Evaluate axe.run() in the page context
    const results = await page.evaluate(async () => {
      try {
        return await window.axe.run();
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log(results);
    const analyzedResults = analyzeResults(results);
    await browser.close();
    console.log(analyzedResults);
    res.json(analyzedResults);
  } catch (error) {
    console.error(error);
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
