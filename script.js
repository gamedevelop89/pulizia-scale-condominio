const SUPABASE_URL = "https://eckjobbhqlvgyojbdrig.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVja2pvYmJocWx2Z3lvamJkcmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzODAyMDksImV4cCI6MjA4OTk1NjIwOX0.iIbBQa8ecMIssL7UFHFhkS6jtg7DZax7QPw83Kx_JSM";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
const refreshBtn = document.getElementById("refreshBtn");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const cancelBtn = document.getElementById("cancelBtn");

let currentMonth = new Date();
currentMonth.setDate(1);

let assignments = [];
let selectedWeekStart = null;

function isMobile() {
  return window.innerWidth <= 900;
}

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

function getCurrentWeekStart() {
  return formatDateISO(startOfWeekSunday(new Date()));
}

function getDefaultFamilyId() {
  return Object.keys(families)[0];
}

function getAssignmentByWeek(weekStart) {
  return assignments.find(item => item.week_start === weekStart);
}

function populateFamilySelect() {
  if (!familySelectEl) return;

  familySelectEl.innerHTML = "";

  Object.entries(families).forEach(([id, label]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = label;
    familySelectEl.appendChild(option);
  });
}

async function fetchAssignments() {
  const { data, error } = await db
    .from(TABLE_NAME)
    .select("week_start, family_id, completed, note")
    .order("week_start", { ascending: true });

  if (error) throw error;

  assignments = data || [];
}

async function upsertAssignment(data) {
  const payload = {
    week_start: data.week_start,
    family_id: data.family_id,
    completed: Boolean(data.completed),
    note: data.note ?? null
  };

  const { error } = await db
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: "week_start" });

  if (error) throw error;
}

async function deleteAssignment(weekStart) {
  const { error } = await db
    .from(TABLE_NAME)
    .delete()
    .eq("week_start", weekStart);

  if (error) throw error;
}

function openModal(weekStart) {
  selectedWeekStart = weekStart;

  const assignment = getAssignmentByWeek(weekStart);
  const weekStartDate = new Date(weekStart);
  const weekEndDate = addDays(weekStartDate, 7);

  modalTitleEl.textContent = `Settimana ${formatDisplayDate(weekStartDate)} → ${formatDisplayDate(weekEndDate)}`;
  familySelectEl.value = assignment?.family_id || getDefaultFamilyId();
  noteInputEl.value = assignment?.note || "";
  completedInputEl.checked = Boolean(assignment?.completed);

  modalEl.classList.remove("hidden");
}

function closeModal() {
  modalEl.classList.add("hidden");
  selectedWeekStart = null;
}

function createDayHeader(day) {
  const dayEl = document.createElement("div");
  dayEl.className = "day-name";
  dayEl.textContent = day;
  return dayEl;
}

function createWeekBadge() {
  const badge = document.createElement("div");
  badge.className = "week-badge";
  badge.textContent = "Settimana";
  return badge;
}

function createFamilyBox(familyId) {
  const familyBox = document.createElement("div");
  familyBox.className = "family-box";
  familyBox.innerHTML = `<strong>${families[familyId] || familyId}</strong>`;
  return familyBox;
}

function createStatus(completed) {
  const status = document.createElement("div");
  status.className = `status ${completed ? "done" : "planned"}`;
  status.textContent = completed ? "Fatto" : "In programma";
  return status;
}

function createEmptyBox() {
  const emptyBox = document.createElement("div");
  emptyBox.className = "empty-box";
  emptyBox.textContent = "Tocca per assegnare questa settimana";
  return emptyBox;
}

function renderCalendar() {
  calendarEl.innerHTML = "";
  monthTitleEl.textContent = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  dayNames.forEach(day => {
    calendarEl.appendChild(createDayHeader(day));
  });

  const days = buildMonthGrid(currentMonth);
  const currentWeekStart = getCurrentWeekStart();

  days.forEach(date => {
    const weekStart = formatDateISO(startOfWeekSunday(date));
    const assignment = getAssignmentByWeek(weekStart);
    const isSunday = date.getDay() === 0;
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
    const isCurrentWeek = weekStart === currentWeekStart;

    const cell = document.createElement("div");
    cell.className = "week-cell";

    if (!isCurrentMonth) {
      cell.style.opacity = "0.45";
    }

    if (isSunday) {
      cell.classList.add("clickable");
      cell.dataset.weekStart = weekStart;

      if (isCurrentWeek) {
        cell.style.borderColor = "rgba(103, 232, 249, 0.55)";
        cell.style.boxShadow = "0 0 0 1px rgba(103, 232, 249, 0.18) inset";
      }
    }

    const dateEl = document.createElement("div");
    dateEl.className = "week-date";
    dateEl.textContent = `${dayNames[date.getDay()]} ${date.getDate()}`;
    cell.appendChild(dateEl);

    if (isSunday) {
      cell.appendChild(createWeekBadge());
    }

    if (assignment) {
      cell.appendChild(createFamilyBox(assignment.family_id));

      if (isSunday) {
        cell.appendChild(createStatus(Boolean(assignment.completed)));
      }
    } else if (isSunday) {
      cell.appendChild(createEmptyBox());
    }

    if (isSunday) {
      cell.addEventListener("click", () => openModal(weekStart));
    }

    calendarEl.appendChild(cell);
  });
}

function focusCurrentWeekOnMobile() {
  if (!isMobile()) return;

  const currentWeekStart = getCurrentWeekStart();
  let attempts = 0;

  const tryScroll = () => {
    const target = document.querySelector(
      `.week-cell.clickable[data-week-start="${currentWeekStart}"]`
    );

    if (target) {
      const top = target.getBoundingClientRect().top + window.pageYOffset - 12;

      window.scrollTo({
        top: Math.max(top, 0),
        behavior: "smooth"
      });

      return;
    }

    attempts += 1;
    if (attempts < 12) {
      requestAnimationFrame(tryScroll);
    }
  };

  setTimeout(() => {
    requestAnimationFrame(tryScroll);
  }, 120);
}

function goToToday() {
  currentMonth = new Date();
  currentMonth.setDate(1);
  renderCalendar();
  focusCurrentWeekOnMobile();
}

prevMonthBtn.addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  renderCalendar();
});

todayBtn.addEventListener("click", goToToday);

refreshBtn.addEventListener("click", () => {
  window.location.reload();
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
    alert("Errore durante il salvataggio: " + (error.message || JSON.stringify(error)));
    console.error(error);
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
    alert("Errore durante la rimozione: " + (error.message || JSON.stringify(error)));
    console.error(error);
  } finally {
    deleteBtn.disabled = false;
  }
});

window.addEventListener("click", (event) => {
  if (event.target === modalEl) {
    closeModal();
  }
});

window.addEventListener("resize", () => {
  renderCalendar();
});

async function init() {
  try {
    populateFamilySelect();
    await fetchAssignments();
    renderCalendar();
  } catch (error) {
    alert("Errore iniziale: " + (error.message || JSON.stringify(error)));
    console.error(error);
  }
}

init();
