# Render Deployment Guide

This app is ready for Render as a Node web service with a persistent disk for SQLite.

## Recommended Render settings

- Service type: Web Service
- Runtime: Node
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Persistent disk:
  - Mount path: `/var/data`
  - Size: `1 GB`
- Environment variables:
  - `NODE_ENV=production`
  - `DB_PATH=/var/data/data.db`
  - `ADMIN_USER=<your admin username>`
  - `ADMIN_PASSWORD=<your strong admin password>`

The included `render.yaml` blueprint sets these up. Render will ask you to fill `ADMIN_USER` and `ADMIN_PASSWORD` because they are marked as secret values.

## GoHighLevel iframe code

After Render gives you a live URL, use this in the GoHighLevel Custom HTML/Javascript element:

```html
<iframe
  src="https://YOUR-RENDER-URL.onrender.com"
  width="100%"
  height="900"
  frameborder="0"
  scrolling="yes"
  style="border:none; min-height:900px; width:100%;"
></iframe>
```

Replace `https://YOUR-RENDER-URL.onrender.com` with your actual Render URL.

## Admin

Open:

```text
https://YOUR-RENDER-URL.onrender.com/#/admin
```

Use the `ADMIN_USER` and `ADMIN_PASSWORD` you set in Render. The admin page controls pricing and shows saved estimate leads.

If `ADMIN_PASSWORD` is not set, the admin API intentionally refuses access.
