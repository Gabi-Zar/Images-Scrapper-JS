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
        const { q, offset = 0, count = 100 } = req.query;

        if (!q) {
            return res.status(400).send("Missing 'q' parameter");
        }

        let imagesUrls = [];
        do {
            const url = `https://www.bing.com/images/async?q=${encodeURIComponent(q)}&offset=${offset}&count=30`;
            const response = await fetch(url);
            const html = await response.text();

            const urls = extractImageUrls(html);
            for (const url of urls) {
                imagesUrls.push(url);
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
