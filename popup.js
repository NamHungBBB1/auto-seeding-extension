// Save config + start/stop commands to content script via scripting.executeScript
document.getElementById("saveBtn").addEventListener("click", async () => {
    const apiKey = document.getElementById("apiKey").value.trim();
    const maxPosts = parseInt(document.getElementById("maxPosts").value, 10) || 3;
    const stepDelay = parseInt(document.getElementById("stepDelay").value, 10) || 1800;

    await chrome.storage.local.set({ apiKey, maxPosts, stepDelay });
    alert("Saved!");
});

document.getElementById("startBtn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return alert("Open a Facebook tab first");
    // set flag in page to start
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => { window._fbAutoGemini_running = true; }
    });
    alert("Started (content script will run on the page).");
});

document.getElementById("stopBtn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => { window._fbAutoGemini_running = false; }
    });
    alert("Stop signal sent.");
});
