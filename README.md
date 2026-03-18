<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5e500831-eb07-45fc-9936-d070a57e0505

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Notes

- This repo currently calls Gemini directly from the browser for local development. Do not ship a production API key in a client bundle.
- Use [.env.example](.env.example) as a placeholder only. Keep real keys in `.env.local`.
- In production, move transcription and refinement behind a server-side endpoint or proxy.
- Video export is experimental because browser FFmpeg subtitle filters are not reliable for all files.
