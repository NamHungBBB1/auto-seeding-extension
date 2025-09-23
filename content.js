// content.js
console.log("FB Auto Gemini content script loaded");

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function callGenerateComment(caption) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "generateComment", caption }, (resp) => {
            if (!resp) return reject("No response from background");
            if (resp.error) return reject(resp.error);
            resolve(resp.text);
        });
    });
}

function safeQuerySelectorWithin(post, selector) {
    try {
        return post.querySelector(selector);
    } catch (e) {
        return null;
    }
}

// Highlight helper that also remembers previous style to optionally restore
function highlight(el, color) {
    if (!el) return;
    el.dataset._origOutline = el.style.outline || "";
    el.style.outline = `3px solid ${color}`;
}

// Restore (optional)
function restoreHighlight(el) {
    if (!el) return;
    el.style.outline = el.dataset._origOutline || "";
    delete el.dataset._origOutline;
}

async function processOnce(maxPosts, stepDelay) {
    let seen = new Set();
    let processed = 0;

    while (processed < maxPosts && window._fbAutoGemini_running) {
        const posts = document.querySelectorAll("div[role='article']"); // more generic
        let found = false;

        for (const post of posts) {
            if (!window._fbAutoGemini_running) break;
            if (seen.has(post)) continue;
            seen.add(post);

            try {
                // 1. Highlight post (red)
                highlight(post, "red");
                console.log("Processing post...");
                await wait(stepDelay);

                // 2. Action bar (blue) - try candidate selectors (flexible)
                const actionBar = safeQuerySelectorWithin(post,
                    'div.x9f619.x1ja2u2z, div[aria-label][role="toolbar"], div[role="group"]'
                );
                if (actionBar) {
                    highlight(actionBar, "blue");
                    await wait(stepDelay);
                }

                // 3. Like (green) - find Like button by aria-label
                const likeBtn = safeQuerySelectorWithin(post, 'div[aria-label="Thích"][role="button"], div[aria-label="Like"][role="button"]');
                if (likeBtn && likeBtn.getAttribute("aria-pressed") !== "true") {
                    highlight(likeBtn, "green");
                    await wait(stepDelay);
                    likeBtn.click();
                    console.log("Liked");
                }
                await wait(stepDelay);

                // 4. Caption (gold)
                const captionEl = safeQuerySelectorWithin(post, 'div[dir="auto"]:not([aria-hidden="true"])');
                const caption = captionEl ? captionEl.innerText.trim() : "";
                if (captionEl) {
                    highlight(captionEl, "gold");
                }
                console.log("Caption:", caption);
                await wait(stepDelay);

                // 5. Comment button open (orange) - try to open if available
                const commentBtn = safeQuerySelectorWithin(post, 'div[aria-label="Bình luận"][role="button"], div[aria-label="Viết bình luận"][role="button"]');
                if (commentBtn) {
                    highlight(commentBtn, "orange");
                    await wait(stepDelay);
                    // Click to ensure textbox shows up (some posts already have textbox)
                    try { commentBtn.click(); } catch (e) { }
                }
                await wait(stepDelay);

                // 6. Directly find contenteditable comment box
                const commentBox = safeQuerySelectorWithin(post, 'div[contenteditable="true"][aria-label*="Viết bình luận"], div[contenteditable="true"][aria-label*="Write a comment"]');
                if (!commentBox) {
                    console.warn("No comment box found for this post");
                    // restore and skip
                    await wait(stepDelay);
                    continue;
                }
                highlight(commentBox, "purple");
                await wait(stepDelay);

                // 7. Generate comment via background (Gemini)
                let commentText = "";
                try {
                    commentText = await callGenerateComment(caption || " ");
                    console.log("AI comment:", commentText);
                } catch (err) {
                    console.error("AI generation failed:", err);
                    commentText = "Hay quá! 👍";
                }

                // 8. Input the comment
                try {
                    commentBox.focus();
                    // insert text - execCommand insertText often works in FB
                    document.execCommand("insertText", false, commentText);
                    commentBox.dispatchEvent(new Event("input", { bubbles: true }));
                } catch (e) {
                    console.warn("Failed to insert via execCommand, fallback to set innerText");
                    commentBox.innerText = commentText;
                    commentBox.dispatchEvent(new Event("input", { bubbles: true }));
                }
                await wait(stepDelay);

                // 9. Highlight send button (pink) then click
                // We try to find a nearby send button inside the post
                let sendBtn = null;
                // send button may have aria-label "Bình luận" or be the button you provided class list for earlier
                sendBtn = safeQuerySelectorWithin(post, 'div[aria-label="Bình luận"][role="button"], div[aria-label="Bình luận..."][role="button"]');

                // fallback: search whole post for a button-like element that contains text "Gửi" or icon
                if (!sendBtn) {
                    const candidates = post.querySelectorAll('div[role="button"]');
                    for (const c of candidates) {
                        const txt = (c.innerText || "").trim().toLowerCase();
                        if (txt === "gửi" || txt.includes("gửi") || txt.includes("send")) {
                            sendBtn = c;
                            break;
                        }
                    }
                }

                if (sendBtn) {
                    highlight(sendBtn, "pink");
                    await wait(stepDelay);
                    try { sendBtn.click(); console.log("Sent by clicking send button"); }
                    catch (e) {
                        console.warn("Click send failed:", e);
                        // fallback: press Enter in commentBox
                        commentBox.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
                    }
                } else {
                    // fallback press Enter
                    commentBox.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
                    console.log("Sent by Enter fallback");
                }

                // done with this post
                processed++;
                found = true;

                // small delay after finishing post
                await wait(Math.max(stepDelay, 1500));

                // optional: restore styles (comment out if you want to keep highlights)
                // restoreHighlight(post);
                // restoreHighlight(actionBar);
                // restoreHighlight(likeBtn);
                // restoreHighlight(captionEl);
                // restoreHighlight(commentBox);
                // restoreHighlight(sendBtn);

                break; // move to next outer loop to scan fresh posts
            } catch (err) {
                console.error("process post error:", err);
            }
        }

        if (!found) {
            // scroll to load more
            window.scrollBy(0, window.innerHeight / 2);
            await wait(Math.max(stepDelay, 1500));
        }
    }

    console.log("Processing finished or stopped");
}

// watcher: run periodically if the user set the running flag
let processOncePromise = null;
setInterval(async () => {
    if (window._fbAutoGemini_running) {
        const cfg = await new Promise((res) => chrome.storage.local.get(["maxPosts", "stepDelay"], res));
        const maxPosts = cfg.maxPosts || 3;
        const stepDelay = cfg.stepDelay || 1800;
        // run one processing cycle
        processOncePromise = processOncePromise || processOnce(maxPosts, stepDelay);
        // ensure only one simultaneous run
        if (!window._fbAutoGemini_internalRunning) {
            window._fbAutoGemini_internalRunning = true;
            try {
                await processOnce(maxPosts, stepDelay);
            } finally {
                window._fbAutoGemini_internalRunning = false;
            }
        }
    }
}, 3000);
