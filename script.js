const doctorView = document.querySelector("#doctorView");
const screenView = document.querySelector("#screenView");

const form = document.querySelector("#appointmentForm");
const nameInput = document.querySelector("#patientName");
const idInput = document.querySelector("#patientId");
const roomInput = document.querySelector("#roomNumber");
const reasonInput = document.querySelector("#reason");
const voiceInput = document.querySelector("#voiceEnabled");

let tvWindow = null;
let toastTimer = null;

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem("medicalHistory")) || [];
    } catch {
        return [];
    }
}

function saveHistory(history) {
    localStorage.setItem("medicalHistory", JSON.stringify(history));
}

function getCurrentPatient() {
    try {
        return JSON.parse(localStorage.getItem("currentPatient")) || null;
    } catch {
        return null;
    }
}

function saveCurrentPatient(patient) {
    localStorage.setItem("currentPatient", JSON.stringify(patient));
}

function getTime() {
    return new Intl.DateTimeFormat("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    }).format(new Date());
}

function showToast(message) {
    const toast = document.querySelector("#toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

function speakPatient(patient) {
    if (!("speechSynthesis" in window) || !patient.voice) {
        return;
    }

    speechSynthesis.cancel();

    const message = new SpeechSynthesisUtterance(
        `Atención, ${patient.name}. Por favor dirigirse al consultorio número ${patient.room}.`
    );

    message.lang = "es-CO";
    message.rate = 0.85;
    message.pitch = 1;

    speechSynthesis.speak(message);
}

function renderHistory() {
    const list = document.querySelector("#historyList");
    const history = getHistory();

    if (history.length === 0) {
        list.innerHTML =
            '<p class="empty-message">Aún no hay pacientes llamados.</p>';
        return;
    }

    list.innerHTML = history
        .slice(0, 12)
        .map((patient, index) => `
      <article class="history-row">
        <span class="history-number">${history.length - index}</span>

        <div>
          <div class="history-name">${patient.name}</div>
          <div class="history-meta">
            C.C. ${patient.id} · ${patient.reason} · Consultorio ${patient.room}
          </div>
        </div>

        <time class="history-time">${patient.time}</time>
      </article>
    `)
        .join("");
}

function renderTVHistory() {
    const list = document.querySelector("#tvHistoryList");

    if (!list) {
        return;
    }

    const history = getHistory();

    if (history.length === 0) {
        list.innerHTML = "<p>Aún no hay llamados.</p>";
        return;
    }

    list.innerHTML = history
        .slice(0, 4)
        .map((patient) => `
      <div class="tv-history-row">
        <div>
          <strong>${patient.name}</strong>
          <br>
          <span>${patient.reason} · Consultorio ${patient.room}</span>
        </div>

        <span>${patient.time}</span>
      </div>
    `)
        .join("");
}

function flashTV() {
    screenView.classList.remove("call-flash");

    void screenView.offsetWidth;

    screenView.classList.add("call-flash");
}

function renderTV(patient, animate = false) {
    const status = document.querySelector("#tvStatus");
    const name = document.querySelector("#tvName");
    const reason = document.querySelector("#tvReason");
    const room = document.querySelector("#tvRoom");

    if (!patient) {
        status.textContent = "BIENVENIDOS";
        name.textContent = "Espere su llamado";
        reason.textContent =
            "Nuestro equipo le avisará cuando sea su turno.";
        room.innerHTML = "CONSULTORIO <strong>—</strong>";
        renderTVHistory();
        return;
    }

    status.textContent = "ES TU TURNO";
    name.textContent = patient.name;
    reason.textContent = `Dirígete a ${patient.reason}.`;
    room.innerHTML = `CONSULTORIO <strong>${patient.room}</strong>`;

    renderTVHistory();

    if (animate) {
        flashTV();
    }
}

function updatePreview() {
    document.querySelector("#previewName").textContent =
        nameInput.value.trim() || "Nombre del paciente";

    document.querySelector("#previewReason").textContent =
        reasonInput.value.toUpperCase();

    document.querySelector("#previewRoom").textContent =
        `CONSULTORIO ${roomInput.value}`;
}

function setTheme(theme) {
    const isLight = theme === "light";

    document.body.classList.toggle("light", isLight);

    document.querySelector("#themeButton").textContent =
        isLight ? "☾ Modo oscuro" : "☼ Modo claro";

    localStorage.setItem("medicalTheme", theme);
}

function showHistory() {
    document.querySelector("#historySection").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const patientName = nameInput.value.trim();
    const patientId = idInput.value.trim();

    if (patientName.length < 3) {
        showToast("Escribe el nombre completo del paciente.");
        nameInput.focus();
        return;
    }

    if (patientId.length < 5) {
        showToast("Escribe una cédula válida.");
        idInput.focus();
        return;
    }

    const patient = {
        name: patientName,
        id: patientId,
        room: roomInput.value,
        reason: reasonInput.value,
        voice: voiceInput.checked,
        time: getTime()
    };

    const history = getHistory();

    history.unshift(patient);

    saveHistory(history);
    saveCurrentPatient(patient);

    renderHistory();

    if (tvWindow && !tvWindow.closed) {
        tvWindow.postMessage(
            {
                type: "CALL_PATIENT",
                patient
            },
            "*"
        );
    } else {
        speakPatient(patient);
    }

    showToast(
        `${patient.name} fue llamado al consultorio ${patient.room}.`
    );

    nameInput.value = "";
    idInput.value = "";
    updatePreview();
});

nameInput.addEventListener("input", updatePreview);
roomInput.addEventListener("change", updatePreview);
reasonInput.addEventListener("change", updatePreview);

document.querySelector("#historyButton").addEventListener("click", showHistory);

document.querySelector("#doctorButton").addEventListener("click", () => {
    document.querySelector("#doctorSection").scrollIntoView({
        behavior: "smooth"
    });
});

document.querySelector("#themeButton").addEventListener("click", () => {
    const isLight = document.body.classList.contains("light");

    setTheme(isLight ? "dark" : "light");
});

document.querySelector("#soundButton").addEventListener("click", () => {
    speakPatient({
        name: "Paciente de prueba",
        room: roomInput.value,
        voice: true
    });

    showToast("Reproduciendo prueba de audio.");
});

document.querySelector("#screenButton").addEventListener("click", () => {
    const url = `${location.href.split("?")[0]}?pantalla=tv`;

    tvWindow = window.open(url, "pantallaSala");

    if (!tvWindow) {
        showToast("Permite las ventanas emergentes para abrir la pantalla.");
    }
});

document.querySelector("#clearHistory").addEventListener("click", () => {
    localStorage.removeItem("medicalHistory");
    renderHistory();

    if (tvWindow && !tvWindow.closed) {
        tvWindow.postMessage(
            {
                type: "UPDATE_HISTORY"
            },
            "*"
        );
    }

    showToast("Historial eliminado.");
});

window.addEventListener("message", (event) => {
    if (event.data?.type === "CALL_PATIENT") {
        renderTV(event.data.patient, true);
        speakPatient(event.data.patient);
    }

    if (event.data?.type === "UPDATE_HISTORY") {
        renderTVHistory();
    }
});

window.addEventListener("storage", (event) => {
    if (event.key === "currentPatient") {
        renderTV(getCurrentPatient(), true);
    }

    if (event.key === "medicalHistory") {
        renderTVHistory();
    }
});

if (new URLSearchParams(location.search).get("pantalla") === "tv") {
    doctorView.hidden = true;
    screenView.hidden = false;

    renderTV(getCurrentPatient());
    renderTVHistory();
} else {
    setTheme(localStorage.getItem("medicalTheme") || "dark");
    renderHistory();
    updatePreview();
}

setInterval(() => {
    const clock = document.querySelector("#tvClock");

    if (clock) {
        clock.textContent = getTime();
    }
}, 1000);