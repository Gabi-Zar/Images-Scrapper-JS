import express from "express";
import * as cheerio from "cheerio";

const app = express();
const PORT = 3000;

app.use(express.static("public"));

app.listen(PORT, () => {
    console.log(`Server launched on http://localhost:${PORT}`);
});

app.get("/api/getImagesURL", async (req, res) => {
    try {
        let { q, offset = 1, count = 1000, smart = true } = req.query;
        offset = Number(offset);
        count = Number(count);
        smart = smart === "true";

        if (!q) {
            return res.status(400).send("Missing 'q' parameter");
        }

        let imagesUrls = [];
        let noNewCount = 0;
        do {
            const url = `https://www.bing.com/images/async?q=${encodeURIComponent(q)}&first=${String(offset)}`;
            const response = await fetch(url);
            const html = await response.text();

            const urls = extractImageUrls(html);
            offset += urls.length;
            let newImageCount = 0;
            for (const url of urls) {
                if (!imagesUrls.includes(url)) {
                    if (smart == true) {
                        try {
                            const response = await fetch(url, { method: "HEAD" });
                            const contentType = response.headers.get("content-type");
                            if (contentType && contentType.startsWith("image/")) {
                                imagesUrls.push(url);
                                newImageCount += 1;
                            }
                        } catch {}
                    } else {
                        imagesUrls.push(url);
                        newImageCount += 1;
                    }
                }
            }
            noNewCount = newImageCount == 0 ? noNewCount + 1 : 0;
            if (noNewCount > 32) {
                break;
            }
        } while (imagesUrls.length < count);

        imagesUrls = imagesUrls.slice(0, count);

        res.send(imagesUrls);
    } catch (error) {
        console.error(error);
    }
});

function extractImageUrls(html) {
    const document = cheerio.load(html);
    const urls = [];
    const imagesTags = document("a.iusc").toArray();

    for (const tag of imagesTags) {
        const metadataString = document(tag).attr("m");
        const imageData = JSON.parse(metadataString);
        let url = new URL(imageData.murl);
        url = url.origin + url.pathname;
        urls.push(url);
    }

    return urls;
}
