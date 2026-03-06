const starsNumber = 1000;
const searchInput = document.getElementById("search-input");
const searchForm = document.getElementById("search-form");
const imagesDiv = document.getElementById("images-div");
const imageTemplate = document.getElementById("image-template");
const loaderDiv = document.getElementById("loader-div");
let imagesUrls = [];

starsCanvas(starsNumber);
searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
});

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

async function getImagesURL(query, offset, count, smart) {
    const url = `/api/getImagesURL?q=${encodeURIComponent(query)}&offset=${offset}&count=${count}&smart=${smart}`;
    const response = await fetch(url);
    const data = await response.json();

    loaderDiv.classList.toggle("show");
    for (const url of data) {
        imagesUrls.push(url);
        const imageTemplateCopy = imageTemplate.content.cloneNode(true);
        imageTemplateCopy.getElementById("image").src = url;
        imagesDiv.append(imageTemplateCopy);
    }
}

async function search() {
    imagesDiv.replaceChildren();
    loaderDiv.classList.toggle("show");
    await getImagesURL(searchInput.value, 1, 1000, false);
}
