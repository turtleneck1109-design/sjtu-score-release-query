# SJTU Score Release Query

A lightweight static web tool for viewing and filtering SJTU score release and grade submission data from the `i.sjtu.edu.cn` JSON endpoint.

## Features

- Generate query URLs by academic year (`xnm`), term (`xqm`), and page size.
- Open the raw JSON endpoint in a new tab for manual copy-and-paste import.
- Parse JSON responses that contain an `items` array.
- Search and filter detailed course records.
- Show summary counts for total courses returned by the endpoint, treating returned `items` as unsubmitted courses.
- Visualize status distribution and top departments or schools.
- Runs as plain HTML, CSS, and JavaScript with no build step.

## Why Manual JSON Import Is Needed

The SJTU endpoint is hosted on [i.sjtu.edu.cn](https://i.sjtu.edu.cn), while this tool may run from a local file or a different domain. Browsers normally block JavaScript from reading cross-origin responses unless the target server explicitly enables CORS.

Because of that, direct fetch may fail even if you are already logged in. The recommended workflow is:

1. Log in to `i.sjtu.edu.cn` in your browser.
2. Open `index.html`.
3. Choose the academic year, term, and page size.
4. Click the **Open JSON** button in the URL row.
5. Copy the JSON returned by the SJTU page.
6. Paste it into the text area and click the parse button.

## Data Interpretation

The `items` array returned by this endpoint is interpreted as the list of courses whose grades have not been submitted yet. The ratio panel therefore treats all loaded records as `unsubmitted`; submitted and processing counts remain zero unless a future endpoint provides full status data.

## Query Parameters

- `xnm`: academic year, for example `2024`.
- `xqm`: term code.
  - `3`: fall term
  - `12`: spring term
  - `16`: summer term
- `queryModel.showCount`: number of records requested from the endpoint.

## Local Usage

Open [index.html](./index.html) directly in a browser.

No dependencies are required.

## Privacy

This tool processes pasted JSON in the browser. It does not upload your data anywhere by itself.

If you deploy or modify it, avoid adding analytics, logging, or backend forwarding for academic records unless users explicitly understand what data is being sent.

## Repository

GitHub: [turtleneck1109-design/sjtu-score-release-query](https://github.com/turtleneck1109-design/sjtu-score-release-query)
