# Boss Agent Control Panel - Web UI

Modern web interface for Boss Agent that coordinates AI-powered development through Codegen agents.

## Features

- ✨ **Light/Dark Theme** - Seamless theme switching with system preference support
- 🎨 **Terminal Component** - Themed terminal with color scheme adapting to light/dark modes
- 📊 **Real-time Dashboard** - Live stats and task monitoring
- 🤖 **Agent Management** - Track active tasks and agent status
- 🔄 **Auto-refresh** - Polls backend API every 5 seconds for updates

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: shadcn/ui with Radix UI
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Production Build

```bash
npm run build
npm start
```

## Color Scheme

The terminal component uses CSS custom properties that automatically adapt to light/dark themes:

### Light Theme
- Background: `hsl(0 0% 98%)`
- Foreground: `hsl(240 10% 3.9%)`
- Red: `hsl(0 70% 50%)`
- Green: `hsl(142 70% 45%)`
- Yellow: `hsl(38 92% 50%)`
- Blue: `hsl(220 90% 56%)`
- Magenta: `hsl(300 70% 56%)`
- Cyan: `hsl(187 70% 50%)`

### Dark Theme
- Background: `hsl(240 10% 3.9%)`
- Foreground: `hsl(0 0% 90%)`
- Red: `hsl(0 70% 60%)`
- Green: `hsl(142 70% 55%)`
- Yellow: `hsl(38 92% 60%)`
- Blue: `hsl(220 90% 66%)`
- Magenta: `hsl(300 70% 66%)`
- Cyan: `hsl(187 70% 60%)`

## Backend Integration

The dashboard connects to the Boss Agent backend API running on `http://localhost:3005`:

- `GET /stats` - System statistics
- `GET /sessions/active` - Active tasks/sessions
- `GET /health` - Health check

## Components

### Terminal (`components/terminal.tsx`)
Real-time log viewer with color-coded messages:
- `info` - Green
- `success` - Green  
- `warning` - Yellow
- `error` - Red
- `debug` - Cyan

### Theme Toggle (`components/theme-toggle.tsx`)
Sun/Moon icon button for switching themes with smooth transitions.

### Dashboard (`app/page.tsx`)
Main control panel with:
- Stats cards (Active/Completed/Failed/Response Time)
- Active tasks list
- System logs terminal

## Project Structure

```text
web/
├── app/
│   ├── layout.tsx          # Root layout with theme provider
│   ├── page.tsx            # Main dashboard page
│   └── globals.css         # Global styles with theme variables
├── components/
│   ├── ui/
│   │   ├── button.tsx      # Button component
│   │   └── card.tsx        # Card component
│   ├── terminal.tsx        # Terminal log viewer
│   ├── theme-provider.tsx  # Theme context provider
│   └── theme-toggle.tsx    # Theme switcher
├── lib/
│   └── utils.ts            # Utility functions (cn)
└── hooks/
    └── ...                 # Custom hooks
```

## Environment Variables

No environment variables required for frontend. Backend API URL is hardcoded to `http://localhost:3005`.

## Development Notes

- Uses Next.js App Router (no Pages directory)
- Server Components by default, Client Components marked with "use client"
- Auto-polling every 5 seconds for real-time updates
- Responsive design with Tailwind CSS
- Accessibility features from Radix UI

## License

MIT
