# Deploy and Host SRTmap on Railway

SRTmap is an open-source GPS track viewer and fixer for DJI drone SRT subtitle files. It provides an interactive map with flight visualization, zero-coordinate repair, GPX export, multi-file comparison, measurement tools, and optional cloud sync — all powered by SQLite with no external database required.

## About Hosting SRTmap

Deploying SRTmap on Railway takes under a minute with this template. The app runs as a single Node.js service with an embedded SQLite database — no separate database service needed. A persistent volume stores both the database file and uploaded SRT files. The template pre-configures all environment variables and volume mounts. Once deployed, users can upload DJI SRT files directly in the browser, view GPS tracks on a map, fix broken coordinates, and export clean GPX files. Optional cloud sync lets users back up files and access them across devices using a simple token-based link.

## Common Use Cases

- Visualize and analyze DJI drone flight paths on an interactive map with satellite and street layers
- Repair zero-GPS coordinate frames in SRT files and download corrected versions
- Export drone flight tracks to GPX format for use in Google Earth, Strava, or other mapping tools
- Compare multiple flight tracks side-by-side with distance calculation and measurement tools
- Self-host a private instance for teams managing drone survey or inspection data

## Dependencies for SRTmap Hosting

- **Node.js 20+** — runtime environment
- **Persistent Volume** — stores SQLite database and uploaded SRT files at `/app/data`

### Deployment Dependencies

- [SRTmap GitHub Repository](https://github.com/srtmap/SRTmap)
- [SRTmap Documentation](https://srtmap.online)

### Implementation Details

The template provisions a single service with one volume mounted at `/app/data`. Environment variables control paths:

```
PORT=3000              # Set automatically by Railway
NODE_ENV=production
DATA_PATH=/app/data           # SQLite database location
STORAGE_PATH=/app/data/uploads # Uploaded SRT file storage
```

Both the database and file uploads live under the same volume, ensuring data persists across deployments and restarts.

## Why Deploy SRTmap on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying SRTmap on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
