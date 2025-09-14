# Royal Equips Edge Functions

Enterprise-grade edge functions for the Royal Equips Orchestrator platform. These functions provide serverless capabilities for e-commerce automation, integrating with Shopify, Supabase, BigQuery, and Render.

## Architecture

All edge functions are designed to work with:
- **Shopify**: Product management, orders, customer data
- **Supabase**: Database operations with RLS
- **BigQuery**: Analytics and data warehousing
- **Render**: Deployment and hosting
- **Real-time monitoring**: Live updates to command center

## Functions Overview

### Authentication & Security
- `auth-hook-react-email-resend` - Auth hook + localized email via Resend
- `cloudflare-turnstile` - Turnstile CAPTCHA integration
- `sentry` - Sentry integration hook
- `sentryfied` - Docs/sample for Sentry

### Storage & Media
- `background-upload-storage` - Serverless background file uploads
- `file-upload-storage` - Signed uploads to Storage
- `read-storage` - Read from Storage via signed URLs
- `image-manipulation` - Serverless image operations
- `og-image-with-storage-cdn` - Dynamic OG image generation

### AI & ML
- `openai` - Generic LLM handler
- `openai-image-generation` - Image generation pipeline
- `elevenlabs-speech-to-text` - STT via ElevenLabs
- `elevenlabs-text-to-speech` - TTS via ElevenLabs
- `huggingface-image-captioning` - HF captioning inference

### Database & Analytics
- `connect-supabase` - Minimal Supabase client wiring
- `kysely-postgres` - Kysely + Postgres patterns
- `postgres-on-the-edge` - Postgres edge patterns
- `select-from-table-with-auth-rls` - RLS-safe selects

### Communication & Bots
- `discord-bot` - Discord bot command handler
- `slack-bot-mention` - Slack mention responder
- `telegram-bot` - Telegram bot handler
- `send-email-resend` - Email via Resend
- `send-email-smtp` - SMTP sender

### E-commerce & Business
- `get-tshirt-competition` - Contest backend
- `stripe-webhooks` - Stripe webhook handler
- `location` - Geolocation utilities
- `restful-tasks` - CRUD API example

### Development & Deployment
- `github-action-deploy` - GH Action deploy sample
- `oak-server` - Deno Oak server scaffold
- `browser-with-cors` - Edge CORS proxy
- `puppeteer` - Headless browser tasks
- `opengraph` - Fetch/parse OG metadata

### Performance & Scaling
- `upstash-redis-counter` - Redis counter pattern
- `upstash-redis-ratelimit` - Redis ratelimit pattern
- `streams` - Streaming responses
- `wasm-modules` - WASM in edge functions

### Utilities
- `tweet-to-image` - Convert tweet to image

## Deployment

All functions are deployed as Cloudflare Workers and integrate with the main Royal Equips platform for real-time monitoring and control.

## Configuration

Functions use environment variables for configuration and integrate with the main platform's secrets management.