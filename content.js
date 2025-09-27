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

    // Sau khi click nút comment, chờ comment box xuất hiện trong vùng chứa phù hợp
    async function clickAndFindCommentBox(post, actionBar, opts = {}) {
        const timeout = opts.timeout ?? 8000;
        const interval = opts.interval ?? 500;

        const commentBtn = actionBar.querySelector('div[aria-label="Viết bình luận"][role="button"]') ||
            actionBar.querySelector('div[aria-label*="Bình luận"][role="button"]');

        if (!commentBtn) return null;

        // Lấy caption đoạn ngắn để dùng match khi popup hiện ra
        const captionEl = post.querySelector('div[dir="auto"]:not([aria-hidden="true"])');
        const captionSnippet = (captionEl?.innerText || '').slice(0, 120).replace(/\s+/g, ' ').trim();

        // click nút comment
        commentBtn.style.border = "3px solid orange";
        commentBtn.click();

        // Polling: tìm các commentBox mới xuất hiện; ưu tiên container có caption giống post
        const start = Date.now();
        while (Date.now() - start < timeout) {
            // tìm tất cả các ô comment trên trang (chỉ đọc, chưa chọn fallback toàn trang thường xuyên)
            const boxes = Array.from(document.querySelectorAll('div[contenteditable="true"][aria-placeholder="Viết bình luận..."]'));

            for (const box of boxes) {
                // tìm container bao quanh box (dialog, article, main, presentation...)
                const container = box.closest('div[role="dialog"], div[aria-modal="true"], div[role="article"], div[role="main"], section, article, div[role="presentation"]') || box.closest('div[role="article"]') || box;

                // kiểm tra visible
                const rect = box.getBoundingClientRect();
                const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(box).visibility !== 'hidden';

                if (!visible) continue;

                // nếu có captionSnippet thì ưu tiên container chứa captionSnippet
                if (captionSnippet && container && container.innerText && container.innerText.indexOf(captionSnippet) !== -1) {
                    // tìm thấy box trong đúng container có caption trùng → trả về
                    return { box, container };
                }

                // nếu không có caption để so sánh, nhưng container có kiểu dialog (nhiều khả năng là detail view) → cũng chấp nhận
                const role = container.getAttribute && (container.getAttribute('role') || '');
                if (!captionSnippet && role.toLowerCase().includes('dialog')) {
                    return { box, container };
                }

                // fallback: nếu container có role dialog và box visible → chấp nhận (ít ưu tiên)
                if (role.toLowerCase().includes('dialog')) {
                    return { box, container };
                }
            }

            await delay(interval);
        }

        // timeout
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
                post.style.border = "4px solid red";
                await delay(1200);

                console.log("🔵 Step 2: Tìm action bar");
                const actionBar = post.querySelector(
                    'div.x9f619.x1ja2u2z.x78zum5.x2lah0s.x1n2onr6.x1qughib.x1qjc9v5.xozqiw3.x1q0g3np.xjkvuk6.x1iorvi4.x11lt19s.xe9ewy2.x4cne27.xifccgj'
                );
                if (!actionBar) throw new Error("Không tìm thấy action bar");
                actionBar.style.border = "4px solid blue";
                await delay(800);

                console.log("💚 Step 3: Like post");
                const likeBtn = actionBar.querySelector('div[aria-label="Thích"][role="button"]');
                if (!likeBtn) throw new Error("Không tìm thấy nút Like");
                const alreadyLiked = likeBtn.getAttribute("aria-pressed") === "true";
                if (!alreadyLiked) {
                    likeBtn.style.border = "4px solid green";
                    await delay(800);
                    likeBtn.click();
                    console.log("👍 Đã Like post");
                } else {
                    console.log("ℹ️ Post đã Like, bỏ qua comment AI");
                    window.scrollBy(0, window.innerHeight);
                    await delay(1500);
                    break;
                }
                await delay(800);

                /* ================= FLOW COMMENT ================= */
                console.log("🟠 Step 4: Tìm khung comment trong post (chỉ trong post)");
                let commentBox = getCommentBox(post);
                let commentContainer = getPostRoot(post);

                if (!commentBox) {
                    // nếu không tìm thấy inline → click commentBtn và tìm trong popup/detail view
                    console.log("➡️ Không thấy ô comment trong post. Bấm nút comment để mở detail view...");
                    const found = await clickAndFindCommentBox(post, actionBar, { timeout: 9000, interval: 500 });
                    if (!found) {
                        console.warn("⛔ Không tìm thấy ô comment sau khi mở detail view → bỏ qua post");
                        break; // bỏ qua post này
                    }
                    commentBox = found.box;
                    commentContainer = found.container;
                    console.log("📍 Đã tìm thấy ô comment trong detail view (container):", commentContainer);
                    commentBox.style.border = "3px solid orange";
                    await delay(4000);
                } else {
                    console.log("🟣 Step 5: Tìm thấy comment box trong post");
                }

                // now we have commentBox and commentContainer (either post root or detail container)
                commentBox.click();
                await delay(2000);

                console.log("🤖 Step 6: Gọi AI tạo comment");
                let aiComment = "Nice!";
                try {
                    const captionEl = post.querySelector('div[dir="auto"]:not([aria-hidden="true"])');
                    const caption = captionEl ? captionEl.innerText : "";
                    const prompt = `bạn là 1 người dùng hãy comment 1 câu duy nhất thân thiện, ngắn gọn, tự nhiên cho caption: "${caption}"`;

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

                // đóng chỉ trong container chứa commentBox (nếu có nút)
                console.log("🔒 Step 9: Đóng popup/container nếu có nút Đóng trong cùng container");
                const closeBtn = getCloseBtnInContainer(commentContainer);
                if (closeBtn) {
                    closeBtn.style.border = "3px solid gray";
                    await delay(600);
                    closeBtn.click();
                    console.log("✅ Đã đóng popup trong container");
                }

                await delay(800);
                console.log("📜 Step 10: Scroll màn hình");
                window.scrollBy(0, window.innerHeight);
                await delay(1200);

            } catch (err) {
                console.warn("⚠️ Lỗi ở bước:", err && err.message ? err.message : err);
            }

            break; // xử lý 1 post xong thì thoát loop for
        }

        if (!found) {
            console.log("🔄 Không tìm thấy post mới, đang cuộn...");
            window.scrollBy(0, window.innerHeight / 2);
            await delay(1200);
        }
    }
})();
