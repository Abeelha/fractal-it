import { generateFractal, updateFractalSections } from "../fractal/generator";

let cachedHtml = "";

let sectionConfig = {
  header: true,
  footer: true,
  body: true,
  section: true,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "UPDATE_SECTIONS") {
    sectionConfig = message.sections;
    updateFractalSections(cachedHtml, sectionConfig);
    sendResponse({ success: true });
    return true;
  }
});

cachedHtml = document.documentElement.outerHTML;
const fractalCanvas = generateFractal(cachedHtml, sectionConfig);
displayFractal(fractalCanvas);

function displayFractal(fractalCanvas: HTMLCanvasElement) {
  const container = document.createElement("div");
  container.id = "fractal-it-container";
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "100vw";
  container.style.height = "100vh";
  container.style.zIndex = "9999";
  container.style.backgroundColor = "#000";
  container.appendChild(fractalCanvas);

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.position = "fixed";
  closeButton.style.top = "20px";
  closeButton.style.right = "20px";
  closeButton.style.padding = "10px 20px";
  closeButton.style.backgroundColor = "#fff";
  closeButton.style.border = "none";
  closeButton.style.borderRadius = "4px";
  closeButton.style.cursor = "pointer";
  closeButton.onclick = () => container.remove();

  container.appendChild(closeButton);
  document.body.appendChild(container);
}
