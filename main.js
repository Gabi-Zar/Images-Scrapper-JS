import express from "express";
import * as cheerio from "cheerio";
import { randomUUID } from "crypto";
import axios from "axios";
import archiver from "archiver";
import mime from "mime";
import { rateLimit } from "express-rate-limit";
import "dotenv/config";

const app = express();
const PORT = 3000;
const useRateLimit = process.env.USE_RATE_LIMIT === "true";
const getImagesLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});
const downloadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});

let cachedImagesUrls = {};

app.use(express.static("public"));
if (useRateLimit) {
    app.use("/api/getImagesURL", getImagesLimiter);
    app.use("/api/downloadImages", downloadLimiter);
}

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

        const uuid = randomUUID();
        cachedImagesUrls[uuid] = imagesUrls;
        setTimeout(
            () => {
                delete cachedImagesUrls[uuid];
            },
            10 * 60 * 1000,
        );

        res.send({ uuid: uuid, urls: imagesUrls });
    } catch (error) {
        console.error(error);
    }
});

app.get("/api/downloadImages", async (req, res) => {
    try {
        let { uuid } = req.query;
        const imagesUrls = cachedImagesUrls[uuid];
        if (!imagesUrls) {
            return res.status(400).send("Invalid 'uuid'");
        }

        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename=${uuid}.zip`);

        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.pipe(res);

        let errorNumber = 0;
        for (let i = 0; i < imagesUrls.length; i++) {
            const url = imagesUrls[i];
            try {
                const response = await axios.get(url, { responseType: "stream", timeout: 5000 });
                const contentType = response.headers["content-type"];
                const extension = mime.getExtension(contentType) || url.split(".").pop();

                archive.append(response.data, { name: `image-${i + 1 - errorNumber}.${extension}` });
                //console.log(`image downloaded ${url}`);
            } catch (error) {
                errorNumber += 1;
                console.warn(`Unable to download image ${url} : ${error}`);
            }
        }

        await archive.finalize();
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
