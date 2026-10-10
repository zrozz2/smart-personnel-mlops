
const $ = (selector) => document.querySelector(selector);

const endpointConfig = {
  health: {
    method: "GET",
    path: "/health",
    title: "Health Check",
    description: "Memeriksa apakah layanan API dan model tersedia.",
    url: "/health"
  },
  features: {
    method: "GET",
    path: "/features",
    title: "Model Features",
    description: "Menampilkan daftar feature yang diwajibkan oleh model.",
    url: "/features"
  },
  example: {
    method: "GET",
    path: "/example-input",
    title: "Example Input",
    description: "Mengambil satu contoh input dari dataset untuk referensi payload.",
    url: "/example-input"
  },
  predict: {
    method: "POST",
    path: "/predict",
    title: "Workload Prediction",
    description: "Menghasilkan estimasi jumlah tugas selesai dari feature input.",
    url: "/swagger"
  }
};

let selectedEndpoint = "health";
let responseCache = {};
let toastTimer;

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "Accept": "application/json" }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("JSON berhasil disalin.");
  } catch {
    showToast("Tidak bisa menyalin otomatis. Salin teks secara manual.");
  }
}

function prettyJson(data) {
  return JSON.stringify(data, null, 2);
}

function setApiStatus(online, detail = "") {
  const statusText = online ? "Operational" : "Unavailable";

  $("#apiStatus").textContent = statusText;
  $("#apiStatusDetail").textContent =
    detail || (online ? "API merespons dengan baik" : "Periksa server API");

  $("#sideStatus").textContent = online ? "API Operational" : "API Unavailable";

  $("#apiDot").className = `status-dot ${online ? "online" : "offline"}`;
  $("#sideDot").className = `status-dot ${online ? "online" : "offline"}`;
}

async function checkHealth() {
  $("#healthResult").textContent = "Memeriksa koneksi...";
  $("#healthResult").className = "inline-result";

  try {
    const data = await fetchJson("/health");
    responseCache.health = data;
    setApiStatus(true, "Server merespons dengan baik");
    $("#healthResult").textContent =
      `Terhubung. Status: ${data.status || "healthy"}`;
    $("#healthResult").className = "inline-result success";

    if (selectedEndpoint === "health") renderEndpoint();
  } catch (error) {
    setApiStatus(false, "Tidak dapat menghubungi API");
    $("#healthResult").textContent =
      `Gagal terhubung: ${error.message}`;
    $("#healthResult").className = "inline-result error";
  }
}

async function loadFeatures() {
  try {
    const data = await fetchJson("/features");
    responseCache.features = data;

    const count = data.total_features ?? data.features?.length ?? "—";
    $("#featureCount").textContent = count;

    if (selectedEndpoint === "features") renderEndpoint();
  } catch {
    $("#featureCount").textContent = "—";
  }
}

async function loadSample() {
  $("#sampleResult").textContent = "Memuat contoh input...";
  $("#sampleResult").className = "inline-result";

  try {
    const data = await fetchJson("/example-input");
    responseCache.example = data;

    $("#sampleResult").textContent =
      "Contoh input berhasil dimuat. Lihat detail pada panel endpoint.";
    $("#sampleResult").className = "inline-result success";

    if (selectedEndpoint === "example") renderEndpoint();
  } catch (error) {
    $("#sampleResult").textContent =
      `Gagal memuat contoh: ${error.message}`;
    $("#sampleResult").className = "inline-result error";
  }
}

function renderEndpoint() {
  const config = endpointConfig[selectedEndpoint];

  $("#detailMethod").textContent = config.method;
  $("#detailMethod").className =
    `method ${config.method.toLowerCase()}`;

  $("#detailPath").textContent = config.path;
  $("#detailTitle").textContent = config.title;
  $("#detailDescription").textContent = config.description;

  const cached = responseCache[selectedEndpoint];
  $("#responsePreview").textContent = cached
    ? prettyJson(cached)
    : selectedEndpoint === "predict"
      ? "Buka Swagger untuk mengirim request POST /predict."
      : "Klik endpoint ini untuk memuat respons dari server.";

  $("#tryEndpoint").textContent =
    selectedEndpoint === "predict"
      ? "Open prediction tester ↗"
      : "Refresh endpoint response ↗";

  document.querySelectorAll(".endpoint-item").forEach((item) => {
    const isSelected = item.dataset.endpoint === selectedEndpoint;
    item.classList.toggle("selected", isSelected);
    item.setAttribute("aria-pressed", String(isSelected));
  });
}

async function selectEndpoint(name) {
  selectedEndpoint = name;
  renderEndpoint();

  if (name === "predict") return;

  try {
    const data = await fetchJson(endpointConfig[name].url);
    responseCache[name] = data;
    renderEndpoint();
  } catch (error) {
    $("#responsePreview").textContent = JSON.stringify({
      error: "Request gagal",
      detail: error.message
    }, null, 2);
  }
}

document.querySelectorAll(".endpoint-item").forEach((item) => {
  item.addEventListener("click", () => {
    selectEndpoint(item.dataset.endpoint);
  });
});

$("#checkHealth").addEventListener("click", checkHealth);
$("#getSample").addEventListener("click", loadSample);

$("#tryEndpoint").addEventListener("click", async () => {
  if (selectedEndpoint === "predict") {
    window.location.href = "/swagger#/default/predict_predict_post";
    return;
  }

  await selectEndpoint(selectedEndpoint);
});

$("#copyResponse").addEventListener("click", () => {
  copyText($("#responsePreview").textContent);
});

$("#copyExample").addEventListener("click", () => {
  copyText($("#predictionExample").textContent);
});

$("#menuButton").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

document.querySelectorAll(".side-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    $("#sidebar").classList.remove("open");

    document.querySelectorAll(".side-nav a").forEach((item) => {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });
});

async function initializePortal() {
  renderEndpoint();
  await Promise.all([checkHealth(), loadFeatures(), loadSample()]);
  await selectEndpoint("health");
}

initializePortal();


/* Prediction Studio */

let studioSample = null;
let predictionHistory = [];

function friendlyFeatureName(name) {
  return name
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildPredictionForm(features) {
  const form = $("#predictionForm");
  form.replaceChildren();

  for (const [name, value] of Object.entries(features)) {
    const group = document.createElement("div");
    group.className = "field-group";

    const label = document.createElement("label");
    label.htmlFor = `feature-${name}`;
    label.textContent = friendlyFeatureName(name);

    const input = document.createElement("input");
    input.id = `feature-${name}`;
    input.name = name;
    input.dataset.feature = name;
    input.required = true;

    if (typeof value === "number") {
      input.type = "number";
      input.step = "any";
      input.value = String(value);
    } else {
      input.type = "text";
      input.value = value == null ? "" : String(value);
    }

    input.autocomplete = "off";
    input.addEventListener("input", () => {
      input.classList.remove("invalid");
    });

    group.append(label, input);
    form.append(group);
  }
}

async function refreshStudioSample() {
  const button = $("#loadSampleButton");
  button.disabled = true;
  button.textContent = "Loading...";

  try {
    const data = await fetchJson("/example-input");

    if (!data.features || typeof data.features !== "object") {
      throw new Error("Format sample input tidak valid.");
    }

    studioSample = data.features;
    buildPredictionForm(studioSample);
    showToast("Sample input berhasil dimuat.");
  } catch (error) {
    showToast(`Gagal memuat sample: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = "Load sample";
  }
}

function collectPredictionInput() {
  const inputs = [
    ...document.querySelectorAll("#predictionForm input[data-feature]")
  ];

  const payload = {};
  const invalidInputs = [];

  for (const input of inputs) {
    const raw = input.value.trim();
    const name = input.dataset.feature;

    if (raw === "") {
      input.classList.add("invalid");
      invalidInputs.push(name);
      continue;
    }

    if (input.type === "number") {
      const number = Number(raw);

      if (!Number.isFinite(number)) {
        input.classList.add("invalid");
        invalidInputs.push(name);
        continue;
      }

      payload[name] = number;
    } else {
      payload[name] = raw;
    }
  }

  if (invalidInputs.length > 0) {
    throw new Error(
      `Lengkapi atau perbaiki input: ${invalidInputs.join(", ")}`
    );
  }

  return payload;
}

async function runPrediction() {
  const button = $("#predictButton");
  const buttonText = $("#predictButtonText");
  const empty = $("#predictionEmpty");
  const output = $("#predictionOutput");
  const errorBox = $("#predictionError");

  errorBox.hidden = true;
  button.disabled = true;
  buttonText.textContent = "Predicting...";
  button.setAttribute("aria-busy", "true");

  try {
    const payload = collectPredictionInput();
    const startedAt = performance.now();

    const response = await fetch("/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const duration = performance.now() - startedAt;
    const result = await response.json();

    if (!response.ok) {
      const detail = typeof result.detail === "string"
        ? result.detail
        : JSON.stringify(result.detail ?? result);

      throw new Error(`HTTP ${response.status}: ${detail}`);
    }

    if (typeof result.prediction !== "number" ||
        !Number.isFinite(result.prediction)) {
      throw new Error("Respons API tidak berisi nilai prediksi numerik.");
    }

    empty.hidden = true;
    output.hidden = false;

    $("#predictionValue").textContent =
      result.prediction.toLocaleString("id-ID", {
        maximumFractionDigits: 2
      });

    $("#resultModel").textContent =
      result.model || "linear_regression_v1";

    $("#predictionDuration").textContent = `${duration.toFixed(0)} ms`;

    $("#predictionMessage").textContent =
      "Prediksi berhasil. Gunakan hasil ini sebagai estimasi model, bukan keputusan otomatis.";

    predictionHistory.unshift({
      timestamp: new Date().toLocaleString("id-ID"),
      prediction: result.prediction,
      durationMs: Math.round(duration)
    });

    predictionHistory = predictionHistory.slice(0, 10);
    showToast("Prediksi berhasil dijalankan.");
  } catch (error) {
    errorBox.hidden = false;
    errorBox.textContent = error.message;
    showToast("Prediksi gagal. Periksa input atau status API.");
  } finally {
    button.disabled = false;
    buttonText.textContent = "Run prediction →";
    button.removeAttribute("aria-busy");
  }
}

$("#loadSampleButton").addEventListener("click", refreshStudioSample);
$("#predictButton").addEventListener("click", runPrediction);

$("#resetPrediction").addEventListener("click", () => {
  if (studioSample) {
    buildPredictionForm(studioSample);
  }

  $("#predictionEmpty").hidden = false;
  $("#predictionOutput").hidden = true;
  $("#predictionError").hidden = true;
  showToast("Form dikembalikan ke sample input.");
});

refreshStudioSample();

