# Boss Agent Web Dashboard

Modern web interface for the Boss Agent - an AI-powered development coordinator.

## Features

- 🎨 **Modern UI**: Built with Next.js 15 and shadcn/ui
- 📊 **Real-time Dashboard**: Monitor sessions, tasks, and analytics
- 🔄 **Live Updates**: Real-time integration with Boss Agent API
- 🎯 **Task Management**: View and manage delegated tasks
- 📈 **Analytics**: Track performance metrics and success rates

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Boss Agent backend running (default: http://localhost:3005)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Environment Variables

Create a `.env.local` file:

```bash
# Boss Agent API URL
BOSS_AGENT_API_URL=http://localhost:3005

# Next.js specific
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Project Structure

```text
web/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── sessions/     # Sessions API
│   │   └── stats/        # Stats API
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Dashboard page
│   └── globals.css       # Global styles
├── components/
│   └── ui/               # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       └── badge.tsx
├── lib/
│   └── utils.ts          # Utility functions
└── public/               # Static assets
```

## API Integration

The dashboard connects to the Boss Agent backend API:

- `GET /sessions` - Fetch all sessions
- `GET /sessions/active` - Fetch active sessions
- `GET /stats` - Fetch server statistics
- `GET /config` - Fetch configuration

## Customization

### Adding shadcn/ui Components

```bash
# Add new components
npx shadcn@latest add [component-name]
```

### Styling

Modify `tailwind.config.ts` and `app/globals.css` to customize the theme.

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```bash
# Build image
docker build -t boss-agent-web .

# Run container
docker run -p 3000:3000 boss-agent-web
```

## Contributing

1. Create a new branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License - see LICENSE file for details
