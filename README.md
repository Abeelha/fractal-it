# Fractal-it

Transform any website into a unique fractal artwork! This browser extension takes the current webpage's HTML structure and converts it into a mesmerizing fractal pattern.

## 🎨 Features

- Convert any webpage into a unique fractal visualization
- Interactive controls for fractal manipulation
- Download generated fractal images
- Customizable fractal generation rules
- Developer-friendly architecture for easy modifications

## 🌈 Examples

Each website generates a unique fractal based on its HTML structure. Here are some examples of the visualizations you can create:


### Extension Menu

![The extension popup menu](https://github.com/user-attachments/assets/832171d3-6005-4256-834d-d22345b9f216)

### Web Structure
![image](https://github.com/user-attachments/assets/3a822bf0-f5c7-473e-9294-c890fa63a48b)

### Infinity Structure
![image](https://github.com/user-attachments/assets/38daa668-bcc1-40d1-aa7f-e67084829bfa)

### Spiral Structure
![image](https://github.com/user-attachments/assets/e60148c5-2903-46dd-9af5-b43677006bd0)

### Cube Structure

![Cube-like fractal structure](https://github.com/user-attachments/assets/0392fe6d-1609-458f-9aae-4426373c73f1)

### Circle Pattern

![Circular fractal pattern](https://github.com/user-attachments/assets/ed5254aa-9055-4aef-a4ed-26bbe2473717)

### Arrow Formation

![Arrow-shaped fractal](https://github.com/user-attachments/assets/18153d36-0f08-4292-a729-9a400eb82d21)

### Singularity Effect

![Singularity fractal effect](https://github.com/user-attachments/assets/f9970d2d-8c81-4c16-abce-b6a2c0cf911f)


## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A modern web browser (Chrome, Firefox, or Edge, Opera)

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
