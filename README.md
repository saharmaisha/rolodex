# Rolodex

Desktop app for browsing, searching, and managing contacts in a 3D rolodex, powered by Notion.

This repo is an Electron + React app with a Node.js backend that reads and writes to a Notion database via the Notion API.

## Features

- 3D rotating rolodex with physics-based momentum scrolling
- Click any tab to pull out and view the full card
- Create, edit, and delete contacts
- Name search and advanced filtering by any Notion property
- Dynamic form fields generated from your Notion database schema

## Stack

- **Frontend:** Vite, React 18, CSS 3D transforms
- **Desktop shell/backend:** Electron, electron-vite
- **Data source:** Notion API (`@notionhq/client`)
- **Packaging:** electron-builder

## Setup

```
npm install
```

Create a `.env` file in the repo root:

```
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_notion_database_id
```

## Run

```
npm run dev
```

## Build

```
npm run dist
```

Outputs a `.dmg` and `.app` in the `release/` directory. The app is unsigned — right-click > Open to bypass Gatekeeper on first launch.

## Project Layout

```
src/
  main/           # Electron main process, Notion API client
  preload/        # Context bridge
  renderer/src/   # React app
    components/   # Rolodex, Card, CardDetail, CardForm, FilterBar
    hooks/        # useNotion (data fetching, CRUD, schema)
    styles/       # CSS
build/            # App icon
```
