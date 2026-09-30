# Showcase generators

The scripts that produced the files in `Showcase/`. Saved here so they are not lost (they used to live in a temporary folder).

| Folder | Makes | How to run |
|---|---|---|
| `book/` | `EventHub_Complete_Project_Guide_*.docx/.pdf` (105 pages), the notes + viva doc and the Tamil script doc | `npm install` then `node gen.js`; then `powershell -File finish.ps1` (Word updates the table of contents, page count and saves the PDF) |
| `book/content/`, `notes/`, `script/` | The text of each chapter (Markdown). Special lines: `@code`, `@lines`, `@tables`, `@endpoints`, `@commits` pull real code, tables and commits from the project | edit, then rerun `gen.js` |
| `book/diagrams/make.py` | Architecture, ER, request-flow, states, test-pyramid pictures | `python make.py` (uses headless Edge) |
| `deck/` | `EventHub_Presentation_*.pptx` (pptxgenjs) and `render/` = slide pictures used by the video | `npm install` then `node build.js` |
| `video/` | Tamil demo video + English subtitles (edge-tts voice, PIL subtitles, ffmpeg) | `pip install edge-tts imageio-ffmpeg pillow`, then `VIDEO_OUT=out.mp4 python build_video.py` (cartoon voice: set `PITCH` / `AFILTER`, see the top of the file) |

Note: some paths inside the scripts still say `02_EventHub_Practice_Project` (the old folder name). Change them to `eventhub` before running again.
The screenshots come from `tools/edge-tour.mjs` and are in `Showcase/screenshots`.
