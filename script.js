document.querySelectorAll("[data-current-year]").forEach((year) => {
  year.textContent = new Date().getFullYear();
});

const canvas = document.querySelector(".motion-field");

if (canvas) {
  const context = canvas.getContext("2d");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let points = [];
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;

  const makePoints = () => {
    const spacing = Math.max(42, Math.min(68, width / 18));
    const columns = Math.ceil(width / spacing) + 2;
    const rows = Math.ceil(height / spacing) + 2;
    points = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        points.push({
          baseX: column * spacing - spacing / 2,
          baseY: row * spacing - spacing / 2,
          column,
          row,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  };

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    pointerX = width / 2;
    pointerY = height / 2;
    makePoints();
  };

  const positionAt = (point, time) => {
    const waveX = Math.sin(time * 0.00028 + point.row * 0.42 + point.phase) * 9;
    const waveY = Math.cos(time * 0.00024 + point.column * 0.35 + point.phase) * 11;
    const dx = point.baseX - pointerX;
    const dy = point.baseY - pointerY;
    const distance = Math.hypot(dx, dy);
    const influence = Math.max(0, 1 - distance / 260);

    return {
      x: point.baseX + waveX + dx * influence * 0.035,
      y: point.baseY + waveY + dy * influence * 0.035,
    };
  };

  const draw = (time = 0) => {
    context.clearRect(0, 0, width, height);
    const positioned = points.map((point) => positionAt(point, time));
    const columnCount = Math.max(...points.map((point) => point.column)) + 1;

    context.lineWidth = 0.65;
    context.strokeStyle = "rgba(54, 137, 220, 0.16)";

    points.forEach((point, index) => {
      const current = positioned[index];
      const rightIndex = index + 1;
      const downIndex = index + columnCount;

      if (points[rightIndex] && points[rightIndex].row === point.row) {
        context.beginPath();
        context.moveTo(current.x, current.y);
        context.lineTo(positioned[rightIndex].x, positioned[rightIndex].y);
        context.stroke();
      }

      if (points[downIndex]) {
        context.beginPath();
        context.moveTo(current.x, current.y);
        context.lineTo(positioned[downIndex].x, positioned[downIndex].y);
        context.stroke();
      }
    });

    positioned.forEach((point, index) => {
      const pulse = 0.35 + Math.sin(time * 0.001 + points[index].phase) * 0.2;
      context.beginPath();
      context.fillStyle = `rgba(91, 181, 255, ${pulse})`;
      context.arc(point.x, point.y, 1.1, 0, Math.PI * 2);
      context.fill();
    });

    if (!prefersReducedMotion) {
      frame = window.requestAnimationFrame(draw);
    }
  };

  canvas.addEventListener("pointermove", (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointerX = event.clientX - bounds.left;
    pointerY = event.clientY - bounds.top;
  });

  canvas.addEventListener("pointerleave", () => {
    pointerX = width / 2;
    pointerY = height / 2;
  });

  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(frame);
    resize();
    draw(performance.now());
  });

  resize();
  draw();
}
