class TikTokSeeding extends SeedingBase {
    async run() {
        while (true) {
            const { autoMode, geminiKey } = await chrome.storage.local.get(["autoMode", "geminiKey"]);
            if (!autoMode) {
                await this.delay(3000);
                continue;
            }

            // Tìm video containers trên TikTok
            const videos = document.querySelectorAll('div[data-e2e="recommend-list-item-container"]');
            let found = false;

            for (let video of videos) {
                if (this.seenPosts.has(video)) continue;
                this.seenPosts.add(video);
                found = true;

                try {
                    console.log("🟢 Step 1: Bắt đầu xử lý video TikTok");
                    this.highlight(video, "post");
                    await this.delay(3200);

                    console.log("💚 Step 2: Like video");
                    const likeBtn = video.querySelector('div[data-e2e="like-icon"]');
                    if (!likeBtn) throw new Error("Không tìm thấy nút Like");
                    // Check if already liked (TikTok has different way, perhaps class or attribute)
                    const isLiked = likeBtn.querySelector('svg path[fill="#FF0050"]') !== null; // Assuming red fill means liked
                    if (!isLiked) {
                        this.highlight(likeBtn, "likeBtn");
                        await this.delay(3000);
                        likeBtn.click();
                        console.log("👍 Đã Like video");
                    } else {
                        console.log("ℹ️ Video đã Like, bỏ qua comment AI");
                        window.scrollBy(0, window.innerHeight);
                        await this.delay(2500);
                        break;
                    }
                    await this.delay(2000);

                    console.log("🟠 Step 3: Mở comment section");
                    const commentBtn = video.querySelector('div[data-e2e="comment-icon"]');
                    if (!commentBtn) throw new Error("Không tìm thấy nút Comment");
                    this.highlight(commentBtn, "actionBar");
                    commentBtn.click();
                    await this.delay(2000);

                    // Tìm comment box
                    const commentBox = document.querySelector('textarea[placeholder*="Thêm bình luận"], input[placeholder*="Thêm bình luận"]');
                    if (!commentBox) throw new Error("Không tìm thấy ô comment");
                    this.highlight(commentBox, "commentBox");
                    await this.delay(2000);

                    console.log("🤖 Step 4: Gọi AI tạo comment");
                    let aiComment = "Nice!";
                    try {
                        // Get caption from video description
                        const captionEl = video.querySelector('div[data-e2e="video-desc"]') || video.querySelector('span[data-e2e="video-desc"]');
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
                    await this.delay(4000);

                    console.log("⌨️ Step 5: Nhập comment vào box");
                    commentBox.focus();
                    commentBox.value = aiComment;
                    commentBox.dispatchEvent(new Event("input", { bubbles: true }));
                    await this.delay(2000);

                    console.log("📩 Step 6: Nhấn Enter gửi comment");
                    const enterEvent = new KeyboardEvent("keydown", {
                        bubbles: true,
                        cancelable: true,
                        key: "Enter",
                        code: "Enter",
                        keyCode: 13,
                        which: 13
                    });
                    commentBox.dispatchEvent(enterEvent);
                    await this.delay(1500);
                    console.log("✅ Comment đã gửi thành công");

                    await this.delay(4000);
                    console.log("📜 Step 7: Scroll màn hình");
                    window.scrollBy(0, window.innerHeight);
                    await this.delay(5000);

                } catch (err) {
                    console.warn("⚠️ Lỗi ở bước:", err && err.message ? err.message : err);
                }

                break;
            }

            if (!found) {
                console.log("🔄 Không tìm thấy video mới, đang cuộn...");
                window.scrollBy(0, window.innerHeight / 2);
                await this.delay(1200);
            }
        }
    }
}

window.TikTokSeeding = TikTokSeeding;
