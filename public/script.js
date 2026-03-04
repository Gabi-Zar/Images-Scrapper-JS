const starsNumber = 1000;
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
        stars.push(makeStar());
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

            stars[i].radius *= 1 + 0.001 * velocity;
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

    function makeStar() {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 0.1 + 0.05;
        const initialTime = Math.random() * 5000;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;

        const star = {
            position: { x: centerX + dx * initialTime, y: centerY + dy * initialTime },
            radius: Math.random() * 3,
            dx: dx,
            dy: dy,
            color: 0,
        };

        return star;
    }

    animate();
}
