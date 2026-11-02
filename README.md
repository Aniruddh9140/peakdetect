# ViraWatch AI

A live tracker of which diseases are at their peak right now. It runs entirely on GitHub Pages and GitHub Actions, so there is no server to host.

## Put it on GitHub Pages

1. Create a **public** GitHub repository and push this folder to its `main` branch. GitHub Pages on a free account needs a public repository. The run this push starts fails until step 2 is done; you can ignore it.
2. In the repository, open **Settings > Pages** and set **Source** to **GitHub Actions**.
3. Open **Settings > Actions > General** and make sure workflows have **Read and write permissions**.
4. Open the **Actions** tab, choose **Update data and deploy**, and press **Run workflow**.

The site appears at `https://<your-username>.github.io/<repo-name>/`. After that it updates itself every 6 hours.

## The AI briefing

Once a day the workflow starts a free, open AI model ([Qwen3 4B](https://ollama.com/library/qwen3), Apache 2.0) on GitHub's own machine using [Ollama](https://ollama.com). It reads the measured signals and the latest WHO, ECDC, UKHSA and CDC reports, then writes a short briefing. Every claim must cite one of those reports; anything citing a link it was not given is dropped before publishing. This costs nothing and needs no key.

The free model is small and runs without a GPU, so it cannot search the web and writes less well than a large model. For a stronger briefing that also searches the web, add a paid Claude key:

1. Create a key at [platform.claude.com](https://platform.claude.com/) and set a monthly spend limit there.
2. In the repository, open **Settings > Secrets and variables > Actions** and add a secret named `ANTHROPIC_API_KEY`.

With a key set, Claude replaces the free model. To change how often the AI runs, edit `AI_EVERY_MS` in `scripts/update-data.mjs`.

## How it works

`scripts/update-data.mjs` runs every 6 hours in GitHub Actions and writes `public/data/latest.json`, which the site reads.

| Signal | Source | Weight |
|---|---|---|
| Case data | CDC hospital admissions, WHO FluNet (flu, RSV and COVID-19 only) | 50% |
| News coverage | GDELT global news index | 30% |
| Public interest | Wikipedia pageviews | 20% |
| Official reports | WHO Disease Outbreak News | up to +10 points |

Each signal compares a disease with its own history, so 100 means "at its highest of the past year". It does not count how many people are sick. A missing signal's weight is shared between the others.

If a source fails, the run continues and the Data Sources page shows the failure. If too few diseases can be scored, the run stops and the last good data stays online.

GDELT rate-limits heavily, so each run updates as many diseases as it can, stalest first, and keeps readings up to 3 days old for the rest.

## Run it locally

```bash
npm install
npm run update-data
npm run dev
```

Then open http://localhost:3000. `npm test` runs the tests. To add a disease, add an entry to `src/data/diseases.json`.

## Disclaimer

For general information only. This is not medical advice and does not replace a healthcare provider.
