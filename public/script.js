const starsNumber = 1000;
const view = document.getElementById("view");
const homeTemplate = document.getElementById("home-template");
const settingsTemplate = document.getElementById("settings-template");
let cachedUrls = [];
let cachedQuery = "";
let uuid;
let imagesProvider = getCookie("imagesProvider") || "Bing";
let imagesOffset = getCookie("imagesOffset") || 1;
let maxImages = getCookie("maxImages") || 1000;
let smartMode = getCookie("smartMode") || false;

navigate("home");

starsCanvas(starsNumber);
window.addEventListener("resize", () => {
    starsCanvas(starsNumber);
});

function starsCanvas(number) {
    const canvas = document.getElementById("stars-canvas");
    const ctx = canvas.getContext("2d");
    canvas.style.filter = "blur(2px)";

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const centerX = width / 2;
    const centerY = height / 2;

    const stars = [];

    for (let i = 0; i < number; i++) {
        stars.push(makeStar(10000));
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < number; i++) {
            ctx.beginPath();
            ctx.moveTo(stars[i].position.x, stars[i].position.y);
            ctx.arc(stars[i].position.x, stars[i].position.y, stars[i].radius, 0, Math.PI * 2, true);
            ctx.fillStyle = `rgb(${stars[i].color}, ${stars[i].color}, ${stars[i].color})`;
            ctx.fill();

            const velocity = Math.sqrt(stars[i].dx ** 2 + stars[i].dy ** 2);

            stars[i].radius *= 1 + 0.002 * velocity;
            stars[i].position.x += stars[i].dx;
            stars[i].position.y += stars[i].dy;
            stars[i].dx *= 1 + 0.002 * velocity;
            stars[i].dy *= 1 + 0.002 * velocity;

            if (stars[i].color <= 245) {
                Math.round((stars[i].color += 0.3 * velocity));
            }

            if (stars[i].position.x < 0 || stars[i].position.x > width || stars[i].position.y < 0 || stars[i].position.y > height) {
                stars[i] = makeStar();
            }
        }

        requestAnimationFrame(animate);
    }

    function makeStar(initialTime = 0) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 0.2 + 0.05;
        initialTime = Math.random() * initialTime;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;

        const star = {
            position: { x: centerX + dx * initialTime, y: centerY + dy * initialTime },
            radius: Math.random() * 0.5 + 0.0001 * initialTime,
            dx: dx,
            dy: dy,
            color: 100 + 0.01 * initialTime,
        };

        return star;
    }

    animate();
}

function navigate(page) {
    view.replaceChildren();
    switch (page) {
        case "home":
            view.appendChild(homeTemplate.content.cloneNode(true));
            const searchForm = document.getElementById("search-form");
            const searchInput = document.getElementById("search-input");

            searchForm.addEventListener("submit", function (event) {
                event.preventDefault();
            });

            fillImagesGrid();
            searchInput.value = cachedQuery;
            break;
        case "settings":
            view.appendChild(settingsTemplate.content.cloneNode(true));
            setProviderButton();
            toggleSelectedListButton("provider-menu", imagesProvider);

            const maxImagesInput = document.getElementById("max-images-input");
            maxImagesInput.value = maxImages;
            maxImagesInput.addEventListener("input", function (event) {
                maxImages = maxImagesInput.value;
                setCookie("maxImages", maxImagesInput.value);
            });

            const offsetInput = document.getElementById("offset-input");
            offsetInput.value = imagesOffset;
            offsetInput.addEventListener("input", function (event) {
                imagesOffset = offsetInput.value;
                setCookie("imagesOffset", offsetInput.value);
            });

            const smartModeCheckbox = document.getElementById("smart-mode");
            smartModeCheckbox.checked = smartMode;
            smartModeCheckbox.addEventListener("change", function () {
                smartMode = this.checked;
                setCookie("smartMode", this.checked);
            });
            break;
    }
}

async function getImagesURL(query, offset, count, smart) {
    const url = `/api/getImagesURL?q=${encodeURIComponent(query)}&offset=${offset}&count=${count}&smart=${smart}`;
    const response = await fetch(url);
    if (!response.ok) {
        console.error(await response.text());
        return;
    }
    const data = await response.json();
    uuid = data.uuid;

    cachedUrls = data.urls;
}

async function downloadImages(uuid) {
    const url = `/api/downloadImages?uuid=${encodeURIComponent(uuid)}`;
    const response = await fetch(url);
    if (!response.ok) {
        console.error(await response.text());
        return;
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${uuid}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
}

async function search() {
    const imagesDiv = document.getElementById("images-div");
    const loaderDiv = document.getElementById("loader-div");
    const searchInput = document.getElementById("search-input");
    cachedQuery = searchInput.value;

    imagesDiv.replaceChildren();
    loaderDiv.classList.toggle("show");
    await getImagesURL(cachedQuery, imagesOffset, maxImages, smartMode);

    loaderDiv.classList.toggle("show");
    fillImagesGrid();
}

async function download() {
    await downloadImages(uuid);
}

function toggleProviderMenu() {
    const providerMenu = document.getElementById("provider-menu");
    if (providerMenu) {
        providerMenu.classList.toggle("show");
    }
}

async function setProviderButton() {
    const providerButton = document.getElementById("provider-button");
    if (providerButton) {
        providerButton.innerHTML = `<img src="assets/${imagesProvider}.svg" class="icons" /> ${imagesProvider}`;
    }
}

function changeProvider(provider) {
    imagesProvider = provider;
    setCookie("imagesProvider", provider);
    toggleProviderMenu();
    toggleSelectedListButton("provider-menu", provider);
    setProviderButton();
}

function toggleSelectedListButton(ListMenuId, buttonId) {
    const listMenu = document.getElementById(ListMenuId);
    if (listMenu) {
        Array.from(listMenu.children).forEach((child) => {
            child.classList.remove("selected");
        });
    }

    const listButton = document.getElementById(buttonId);
    if (listButton) {
        listButton.classList.toggle("selected");
    }
}

function fillImagesGrid() {
    if (!cachedUrls) {
        return;
    }

    const imageTemplate = document.getElementById("image-template");
    const imagesDiv = document.getElementById("images-div");

    for (const url of cachedUrls) {
        const imageTemplateCopy = imageTemplate.content.cloneNode(true);
        imageTemplateCopy.getElementById("link").href = url;
        imageTemplateCopy.getElementById("image").src = url;
        imagesDiv.appendChild(imageTemplateCopy);
    }
}

function setCookie(name, value) {
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; SameSite=Lax`;
}

function getCookie(name) {
    const cookies = document.cookie.split("; ");

    for (const cookie of cookies) {
        const [key, value] = cookie.split("=");
        if (key == name) {
            return value;
        }
    }
}
