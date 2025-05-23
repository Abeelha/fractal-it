let autoFractalEnabled = false;

const injectFractalScript = async (tabId: number) => {
  if (!autoFractalEnabled) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });

    setTimeout(async () => {
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: "GENERATE_FRACTAL",
        });
      } catch (error) {
        console.error("Error sending generate fractal message:", error);
      }
    }, 500);
  } catch (error) {
    console.error("Error injecting fractal script:", error);
  }
};

chrome.runtime.onInstalled.addListener(() => {
  console.log("Fractal-it extension installed");

  chrome.storage.sync.set({ autoFractal: false }, () => {
    console.log("Auto-fractal initialized to OFF");
  });

  chrome.storage.sync.get(["autoFractal"], (result) => {
    if (result.autoFractal !== undefined) {
      autoFractalEnabled = result.autoFractal;
      console.log("Auto-fractal loaded from storage:", autoFractalEnabled);
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "SET_AUTO_FRACTAL") {
    autoFractalEnabled = message.enabled;
    console.log("Auto-fractal set to:", autoFractalEnabled);

    chrome.storage.sync.set({ autoFractal: autoFractalEnabled });

    sendResponse({ success: true });
  }
  return true;
});

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {
    console.log(
      "Navigation completed, auto-fractal enabled:",
      autoFractalEnabled,
    );
    injectFractalScript(details.tabId);
  }
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get(["autoFractal"], (result) => {
    if (result.autoFractal !== undefined) {
      autoFractalEnabled = result.autoFractal;
      console.log("Auto-fractal loaded on startup:", autoFractalEnabled);
    } else {
      autoFractalEnabled = false;
      chrome.storage.sync.set({ autoFractal: false });
      console.log("Auto-fractal defaulted to OFF on startup");
    }
  });
});
