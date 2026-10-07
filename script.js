document.querySelectorAll("[data-current-year]").forEach((year) => {
  year.textContent = new Date().getFullYear();
});

const scholarCard = document.querySelector("[data-scholar-card]");

if (scholarCard) {
  fetch("data/scholar-metrics.json", { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Scholar metrics could not be loaded");
      }
      return response.json();
    })
    .then((metrics) => {
      const citations = scholarCard.querySelector("[data-scholar-citations]");
      const hIndex = scholarCard.querySelector("[data-scholar-h-index]");
      const updated = scholarCard.querySelector("[data-scholar-updated]");
      const updateDate = new Date(metrics.updated_at);

      citations.textContent = metrics.citations.toLocaleString("en-US");
      hIndex.textContent = metrics.h_index.toLocaleString("en-US");
      updated.dateTime = metrics.updated_at;
      updated.textContent = new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(updateDate);
    })
    .catch(() => {
      scholarCard.dataset.status = "cached";
    });
}

const riskEstimator = document.querySelector("[data-risk-estimator]");

if (riskEstimator) {
  const form = riskEstimator.querySelector("[data-risk-controls]");
  const riskValue = riskEstimator.querySelector("[data-risk-value]");
  const riskVerdict = riskEstimator.querySelector("[data-risk-verdict]");
  const riskFill = riskEstimator.querySelector("[data-risk-fill]");
  const riskMarker = riskEstimator.querySelector("[data-risk-marker]");

  const verdicts = [
    {
      maximum: 0.1,
      responses: [
        "Baseline tranquility detected. Please avoid improving the model.",
        "The risk is mostly theoretical, which has never stopped a good panel discussion.",
        "No immediate concern. The ontology may remain open.",
        "Statistically adjacent to fine. Emotionally, also fine.",
        "Negligible-ish. Continue to behave normally.",
      ],
    },
    {
      maximum: 1,
      responses: [
        "Low, but non-zero in a technically meaningful sense.",
        "The dashboard recommends one raised eyebrow.",
        "Probably fine. Documentation would be a charming precaution.",
        "Below alarm threshold; above complete innocence.",
        "No intervention required beyond ordinary academic supervision.",
      ],
    },
    {
      maximum: 5,
      responses: [
        "Material enough to justify a meeting.",
        "Caution has entered the literature review.",
        "A risk memo would now look less theatrical.",
        "Someone should ask what the model is doing, casually.",
        "The estimate has become meeting-shaped.",
      ],
    },
    {
      maximum: 20,
      responses: [
        "Concerningly publishable.",
        "This is no longer a thought experiment with good lighting.",
        "Ethics review has begun typing.",
        "The sandbox would like a word.",
        "Please attach limitations before proceeding.",
      ],
    },
    {
      maximum: 50,
      responses: [
        "Please close the terminal and find an adult.",
        "The precautionary principle is standing directly behind you.",
        "Deployment now requires a second adult and an unusually calm systems administrator.",
        "Risk governance has escalated from document to physical presence.",
        "This result should not be left unattended.",
      ],
    },
    {
      maximum: Infinity,
      responses: [
        "Apocalypse incoming, subject to peer review.",
        "The error bars have requested legal counsel.",
        "The model has left its confidence interval.",
        "Turn it off, then explain why it had infrastructure access.",
        "Congratulations. You have operationalized the worst-case scenario.",
      ],
    },
  ];

  const verdictFor = (probability, seed) => {
    const band = verdicts.find(({ maximum }) => probability < maximum);
    return band.responses[seed % band.responses.length];
  };

  const updateRisk = () => {
    const values = new FormData(form);
    const capability = Number(values.get("capability"));
    const autonomy = Number(values.get("autonomy"));
    const access = Number(values.get("access"));
    const sleep = Number(values.get("sleep"));
    const philosophy = Number(values.get("philosophy"));
    const friday = values.has("friday") ? 1 : 0;
    const oversight = values.has("oversight") ? 1 : 0;
    const score =
      -8.4 +
      0.032 * capability ** 2 +
      0.041 * autonomy ** 2 +
      0.052 * access ** 2 +
      0.08 * sleep +
      0.07 * philosophy +
      1.25 * friday -
      1.1 * oversight;
    const probability = 100 / (1 + Math.exp(-score));
    const displayValue = probability < 10 ? probability.toFixed(2) : probability.toFixed(1);
    const scalePosition = Math.min(100, Math.max(0.6, probability));
    const responseSeed =
      capability * 3 +
      autonomy * 5 +
      access * 7 +
      sleep * 11 +
      philosophy * 13 +
      friday * 17 +
      oversight * 19;

    riskValue.textContent = displayValue;
    riskVerdict.textContent = verdictFor(probability, responseSeed);
    riskFill.style.width = `${100 - scalePosition}%`;
    riskMarker.style.left = `${scalePosition}%`;

    form.querySelectorAll('input[type="range"]').forEach((input) => {
      const output = form.querySelector(`[data-output="${input.name}"]`);
      output.textContent = input.value;
    });
  };

  form.addEventListener("input", updateRisk);
  form.addEventListener("reset", () => window.setTimeout(updateRisk, 0));
  updateRisk();
}

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
