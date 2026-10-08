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
      if (
        !Number.isSafeInteger(metrics.citations) || metrics.citations < 0 ||
        !Number.isSafeInteger(metrics.h_index) || metrics.h_index < 0 ||
        metrics.h_index > metrics.citations || typeof metrics.updated_at !== "string" ||
        !Number.isFinite(updateDate.getTime())
      ) {
        throw new Error("Scholar metrics are invalid");
      }
      const formattedDate = new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(updateDate);
      citations.textContent = metrics.citations.toLocaleString("en-US");
      hIndex.textContent = metrics.h_index.toLocaleString("en-US");
      updated.dateTime = metrics.updated_at;
      updated.textContent = formattedDate;
      const stale = Date.now() - updateDate.getTime() > 10 * 24 * 60 * 60 * 1000;
      scholarCard.dataset.status = stale ? "cached" : "current";
      const status = scholarCard.querySelector("[data-scholar-status]");
      status.textContent = stale ? "Cached" : "Weekly";
      status.title = stale ? "Showing the last successful refresh" : "Scheduled to refresh weekly";
    })
    .catch(() => {
      scholarCard.dataset.status = "cached";
      const status = scholarCard.querySelector("[data-scholar-status]");
      status.textContent = "Cached";
      status.title = "Showing the last successful refresh";
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

const canvas = document.querySelector(".celestial-field");

if (canvas && canvas.getContext("2d")) {
  const context = canvas.getContext("2d");
  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  const sky = document.createElement("canvas");
  const skyContext = sky.getContext("2d");
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let brightStars = [];
  let frame = 0;
  let lastDraw = 0;
  let pointerX = 0;
  let pointerY = 0;

  // A seeded sky stays consistent between pages and is cached between frames.
  const makeSky = () => {
    let seed = 373;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const quietCenter = (x, y) => {
      const distance = Math.hypot(
        (x - width * 0.5) / (width * 0.34),
        (y - height * 0.5) / (height * 0.22),
      );
      return 0.18 + Math.min(1, distance) * 0.82;
    };
    const star = (x, y, radius, opacity) => {
      skyContext.beginPath();
      skyContext.fillStyle = `rgba(235, 232, 226, ${opacity * quietCenter(x, y)})`;
      skyContext.arc(x, y, radius, 0, Math.PI * 2);
      skyContext.fill();
    };

    skyContext.clearRect(0, 0, width, height);
    brightStars = [];
    const count = Math.min(1400, Math.round(width * height / 950));

    for (let i = 0; i < count; i += 1) {
      const x = random() * width;
      const y = random() * height;
      const radius = 0.35 + random() ** 3 * 1.25;
      star(x, y, radius, 0.22 + random() * 0.64);
      if (radius > 1.25 && brightStars.length < 36) {
        brightStars.push({ x, y, radius, phase: random() * Math.PI * 2 });
      }
    }

    const dustCount = Math.min(3800, Math.round(width * height / 290));
    for (let i = 0; i < dustCount; i += 1) {
      const t = random();
      const spread = (random() + random() + random() - 1.5) * width * 0.13;
      const x = width * (0.06 + 0.88 * t) + Math.sin(t * 5.5) * width * 0.14 + spread;
      const y = height * t + spread * 0.5;
      star(x, y, 0.2 + random() * 0.65, 0.12 + random() * 0.45);
    }

    const radius = Math.max(width * 0.43, height * 0.6);
    skyContext.save();
    skyContext.translate(width * 0.57, height * 0.5);
    skyContext.rotate(-0.3);
    [1, 1.025, 0.78].forEach((scale, index) => {
      skyContext.beginPath();
      skyContext.strokeStyle = index === 1
        ? "rgba(135, 173, 200, 0.25)"
        : "rgba(229, 225, 217, 0.22)";
      skyContext.lineWidth = index === 2 ? 0.6 : 0.8;
      skyContext.ellipse(0, 0, radius * scale, radius * scale * 0.72, 0, 0, Math.PI * 2);
      skyContext.stroke();
    });

    skyContext.strokeStyle = "rgba(135, 173, 200, 0.32)";
    for (let i = 0; i < 120; i += 1) {
      const angle = i / 120 * Math.PI * 2;
      const outer = i % 5 === 0 ? 1.05 : 1.037;
      skyContext.beginPath();
      skyContext.moveTo(Math.cos(angle) * radius * 1.025, Math.sin(angle) * radius * 0.72 * 1.025);
      skyContext.lineTo(Math.cos(angle) * radius * outer, Math.sin(angle) * radius * 0.72 * outer);
      skyContext.stroke();
    }
    skyContext.restore();
  };

  const draw = (time = 0) => {
    if (time - lastDraw >= 1000 / 30 || !frame) {
      lastDraw = time;
      context.clearRect(0, 0, width, height);
      const offsetX = motionPreference.matches ? 0 : pointerX * 3;
      const offsetY = motionPreference.matches ? 0 : pointerY * 3;
      context.drawImage(sky, offsetX - 4, offsetY - 4, width + 8, height + 8);

      brightStars.forEach((point) => {
        const pulse = 0.16 + Math.sin(time * 0.00065 + point.phase) * 0.1;
        const x = point.x / width * (width + 8) + offsetX - 4;
        const y = point.y / height * (height + 8) + offsetY - 4;
        context.strokeStyle = `rgba(245, 242, 234, ${pulse})`;
        context.lineWidth = 0.7;
        context.beginPath();
        context.moveTo(x - point.radius * 2, y);
        context.lineTo(x + point.radius * 2, y);
        context.moveTo(x, y - point.radius * 2);
        context.lineTo(x, y + point.radius * 2);
        context.stroke();
      });
    }

    if (!motionPreference.matches && !document.hidden) {
      frame = window.requestAnimationFrame(draw);
    }
  };

  const restart = () => {
    window.cancelAnimationFrame(frame);
    frame = 0;
    draw(motionPreference.matches ? 0 : performance.now());
  };

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    [canvas, sky].forEach((layer) => {
      layer.width = Math.round(width * pixelRatio);
      layer.height = Math.round(height * pixelRatio);
      layer.getContext("2d").setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    });
    makeSky();
    restart();
  };

  window.addEventListener("pointermove", (event) => {
    pointerX = event.clientX / width - 0.5;
    pointerY = event.clientY / height - 0.5;
  }, { passive: true });

  document.documentElement.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    } else {
      restart();
    }
  });

  motionPreference.addEventListener("change", restart);
  window.addEventListener("resize", resize);

  resize();
}
