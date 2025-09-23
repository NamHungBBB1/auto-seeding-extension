// background.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "generateComment") {
        chrome.storage.local.get("apiKey", async ({ apiKey }) => {
            if (!apiKey) {
                sendResponse({ error: "No API key stored" });
                return;
            }

            try {
                // Prepare prompt for Gemini/text-bison
                const prompt = `Bạn là một người dùng Facebook thân thiện. Viết 1 bình luận ngắn gọn, tự nhiên, phù hợp với nội dung sau:\n\n"${msg.caption}"\n\nHãy viết 1 câu, lịch sự, không spam.`;

                // Using Google Generative Language REST (text-bison) with api key param in URL
                const url = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate?key=${encodeURIComponent(apiKey)}`;

                const body = {
                    prompt: {
                        text: prompt
                    },
                    // adjust temperature/maximum output length as needed
                    temperature: 0.7,
                    maxOutputTokens: 120
                };

                const resp = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });

                if (!resp.ok) {
                    const errText = await resp.text();
                    sendResponse({ error: `API error: ${resp.status} ${errText}` });
                    return;
                }

                const data = await resp.json();

                // Parse candidate text: format may vary; try known places
                let text = "";
                if (data?.candidates && data.candidates.length) {
                    text = data.candidates[0].content || data.candidates[0].output || "";
                } else if (data?.output?.[0]?.content) {
                    text = data.output[0].content;
                } else if (data?.result) {
                    text = JSON.stringify(data.result).slice(0, 200);
                } else {
                    text = "";
                }

                if (!text) text = "Bài viết hay quá! 👍";

                sendResponse({ text });
            } catch (err) {
                console.error("Background generate error:", err);
                sendResponse({ error: err.message || String(err) });
            }
        });

        // Indicate async response
        return true;
    }
});
