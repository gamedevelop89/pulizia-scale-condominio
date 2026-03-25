const SUPABASE_URL = "eckjobbhqlvgyojbdrig.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVja2pvYmJocWx2Z3lvamJkcmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzODAyMDksImV4cCI6MjA4OTk1NjIwOX0.iIbBQa8ecMIssL7UFHFhkS6jtg7DZax7QPw83Kx_JSM";

const TABLE_NAME = "stair_assignments";

const families = {
  gatti: "App.to Gatti",
  giuliani: "App.to Giuliani",
  mancina: "App.to Mancina",
  vadacca: "App.to Vadacca"
};

const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const monthNames = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const calendarEl = document.getElementById("calendar");
const monthTitleEl = document.getElementById("monthTitle");
const modalEl = document.getElementById("modal");
const modalTitleEl = document.getElementById("modalTitle");
const familySelectEl = document.getElementById("familySelect");
const noteInputEl = document.getElementById("noteInput");
const completedInputEl = document.getElementById("completedInput");

const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const todayBtn = document.getElementById("todayBtn");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const cancelBtn = document.getElementById("cancelBtn");

let currentMonth = new Date();
currentMonth.setDate(1);

let assignments = [];
let selectedWeekStart = null;

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeekSunday(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDisplayDate(date) {
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function buildMonthGrid(monthDate) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = startOfWeekSunday(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function getAssignmentByWeek(weekStart) {
  return assignments.find(item => item.week_start === weekStart);
}

async function fetchAssignments() {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=week_start,family_id,completed,note&order=week_start.asc`;

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error("Errore nel caricamento dei dati da Supabase");
  }

  assignments = await response.json();
}

async function upsertAssignment(data) {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify([data])
  });

  if (!response.ok) {
    throw new Error("Errore durante il salvataggio");
  }
}

async function deleteAssignment(weekStart) {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?week_start=eq.${weekStart}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error("Errore durante la rimozione");
  }
}

function openModal(weekStart) {
  selectedWeekStart = weekStart;
  const assignment = getAssignmentByWeek(weekStart);
  const weekEnd = formatDateISO(addDays(new Date(weekStart), 7));

  modalTitleEl.textContent = `Settimana ${formatDisplayDate(new Date(weekStart))} → ${formatDisplayDate(new Date(weekEnd))}`;

  familySelectEl.value = assignment?.family_id || "gatti";
  noteInputEl.value = assignment?.note || "";
  completedInputEl.checked = Boolean(assignment?.completed);

  modalEl.classList.remove("hidden");
}

function closeModal() {
  modalEl.classList.add("hidden");
  selectedWeekStart = null;
}

function renderCalendar() {
  calendarEl.innerHTML = "";

  monthTitleEl.textContent = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  dayNames.forEach(day => {
    const dayEl = document.createElement("div");
    dayEl.className = "day-name";
    dayEl.textContent = day;
    calendarEl.appendChild(dayEl);
  });

  const days = buildMonthGrid(currentMonth);

  days.forEach(date => {
    const weekStart = formatDateISO(startOfWeekSunday(date));
    const assignment = getAssignmentByWeek(weekStart);
    const isSunday = date.getDay() === 0;
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

    const cell = document.createElement("div");
    cell.className = "week-cell";

    if (!isCurrentMonth) {
      cell.style.opacity = "0.45";
    }

    if (isSunday) {
      cell.classList.add("clickable");
    }

    const dateEl = document.createElement("div");
    dateEl.className = "week-date";
    dateEl.textContent = `${dayNames[date.getDay()]} ${date.getDate()}`;
    cell.appendChild(dateEl);

    if (isSunday) {
      const badge = document.createElement("div");
      badge.className = "week-badge";
      badge.textContent = "Settimana";
      cell.appendChild(badge);

      if (assignment) {
        const familyBox = document.createElement("div");
        familyBox.className = "family-box";
        familyBox.innerHTML = `<strong>${families[assignment.family_id] || assignment.family_id}</strong>`;
        cell.appendChild(familyBox);

        const status = document.createElement("div");
        status.className = `status ${assignment.completed ? "done" : "planned"}`;
        status.textContent = assignment.completed ? "Fatto" : "In programma";
        cell.appendChild(status);
      } else {
        const emptyBox = document.createElement("div");
        emptyBox.className = "empty-box";
        emptyBox.textContent = "Tocca per assegnare questa settimana";
        cell.appendChild(emptyBox);
      }

      cell.addEventListener("click", () => openModal(weekStart));
    }

    calendarEl.appendChild(cell);
  });
}

prevMonthBtn.addEventListener("click", async () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthBtn.addEventListener("click", async () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  renderCalendar();
});

todayBtn.addEventListener("click", () => {
  currentMonth = new Date();
  currentMonth.setDate(1);
  renderCalendar();
});

cancelBtn.addEventListener("click", closeModal);

saveBtn.addEventListener("click", async () => {
  if (!selectedWeekStart) return;

  try {
    saveBtn.disabled = true;

    await upsertAssignment({
      week_start: selectedWeekStart,
      family_id: familySelectEl.value,
      completed: completedInputEl.checked,
      note: noteInputEl.value.trim() || null
    });

    await fetchAssignments();
    renderCalendar();
    closeModal();
  } catch (error) {
    alert(error.message);
  } finally {
    saveBtn.disabled = false;
  }
});

deleteBtn.addEventListener("click", async () => {
  if (!selectedWeekStart) return;

  try {
    deleteBtn.disabled = true;

    await deleteAssignment(selectedWeekStart);

    await fetchAssignments();
    renderCalendar();
    closeModal();
  } catch (error) {
    alert(error.message);
  } finally {
    deleteBtn.disabled = false;
  }
});

window.addEventListener("click", (event) => {
  if (event.target === modalEl) {
    closeModal();
  }
});

async function init() {
  try {
    await fetchAssignments();
    renderCalendar();
  } catch (error) {
    alert("Controlla Project URL e anon key di Supabase nel file script.js");
    console.error(error);
  }
}

init();
