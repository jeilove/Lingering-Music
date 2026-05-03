# 🚨 CRITICAL PROJECT MEMORY

## 1. Port 3002 (IndexedDB Persistence)
- **Web App**: MUST ALWAYS RUN ON **3002**.
- All local data (Recently Played, Tags, Favorites) is tied to `http://localhost:3002`.
- Changing this port will make all data "disappear".

## 2. Port 3001 (API Backend)
- Backend runs on `3001`.
