import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyAGabG25V-YPP5_B4a5blQt83UOwALgnLo" });

async function main() {
    const caption = "Hôm nay trời đẹp quá, muốn đi dạo!";
    const prompt = `Chỉ viết 1 comment thân thiện,ngắn gọn xúc tích, tự nhiên cho caption, bạn hãy nói tiếng việt: "${caption}"`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        console.log("📜 Caption:", caption);
        console.log("🤖 AI Comment:", response.text);
    } catch (err) {
        console.error("❌ Lỗi khi gọi Gemini:", err);
    }
}

main();
