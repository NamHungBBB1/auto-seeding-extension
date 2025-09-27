const apiKeyInput = document.getElementById("apiKey");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const logEl = document.getElementById("log");

// Lưu API Key
apiKeyInput.addEventListener("change", () => {
    chrome.storage.local.set({ geminiKey: apiKeyInput.value });
});

// Start seeding
startBtn.addEventListener("click", () => {
    chrome.storage.local.set({ autoMode: true });
    log("✅ Bắt đầu seeding");
});

// Stop seeding
stopBtn.addEventListener("click", () => {
    chrome.storage.local.set({ autoMode: false });
    log("⏹ Dừng seeding");
});

function log(msg) {
    logEl.innerHTML += msg + "<br>";
    logEl.scrollTop = logEl.scrollHeight;
}
