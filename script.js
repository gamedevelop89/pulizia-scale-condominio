const SUPABASE_URL = "https://eckjobbhqlvgyojbdrig.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vUi_Npe0fuXNkiW_XkScNg_Uy4URAnU";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const TABLE_NAME = "stair_assignments";

const families = {
  gatti: "App.to Gatti",
  giuliani: "App.to Giuliani",
  mancina: "App.to Mancina",
  vadacca: "App.to Vadacca"
};

const monthNames = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const weeksListEl = document.getElementById("weeksList");
const monthTitleEl = document.getElementById("monthTitle");
const familiesListEl = document.getElementById("familiesList");
const assignedCountEl = document.getElementById("assignedCount");
const completedCountEl = document.getElementById("completedCount");
const unassignedCountEl = document.getElementById("unassignedCount");
const lastUpdatedEl = document.getElementById("lastUpdated");
const connectionStateEl = document.getElementById("connectionState");
const toastEl = document.getElementById("toast");

const modalEl = document.getElementById("modal");
const modalTitleEl = document.getElementById("modalTitle");
const modalRangeEl = document.getElementById("modalRange");
const familySelectEl = document.getElementById("familySelect");
const noteInputEl = document.getElementById("noteInput");
const completedInputEl = document.getElementById("completedInput");

const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const todayBtn = document.getElementById("todayBtn");
const refreshBtn = document.getElementById("refreshBtn");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const cancelBtn = document.getElementById("cancelBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const editCurrentWeekBtn = document.getElementById("editCurrentWeekBtn");
const editNextWeekBtn = document.getElementById("editNextWeekBtn");

let currentMonth = new Date();
currentMonth.setDate(1);
let assignments = [];
let selectedWeekStart = null;

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseLocalDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function startOfWeekSunday(date) {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatShortDate(date) {
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function formatLongDate(date) {
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

function formatWeekRange(weekStart) {
  const start = parseLocalDate(weekStart);
  const end = addDays(start, 7);
  return `${formatLongDate(start)} → ${formatLongDate(end)}`;
}

function getAssignmentByWeek(weekStart) {
  return assignments.find(item => item.week_start === weekStart);
}

function getMonthWeeks(monthDate) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12);
  const lastOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 12);
  const start = startOfWeekSunday(firstOfMonth);
  const end = startOfWeekSunday(lastOfMonth);
  const weeks = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 7)) {
    weeks.push(formatDateISO(cursor));
  }
  return weeks;
}

function getCurrentWeekStart() {
  return formatDateISO(startOfWeekSunday(new Date()));
}

function setConnectionState(type, text) {
  connectionStateEl.className = `connection-state ${type}`;
  connectionStateEl.innerHTML = `<span class="connection-dot"></span><span>${text}</span>`;
}

function showToast(message, type = "success") {
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;
  setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2600);
}

function populateFamilySelect() {
  familySelectEl.innerHTML = "";
  Object.entries(families).forEach(([id, label]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = label;
    familySelectEl.appendChild(option);
  });
}

function renderFamilies() {
  familiesListEl.innerHTML = "";
  Object.entries(families).forEach(([id, label], index) => {
    const item = document.createElement("div");
    item.className = "family-row";
    item.innerHTML = `<span class="family-avatar">${index + 1}</span><span>${label}</span>`;
    familiesListEl.appendChild(item);
  });
}

async function fetchAssignments() {
  setConnectionState("loading", "Sincronizzazione…");
  const { data, error } = await db
    .from(TABLE_NAME)
    .select("week_start, family_id, completed, note")
    .order("week_start", { ascending: true });

  if (error) {
    setConnectionState("error", "Errore connessione");
    throw error;
  }

  assignments = data || [];
  setConnectionState("online", "Connesso");
  lastUpdatedEl.textContent = `Aggiornato ${new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
}

async function upsertAssignment(payload) {
  const { error } = await db
    .from(TABLE_NAME)
    .upsert({
      week_start: payload.week_start,
      family_id: payload.family_id,
      completed: Boolean(payload.completed),
      note: payload.note || null,
      updated_at: new Date().toISOString()
    }, { onConflict: "week_start" });

  if (error) throw error;
}

async function deleteAssignment(weekStart) {
  const { error } = await db.from(TABLE_NAME).delete().eq("week_start", weekStart);
  if (error) throw error;
}

function getStatusMeta(assignment) {
  if (!assignment) return { text: "Da assegnare", className: "empty" };
  if (assignment.completed) return { text: "Completato", className: "done" };
  return { text: "In programma", className: "planned" };
}

function renderOverviewCard(prefix, weekStart) {
  const assignment = getAssignmentByWeek(weekStart);
  const status = getStatusMeta(assignment);
  const familyEl = document.getElementById(`${prefix}WeekFamily`);
  const rangeEl = document.getElementById(`${prefix}WeekRange`);
  const noteEl = document.getElementById(`${prefix}WeekNote`);
  const statusEl = document.getElementById(`${prefix}WeekStatus`);
  const cardEl = document.getElementById(`${prefix}WeekCard`);
  const editBtn = document.getElementById(`edit${prefix[0].toUpperCase() + prefix.slice(1)}WeekBtn`);

  rangeEl.textContent = formatWeekRange(weekStart);
  familyEl.textContent = assignment ? (families[assignment.family_id] || assignment.family_id) : "Nessun turno assegnato";
  noteEl.textContent = assignment?.note || (assignment ? "Nessuna nota per questo turno." : "Apri la settimana per scegliere il condomino incaricato.");
  statusEl.textContent = status.text;
  statusEl.className = `status-badge ${status.className}`;
  cardEl.classList.remove("loading-card");
  editBtn.disabled = false;
  editBtn.onclick = () => openModal(weekStart);
}

function renderOverview() {
  const currentWeekStart = getCurrentWeekStart();
  const nextWeekStart = formatDateISO(addDays(parseLocalDate(currentWeekStart), 7));
  renderOverviewCard("current", currentWeekStart);
  renderOverviewCard("next", nextWeekStart);
}

function createWeekItem(weekStart) {
  const assignment = getAssignmentByWeek(weekStart);
  const start = parseLocalDate(weekStart);
  const end = addDays(start, 7);
  const status = getStatusMeta(assignment);
  const isCurrent = weekStart === getCurrentWeekStart();

  const button = document.createElement("button");
  button.type = "button";
  button.className = `week-row${isCurrent ? " current" : ""}`;
  button.innerHTML = `
    <div class="week-dates">
      <span class="week-day">DOM</span>
      <strong>${pad(start.getDate())}</strong>
      <span>${formatShortDate(start)} → ${formatShortDate(end)}</span>
    </div>
    <div class="week-main">
      <span class="week-family">${assignment ? (families[assignment.family_id] || assignment.family_id) : "Da assegnare"}</span>
      <span class="week-note">${assignment?.note || (isCurrent ? "Settimana corrente" : "Nessuna nota")}</span>
    </div>
    <span class="status-badge ${status.className}">${status.text}</span>
    <span class="row-arrow">›</span>
  `;
  button.addEventListener("click", () => openModal(weekStart));
  return button;
}

function renderMonthWeeks() {
  monthTitleEl.textContent = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  weeksListEl.innerHTML = "";

  const monthWeeks = getMonthWeeks(currentMonth);
  monthWeeks.forEach(weekStart => weeksListEl.appendChild(createWeekItem(weekStart)));

  const monthAssignments = monthWeeks.map(week => getAssignmentByWeek(week));
  assignedCountEl.textContent = monthAssignments.filter(Boolean).length;
  completedCountEl.textContent = monthAssignments.filter(item => item?.completed).length;
  unassignedCountEl.textContent = monthAssignments.filter(item => !item).length;
}

function renderAll() {
  renderOverview();
  renderMonthWeeks();
}

function openModal(weekStart) {
  selectedWeekStart = weekStart;
  const assignment = getAssignmentByWeek(weekStart);
  const start = parseLocalDate(weekStart);

  modalTitleEl.textContent = `Settimana del ${formatShortDate(start)}`;
  modalRangeEl.textContent = formatWeekRange(weekStart);
  familySelectEl.value = assignment?.family_id || Object.keys(families)[0];
  noteInputEl.value = assignment?.note || "";
  completedInputEl.checked = Boolean(assignment?.completed);
  deleteBtn.style.visibility = assignment ? "visible" : "hidden";

  modalEl.classList.remove("hidden");
  document.body.classList.add("modal-open");
  setTimeout(() => familySelectEl.focus(), 40);
}

function closeModal() {
  modalEl.classList.add("hidden");
  document.body.classList.remove("modal-open");
  selectedWeekStart = null;
}

async function refreshAndRender(showSuccess = false) {
  try {
    await fetchAssignments();
    renderAll();
    if (showSuccess) showToast("Calendario aggiornato");
  } catch (error) {
    console.error(error);
    showToast(`Errore: ${error.message || "impossibile caricare i dati"}`, "error");
  }
}

prevMonthBtn.addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1, 12);
  renderMonthWeeks();
});

nextMonthBtn.addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1, 12);
  renderMonthWeeks();
});

todayBtn.addEventListener("click", () => {
  currentMonth = new Date();
  currentMonth.setDate(1);
  renderMonthWeeks();
  document.getElementById("currentWeekCard").scrollIntoView({ behavior: "smooth", block: "start" });
});

refreshBtn.addEventListener("click", () => refreshAndRender(true));
cancelBtn.addEventListener("click", closeModal);
closeModalBtn.addEventListener("click", closeModal);

modalEl.addEventListener("click", event => {
  if (event.target.dataset.closeModal === "true") closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !modalEl.classList.contains("hidden")) closeModal();
});

saveBtn.addEventListener("click", async () => {
  if (!selectedWeekStart) return;
  try {
    saveBtn.disabled = true;
    await upsertAssignment({
      week_start: selectedWeekStart,
      family_id: familySelectEl.value,
      completed: completedInputEl.checked,
      note: noteInputEl.value.trim()
    });
    await refreshAndRender();
    closeModal();
    showToast("Turno salvato");
  } catch (error) {
    console.error(error);
    showToast(`Errore nel salvataggio: ${error.message || "operazione non riuscita"}`, "error");
  } finally {
    saveBtn.disabled = false;
  }
});

deleteBtn.addEventListener("click", async () => {
  if (!selectedWeekStart) return;
  const confirmed = window.confirm("Vuoi rimuovere il turno di questa settimana?");
  if (!confirmed) return;

  try {
    deleteBtn.disabled = true;
    await deleteAssignment(selectedWeekStart);
    await refreshAndRender();
    closeModal();
    showToast("Turno rimosso");
  } catch (error) {
    console.error(error);
    showToast(`Errore nella rimozione: ${error.message || "operazione non riuscita"}`, "error");
  } finally {
    deleteBtn.disabled = false;
  }
});

async function init() {
  populateFamilySelect();
  renderFamilies();
  await refreshAndRender();
}

init();
