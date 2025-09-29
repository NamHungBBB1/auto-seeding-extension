(async () => {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    let seenPosts = new Set();

    /* ---------------- Helpers ---------------- */
    function getPostRoot(post) {
        return post.closest('div[role="article"]') || post;
    }

    function getCommentBoxInRoot(root) {
        return root.querySelector('div[contenteditable="true"][aria-placeholder="Viết bình luận..."]');
    }

    function getCommentBox(post) {
        return getCommentBoxInRoot(getPostRoot(post));
    }

    function getCloseBtnInContainer(container) {
        if (!container) return null;
        return container.querySelector('div[aria-label="Đóng"][role="button"]') ||
            container.querySelector('div[aria-label*="Đóng"]');
    }

    /* ---------------- Highlight Function ---------------- */
    /* ---------------- Highlight Function (với màu tương phản chuẩn) ---------------- */
    function highlight(el, type = "default") {
        if (!el) return;

        // Reset
        el.style.border = "";
        el.style.outline = "";
        el.style.boxShadow = "";
        el.style.borderRadius = "10px";
        el.style.animation = "";
        el.style.backgroundImage = "";

        switch (type) {
            case "post": // tím đậm ↔ hồng sáng (pulse)
                el.style.border = "3px solid #6A0DAD";
                el.style.borderRadius = "12px";
                el.style.animation = "pulsePost 1.5s infinite";
                if (!document.getElementById("pulse-post-style")) {
                    const styleTag = document.createElement("style");
                    styleTag.id = "pulse-post-style";
                    styleTag.innerHTML = `
                @keyframes pulsePost {
                    0%   { box-shadow: 0 0 5px #FF66CC; }
                    50%  { box-shadow: 0 0 20px #6A0DAD; }
                    100% { box-shadow: 0 0 5px #FF66CC; }
                }`;
                    document.head.appendChild(styleTag);
                }
                break;

            case "actionBar": // xanh ngọc đậm ↔ xanh nhạt
                el.style.border = "3px solid #008B8B";
                el.style.boxShadow = "0 0 12px #40E0D0";
                break;

            case "likeBtn": // xanh lá đậm ↔ vàng neon
                el.style.border = "3px solid transparent";
                el.style.borderRadius = "8px";
                el.style.backgroundImage = "linear-gradient(90deg, #228B22, #FFD700)";
                el.style.backgroundOrigin = "border-box";
                el.style.backgroundClip = "content-box, border-box";
                el.style.boxShadow = "0 0 12px #FFD700, 0 0 24px #228B22";
                break;

            case "commentBox": // cam đậm ↔ vàng pastel
                el.style.border = "2px dashed #FF8C00";
                el.style.borderRadius = "10px";
                el.style.boxShadow = "0 0 8px #FFF176";
                break;

            case "closeBtn": // xám nhạt pulse
                el.style.border = "2px solid #666";
                el.style.animation = "pulseClose 1.2s infinite";
                if (!document.getElementById("pulse-close-style")) {
                    const styleTag = document.createElement("style");
                    styleTag.id = "pulse-close-style";
                    styleTag.innerHTML = `
                @keyframes pulseClose {
                    0%   { box-shadow: 0 0 4px #999; }
                    50%  { box-shadow: 0 0 12px #666; }
                    100% { box-shadow: 0 0 4px #999; }
                }`;
                    document.head.appendChild(styleTag);
                }
                break;

            default:
                el.style.border = "2px solid #999";
        }
    }


    // Sau khi click nút comment, chờ comment box xuất hiện trong vùng chứa phù hợp
    async function clickAndFindCommentBox(post, actionBar, opts = {}) {
        const timeout = opts.timeout ?? 8000;
        const interval = opts.interval ?? 2000;

        const commentBtn = actionBar.querySelector('div[aria-label="Viết bình luận"][role="button"]') ||
            actionBar.querySelector('div[aria-label*="Bình luận"][role="button"]');

        if (!commentBtn) return null;

        const captionEl = post.querySelector('div[dir="auto"]:not([aria-hidden="true"])');
        const captionSnippet = (captionEl?.innerText || '').slice(0, 120).replace(/\s+/g, ' ').trim();

        highlight(commentBtn, "orange", "pulse");
        commentBtn.click();

        const start = Date.now();
        while (Date.now() - start < timeout) {
            const boxes = Array.from(document.querySelectorAll('div[contenteditable="true"][aria-placeholder="Viết bình luận..."]'));

            for (const box of boxes) {
                const container = box.closest('div[role="dialog"], div[aria-modal="true"], div[role="article"], div[role="main"], section, article, div[role="presentation"]') || box.closest('div[role="article"]') || box;

                const rect = box.getBoundingClientRect();
                const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(box).visibility !== 'hidden';

                if (!visible) continue;

                if (captionSnippet && container && container.innerText && container.innerText.indexOf(captionSnippet) !== -1) {
                    return { box, container };
                }

                const role = container.getAttribute && (container.getAttribute('role') || '');
                if (!captionSnippet && role.toLowerCase().includes('dialog')) {
                    return { box, container };
                }

                if (role.toLowerCase().includes('dialog')) {
                    return { box, container };
                }
            }

            await delay(interval);
        }

        return null;
    }

    /* ---------------- Main Loop ---------------- */
    while (true) {
        const { autoMode, geminiKey } = await chrome.storage.local.get(["autoMode", "geminiKey"]);
        if (!autoMode) {
            await delay(3000);
            continue;
        }

        const posts = document.querySelectorAll('div.x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z');
        let found = false;

        for (let post of posts) {
            if (seenPosts.has(post)) continue;
            seenPosts.add(post);
            found = true;

            try {
                console.log("🟢 Step 1: Bắt đầu xử lý post");
                highlight(post, "post");
                await delay(3200);

                console.log("🔵 Step 2: Tìm action bar");
                const actionBar = post.querySelector(
                    'div.x9f619.x1ja2u2z.x78zum5.x2lah0s.x1n2onr6.x1qughib.x1qjc9v5.xozqiw3.x1q0g3np.xjkvuk6.x1iorvi4.x11lt19s.xe9ewy2.x4cne27.xifccgj'
                );
                if (!actionBar) throw new Error("Không tìm thấy action bar");
                highlight(actionBar, "actionBar");
                await delay(1200);

                console.log("💚 Step 3: Like post");
                const likeBtn = actionBar.querySelector('div[aria-label="Thích"][role="button"]');
                if (!likeBtn) throw new Error("Không tìm thấy nút Like");
                const alreadyLiked = likeBtn.getAttribute("aria-pressed") === "true";
                if (!alreadyLiked) {
                    highlight(likeBtn, "likeBtn");
                    await delay(3000);
                    likeBtn.click();
                    console.log("👍 Đã Like post");
                } else {
                    console.log("ℹ️ Post đã Like, bỏ qua comment AI");
                    window.scrollBy(0, window.innerHeight);
                    await delay(2500);
                    break;
                }
                await delay(2000);

                console.log("🟠 Step 4: Tìm khung comment trong post (chỉ trong post)");
                let commentBox = getCommentBox(post);
                let commentContainer = getPostRoot(post);

                if (!commentBox) {
                    console.log("➡️ Không thấy ô comment trong post. Bấm nút comment để mở detail view...");
                    const found = await clickAndFindCommentBox(post, actionBar, { timeout: 9000, interval: 500 });
                    if (!found) {
                        console.warn("⛔ Không tìm thấy ô comment sau khi mở detail view → bỏ qua post");
                        break;
                    }
                    commentBox = found.box;
                    commentContainer = found.container;
                    highlight(commentBox, "commentBox");
                    await delay(4000);
                } else {
                    console.log("🟣 Step 5: Tìm thấy comment box trong post");
                    highlight(commentBox, "commentBox");
                }

                commentBox.click();
                await delay(2000);

                console.log("🤖 Step 6: Gọi AI tạo comment");
                let aiComment = "Nice!";
                try {
                    const captionEl = post.querySelector('div[dir="auto"]:not([aria-hidden="true"])');
                    const caption = captionEl ? captionEl.innerText : "";
                    const prompt = `bạn là 1 người teen (sử dụng teen code)có 1 tính cách ngẫu nhiên trong mô hình Enneagram.LUU y tôi đang gọi api của bạn nên đừng trả lời dài dòng chỉ cần 1 câu cmt thôi  hãy comment 1 câu duy nhất thân thiện, ngắn gọn, tự nhiên cho caption: "${caption}"`;

                    const res = await fetch(
                        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                        }
                    );
                    const data = await res.json();
                    aiComment = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Nice!";
                    console.log("🤖 AI Comment:", aiComment);
                } catch (err) {
                    console.warn("⚠️ AI generate lỗi, dùng comment mặc định");
                }
                await delay(4000);

                console.log("⌨️ Step 7: Nhập comment vào box");
                commentBox.focus();
                document.execCommand("insertText", false, aiComment);
                commentBox.dispatchEvent(new Event("input", { bubbles: true }));
                await delay(2000);

                console.log("📩 Step 8: Nhấn Enter gửi comment");
                const enterEvent = new KeyboardEvent("keydown", {
                    bubbles: true,
                    cancelable: true,
                    key: "Enter",
                    code: "Enter",
                    keyCode: 13,
                    which: 13
                });
                commentBox.dispatchEvent(enterEvent);
                await delay(1500);
                console.log("✅ Comment đã gửi thành công");

                console.log("🔒 Step 9: Đóng popup/container nếu có nút Đóng trong cùng container");
                const closeBtn = getCloseBtnInContainer(commentContainer);
                if (closeBtn) {
                    highlight(closeBtn, "closeBtn");
                    await delay(1600);
                    closeBtn.click();
                    console.log("✅ Đã đóng popup trong container");
                }

                await delay(4000);
                console.log("📜 Step 10: Scroll màn hình");
                window.scrollBy(0, window.innerHeight);
                await delay(5000);

            } catch (err) {
                console.warn("⚠️ Lỗi ở bước:", err && err.message ? err.message : err);
            }

            break;
        }

        if (!found) {
            console.log("🔄 Không tìm thấy post mới, đang cuộn...");
            window.scrollBy(0, window.innerHeight / 2);
            await delay(1200);
        }
    }
})();
