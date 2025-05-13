# Fractal-it

Transform any website into a unique fractal artwork! This browser extension takes the current webpage's HTML structure and converts it into a mesmerizing fractal pattern.

## 🎨 Features

- Convert any webpage into a unique fractal visualization
- Interactive controls for fractal manipulation
- Download generated fractal images
- Customizable fractal generation rules
- Developer-friendly architecture for easy modifications

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A modern web browser (Chrome, Firefox, or Edge)

### Installation

1. Clone the repository:

```bash
git clone https://https://github.com/Abeelha/fractal-it.git
cd fractal-it
```

2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
npm run build
```

4. Load the extension in your browser:
   - Chrome: Go to `chrome://extensions/`, enable "Developer mode", click "Load unpacked", and select the `dist` folder
   - Firefox: Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", and select any file in the `dist` folder

## 🛠️ Development

### Project Structure

```
fractal-it/
├── src/                    # Source code
│   ├── background/        # Background scripts
│   ├── content/          # Content scripts
│   ├── popup/            # Extension popup
│   └── fractal/          # Fractal generation logic
├── public/               # Static assets
├── dist/                # Built extension
└── tests/               # Test files
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build the extension
- `npm run test` - Run tests
- `npm run lint` - Run linter

## 🎯 How It Works

1. The extension captures the current webpage's HTML structure
2. The HTML is processed to generate unique fractal parameters
3. A fractal is generated based on these parameters
4. Users can interact with the fractal and download the result

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Add new fractal generation algorithms
- Improve the UI/UX
- Add new features
- Fix bugs
- Improve documentation

## 🙏 Acknowledgments

- Inspired by the beauty of fractals and web development
- Built with love for the developer community bzzzz 🐝
