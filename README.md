# SJTU Score Release Query

A lightweight static web tool for viewing and filtering SJTU score release and grade submission data from the `i.sjtu.edu.cn` JSON endpoint.

## Features

- Generate query URLs by academic year (`xnm`), term (`xqm`), and page size.
- Read JSON via a bookmark-assisted handoff from the SJTU page without a proxy.
- Open the raw JSON endpoint in a new tab for manual copy-and-paste import.
- Parse JSON responses that contain an `items` array.
- Search and filter detailed course records.
- Show summary counts for total courses returned by the endpoint, treating returned `items` as unsubmitted courses.
- Visualize status distribution and top departments or schools.
- Runs as plain HTML, CSS, and JavaScript with no build step.

## Read directly from the SJTU page

The SJTU endpoint returns JSON but does not enable CORS for this site. A normal
cross-origin `fetch`, including `credentials: "include"`, cannot read it. GitHub
Pages cannot run a backend proxy; `no-cors` would only return an unreadable response.

The **读取教务数据** button now uses a bookmark-assisted handoff:

1. Open the hosted site and drag **回传教务数据** to your browser's bookmarks bar.
2. Choose the academic year, term and number of records, then click **读取教务数据**.
3. On the newly opened SJTU JSON page, click the saved bookmark.
4. Return to the query page. The data is parsed and displayed automatically.

Save the bookmark once for the site address you use (HTTP and HTTPS are different
origins). If SJTU asks you to log in, complete login there and restart reading from
the query page. Keep the query tab open. Requests expire after five minutes.

The bookmark runs only on the exact SJTU endpoint. It sends the JSON through
`postMessage` to the query page's exact origin, without forwarding cookies or
credentials. The receiver checks the SJTU origin, the opened window and a random
per-request identifier. New reads, clearing data, demo imports and manual imports
invalidate the previous handoff. No third-party proxy, extension or server is used.

### Manual fallback

On mobile, browsers that block bookmark scripts or popups, or when opening
`index.html` as a local file, use **打开 JSON**, copy the JSON into the text area,
and click **解析 JSON**. This also works if login or browser isolation breaks the
window connection.

## Data Interpretation

The `items` array returned by this endpoint is interpreted as the list of courses whose grades have not been submitted yet. The ratio panel therefore treats all loaded records as `unsubmitted`; submitted and processing counts remain zero unless a future endpoint provides full status data.

## Query Parameters

- `xnm`: academic year, for example `2024`.
- `xqm`: term code.
  - `3`: fall term
  - `12`: spring term
  - `16`: summer term
- `queryModel.showCount`: number of records requested from the endpoint.

## Live Site

Use the hosted site here: [sjtu-score-release-query.turtleneck.top](https://sjtu-score-release-query.turtleneck.top).

## Local Usage

Open [index.html](./index.html) directly in a browser if you want to use the local copy.

No dependencies are required.

## Privacy

This tool processes pasted or bookmark-imported JSON in the browser. The bookmark transfers data only between the SJTU tab and the query tab; it does not upload data to a backend.

If you deploy or modify it, avoid adding analytics, logging, or backend forwarding for academic records unless users explicitly understand what data is being sent.

## Repository

GitHub: [turtleneck1109-design/sjtu-score-release-query](https://github.com/turtleneck1109-design/sjtu-score-release-query)

## Validation

Run `node --test tests/reader.test.cjs` for handoff origin/window/request validation,
cancellation, timeout and popup-blocking coverage. Browser verification should also
exercise the saved bookmark on an actual SJTU JSON page and manual import.
