// One LocalStorage-backed task list powers the dashboard, task list, and calendar.
const STORAGE_KEY = "studyflow-tasks-v1";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toDateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

// Fresh installations get a few example assignments; returning users keep their own list.
const sampleTasks = [
  {
    id: "sample-bio",
    title: "Read chapter 4: Cell Biology",
    subject: "Biology",
    dueDate: dateOffset(1),
    priority: "high",
    completed: false,
  },
  {
    id: "sample-history",
    title: "Outline the Renaissance essay",
    subject: "History",
    dueDate: dateOffset(2),
    priority: "medium",
    completed: false,
  },
  {
    id: "sample-stats",
    title: "Finish problem set 6",
    subject: "Statistics",
    dueDate: dateOffset(3),
    priority: "high",
    completed: false,
  },
  {
    id: "sample-lit",
    title: "Review poetry lecture notes",
    subject: "Literature",
    dueDate: dateOffset(-1),
    priority: "low",
    completed: true,
  },
  {
    id: "sample-chem",
    title: "Lab report: reaction rates",
    subject: "Chemistry",
    dueDate: dateOffset(5),
    priority: "medium",
    completed: false,
  },
];

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleTasks));
      return [...sampleTasks];
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [...sampleTasks];
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    return [...sampleTasks];
  }
}

let tasks = loadTasks();
let activeFilter = "all";
let currentView = "dashboard";
let calendarMonth = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1,
);
let selectedCalendarDate = toDateInputValue(new Date());
let toastTimer;
const elements = {
  modal: document.querySelector("#task-modal"),
  form: document.querySelector("#task-form"),
  title: document.querySelector("#task-title"),
  subject: document.querySelector("#task-subject"),
  dueDate: document.querySelector("#task-due-date"),
  priority: document.querySelector("#task-priority"),
  id: document.querySelector("#task-id"),
  error: document.querySelector("#form-error"),
  toast: document.querySelector("#toast"),
  toastMessage: document.querySelector("#toast-message"),
  sidebar: document.querySelector("#sidebar"),
};
const checkIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4L19 7"/></svg>';
const editIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.4-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5.4 16 4 20Z"/></svg>';
const deleteIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9 7V4.5h6V7m-8.5 0 1 13h9l1-13M10 10.5v6m4-6v6"/></svg>';

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    showToast("Your browser could not save this change.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value, options = { month: "short", day: "numeric" }) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, options).format(
    new Date(year, month - 1, day),
  );
}

function getDateLabel(value) {
  const today = toDateInputValue(new Date());
  if (value === today) return "Today";
  if (value === dateOffset(1)) return "Tomorrow";
  const [year, month, day] = value.split("-").map(Number);
  const dueDate = new Date(year, month - 1, day);
  const daysAway = Math.round(
    (dueDate - new Date(new Date().setHours(0, 0, 0, 0))) / DAY_IN_MS,
  );
  return daysAway < 0 ? `${formatDate(value)} · overdue` : formatDate(value);
}

function getVisibleTasks() {
  const searchId =
    currentView === "tasks" ? "#all-task-search" : "#task-search";
  const search = document
    .querySelector(searchId)
    .value.trim()
    .toLocaleLowerCase();
  return tasks
    .filter((task) => {
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "completed" ? task.completed : !task.completed);
      return (
        matchesFilter &&
        `${task.title} ${task.subject}`.toLocaleLowerCase().includes(search)
      );
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

// Build task rows from text-safe HTML so user-entered text stays plain text.
function renderTaskRow(task, fullSize = false) {
  const overdue =
    !task.completed && task.dueDate < toDateInputValue(new Date());
  const row = document.createElement("article");
  row.className = `task-row${task.completed ? " is-completed" : ""}`;
  row.innerHTML = `<button class="task-check${task.completed ? " is-done" : ""}" type="button" aria-label="${task.completed ? "Mark incomplete" : "Mark complete"}: ${escapeHTML(task.title)}" aria-pressed="${task.completed}" data-action="toggle" data-id="${escapeHTML(task.id)}">${checkIcon}</button><div class="task-main"><p class="task-title" title="${escapeHTML(task.title)}">${escapeHTML(task.title)}</p><div class="task-meta"><i class="subject-dot" aria-hidden="true"></i>${escapeHTML(task.subject)}</div></div><span class="priority-badge priority-${task.priority}">${capitalize(task.priority)}</span><time class="task-due${overdue ? " is-overdue" : ""}" datetime="${escapeHTML(task.dueDate)}">${getDateLabel(task.dueDate)}</time>${fullSize ? `<div class="task-actions"><button class="row-action" type="button" aria-label="Edit ${escapeHTML(task.title)}" data-action="edit" data-id="${escapeHTML(task.id)}">${editIcon}</button><button class="row-action delete-action" type="button" aria-label="Delete ${escapeHTML(task.title)}" data-action="delete" data-id="${escapeHTML(task.id)}">${deleteIcon}</button></div>` : ""}`;
  if (!fullSize) {
    const actions = document.createElement("div");
    actions.className = "task-actions";
    actions.innerHTML = `<button class="row-action" type="button" aria-label="Edit ${escapeHTML(task.title)}" data-action="edit" data-id="${escapeHTML(task.id)}">${editIcon}</button><button class="row-action delete-action" type="button" aria-label="Delete ${escapeHTML(task.title)}" data-action="delete" data-id="${escapeHTML(task.id)}">${deleteIcon}</button>`;
    row.append(actions);
  }
  return row;
}

function renderEmptyState(container, title, message) {
  container.innerHTML = `<div class="empty-state"><span class="empty-illustration" aria-hidden="true">✳</span><strong>${escapeHTML(title)}</strong><p>${escapeHTML(message)}</p></div>`;
}

function renderTaskLists() {
  const visible = getVisibleTasks();
  const dashboard = document.querySelector("#dashboard-task-list");
  const fullList = document.querySelector("#all-task-list");
  dashboard.replaceChildren();
  fullList.replaceChildren();
  const preview = visible.slice(0, 4);
  if (preview.length)
    preview.forEach((task) => dashboard.append(renderTaskRow(task)));
  else
    renderEmptyState(
      dashboard,
      tasks.length ? "No tasks match" : "Your list is open",
      tasks.length
        ? "Try another search or filter."
        : "Add a task to start planning your week.",
    );
  if (visible.length)
    visible.forEach((task) => fullList.append(renderTaskRow(task, true)));
  else
    renderEmptyState(
      fullList,
      tasks.length ? "No tasks match" : "Nothing on the list yet",
      tasks.length
        ? "Try another search or filter."
        : "Add a task and make a little plan for yourself.",
    );
  document.querySelector("#heading-task-count").textContent = tasks.length;
  document.querySelector("#nav-task-count").textContent = tasks.filter(
    (task) => !task.completed,
  ).length;
}

function renderStats() {
  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.length - completed;
  const percent = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  document.querySelector("#total-count").textContent = tasks.length;
  document.querySelector("#completed-count").textContent = completed;
  document.querySelector("#pending-count").textContent = pending;
  document.querySelector("#progress-percent").innerHTML =
    `${percent}<span>%</span>`;
  const ring = document.querySelector("#progress-ring");
  ring.style.background = `conic-gradient(#8573d0 ${percent * 3.6}deg, #eeeaf7 ${percent * 3.6}deg)`;
  ring.setAttribute("aria-label", `${percent} percent of tasks completed`);
  document.querySelector("#progress-message").textContent = tasks.length
    ? percent === 100
      ? "You did it. Every task is complete!"
      : `${pending} ${pending === 1 ? "task" : "tasks"} to go. You're making progress.`
    : "Every task you finish is a win.";
  document.querySelector("#progress-done-label").textContent =
    `${completed} ${completed === 1 ? "task" : "tasks"}`;
  document.querySelector("#progress-pending-label").textContent =
    `${pending} ${pending === 1 ? "task" : "tasks"}`;
  document.querySelector("#sidebar-progress").style.width = `${percent}%`;
  document.querySelector("#sidebar-progress-label").textContent =
    `${percent}% complete`;
}

function renderDeadlines() {
  const container = document.querySelector("#deadline-list");
  container.replaceChildren();
  const upcoming = tasks
    .filter(
      (task) => !task.completed && task.dueDate >= toDateInputValue(new Date()),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);
  if (!upcoming.length) {
    container.innerHTML =
      '<p class="deadline-empty">No upcoming deadlines. Enjoy the breathing room.</p>';
    return;
  }
  upcoming.forEach((task) => {
    const card = document.createElement("article");
    card.className = "deadline-card";
    const [year, month, day] = task.dueDate.split("-").map(Number);
    const dueDate = new Date(year, month - 1, day);
    card.innerHTML = `<span class="deadline-date"><small>${new Intl.DateTimeFormat(undefined, { month: "short" }).format(dueDate)}</small><strong>${day}</strong></span><span class="deadline-copy"><strong title="${escapeHTML(task.title)}">${escapeHTML(task.title)}</strong><small>${escapeHTML(task.subject)} · ${getDateLabel(task.dueDate)}</small></span>`;
    container.append(card);
  });
}

function renderSelectedDay() {
  const heading = document.querySelector("#selected-day-title");
  const list = document.querySelector("#selected-day-list");
  const selected = tasks
    .filter((task) => task.dueDate === selectedCalendarDate)
    .sort((a, b) => Number(a.completed) - Number(b.completed));
  heading.textContent =
    selectedCalendarDate === toDateInputValue(new Date())
      ? "Due today"
      : formatDate(selectedCalendarDate, { month: "short", day: "numeric" });
  list.replaceChildren();
  if (!selected.length) {
    renderEmptyState(
      list,
      "A little breathing room",
      "No tasks due on this day.",
    );
    return;
  }
  selected.forEach((task) => {
    const item = document.createElement("article");
    item.className = "calendar-task";
    item.innerHTML = `<i class="calendar-task-mark priority-${task.priority}" aria-hidden="true"></i><span class="calendar-task-copy"><strong>${escapeHTML(task.title)}${task.completed ? " · done" : ""}</strong><small>${escapeHTML(task.subject)} · ${capitalize(task.priority)} priority</small></span>`;
    list.append(item);
  });
}

// Build the visible month, including dates from the previous and next months.
function renderCalendar() {
  const grid = document.querySelector("#calendar-grid");
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  document.querySelector("#calendar-month-label").textContent =
    new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(calendarMonth);
  grid.replaceChildren();
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((weekday) => {
    const heading = document.createElement("span");
    heading.className = "calendar-weekday";
    heading.setAttribute("role", "columnheader");
    heading.textContent = weekday;
    grid.append(heading);
  });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const cellCount = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  for (let index = 0; index < cellCount; index += 1) {
    let day;
    let cellMonth = month;
    let outside = false;
    if (index < firstDay) {
      day = previousMonthDays - firstDay + index + 1;
      cellMonth -= 1;
      outside = true;
    } else if (index >= firstDay + daysInMonth) {
      day = index - firstDay - daysInMonth + 1;
      cellMonth += 1;
      outside = true;
    } else day = index - firstDay + 1;
    const date = new Date(year, cellMonth, day);
    const value = toDateInputValue(date);
    const due = tasks.filter(
      (task) => task.dueDate === value && !task.completed,
    );
    const button = document.createElement("button");
    button.className = `calendar-day${outside ? " is-outside" : ""}${value === toDateInputValue(new Date()) ? " is-today" : ""}${value === selectedCalendarDate ? " is-selected" : ""}`;
    button.type = "button";
    button.setAttribute("role", "gridcell");
    button.setAttribute(
      "aria-label",
      `${formatDate(value, { month: "long", day: "numeric", year: "numeric" })}${due.length ? `, ${due.length} due ${due.length === 1 ? "task" : "tasks"}` : ""}`,
    );
    button.setAttribute("aria-pressed", String(value === selectedCalendarDate));
    button.dataset.date = value;
    button.innerHTML = `<span class="day-number">${day}</span><span class="day-dots" aria-hidden="true">${due
      .slice(0, 3)
      .map(() => '<i class="day-dot"></i>')
      .join("")}</span>`;
    grid.append(button);
  }
  renderSelectedDay();
}

function renderDateAndGreeting() {
  const now = new Date();
  document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(
    undefined,
    { weekday: "short", month: "short", day: "numeric" },
  ).format(now);
  document.querySelector("#greeting-period").textContent =
    now.getHours() < 12
      ? "morning"
      : now.getHours() < 18
        ? "afternoon"
        : "evening";
  const firstDay = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now - firstDay) / DAY_IN_MS + firstDay.getDay() + 1) / 7,
  );
  document.querySelector("#week-label").textContent = `Week ${week}`;
}

function renderAll() {
  renderStats();
  renderTaskLists();
  renderDeadlines();
  renderCalendar();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toastMessage.textContent = message;
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2700);
}

function openTaskModal(task = null) {
  elements.form.reset();
  elements.error.hidden = true;
  elements.id.value = task ? task.id : "";
  document.querySelector("#modal-title").textContent = task
    ? "Edit task"
    : "Add a task";
  document.querySelector("#save-task").textContent = task
    ? "Save changes"
    : "Save task";
  elements.title.value = task ? task.title : "";
  elements.subject.value = task ? task.subject : "";
  elements.dueDate.value = task ? task.dueDate : dateOffset(1);
  elements.dueDate.min = toDateInputValue(new Date());
  elements.priority.value = task ? task.priority : "medium";
  elements.modal.hidden = false;
  document.body.style.overflow = "hidden";
  window.setTimeout(() => elements.title.focus(), 0);
}

function closeTaskModal() {
  elements.modal.hidden = true;
  document.body.style.overflow = "";
}

function setView(name) {
  currentView = name;
  document.querySelectorAll(".view-panel").forEach((panel) => {
    const selected = panel.id === `${name}-view`;
    panel.hidden = !selected;
    panel.classList.toggle("is-visible", selected);
  });
  document.querySelectorAll(".nav-link").forEach((link) => {
    const selected = link.dataset.view === name;
    link.classList.toggle("is-active", selected);
    if (selected) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.querySelector("#page-crumb").textContent =
    name === "tasks" ? "My tasks" : capitalize(name);
  elements.sidebar.classList.remove("is-open");
  document.querySelector("#menu-toggle").setAttribute("aria-expanded", "false");
}

function handleTaskAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const task = tasks.find((item) => item.id === button.dataset.id);
  if (!task) return;
  if (button.dataset.action === "toggle") {
    task.completed = !task.completed;
    saveTasks();
    renderAll();
    showToast(
      task.completed
        ? "Task marked complete. Nice work!"
        : "Task moved back to pending.",
    );
  } else if (button.dataset.action === "edit") openTaskModal(task);
  else if (button.dataset.action === "delete") {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`))
      return;
    tasks = tasks.filter((item) => item.id !== task.id);
    saveTasks();
    renderAll();
    showToast("Task deleted.");
  }
}

document
  .querySelectorAll("[data-view]")
  .forEach((button) =>
    button.addEventListener("click", () => setView(button.dataset.view)),
  );
document
  .querySelectorAll("[data-open-view]")
  .forEach((button) =>
    button.addEventListener("click", () => setView(button.dataset.openView)),
  );
document.querySelectorAll("[data-filter]").forEach((button) =>
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((filter) => {
      const selected = filter.dataset.filter === activeFilter;
      filter.classList.toggle("is-selected", selected);
      filter.setAttribute("aria-pressed", String(selected));
    });
    renderTaskLists();
  }),
);
document
  .querySelector("#task-search")
  .addEventListener("input", renderTaskLists);
document
  .querySelector("#all-task-search")
  .addEventListener("input", renderTaskLists);
document
  .querySelector("#dashboard-task-list")
  .addEventListener("click", handleTaskAction);
document
  .querySelector("#all-task-list")
  .addEventListener("click", handleTaskAction);
document
  .querySelector("#top-add-task")
  .addEventListener("click", () => openTaskModal());
document
  .querySelector("#tasks-add-task")
  .addEventListener("click", () => openTaskModal());
document
  .querySelector("#close-modal")
  .addEventListener("click", closeTaskModal);
document
  .querySelector("#cancel-modal")
  .addEventListener("click", closeTaskModal);
elements.modal.addEventListener("click", (event) => {
  if (event.target === elements.modal) closeTaskModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.modal.hidden) closeTaskModal();
  if (
    event.key === "Escape" &&
    elements.sidebar.classList.contains("is-open")
  ) {
    elements.sidebar.classList.remove("is-open");
    document
      .querySelector("#menu-toggle")
      .setAttribute("aria-expanded", "false");
  }
});
document.querySelector("#menu-toggle").addEventListener("click", (event) => {
  const open = elements.sidebar.classList.toggle("is-open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});
elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = elements.title.value.trim();
  const subject = elements.subject.value.trim();
  const dueDate = elements.dueDate.value;
  if (!title || !subject || !dueDate) {
    elements.error.textContent =
      "Please complete the task name, subject, and due date.";
    elements.error.hidden = false;
    return;
  }
  const existing = tasks.find((task) => task.id === elements.id.value);
  if (existing) {
    Object.assign(existing, {
      title,
      subject,
      dueDate,
      priority: elements.priority.value,
    });
    showToast("Your changes have been saved.");
  } else {
    tasks.push({
      id:
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      subject,
      dueDate,
      priority: elements.priority.value,
      completed: false,
    });
    showToast("Task added to your study plan.");
  }
  saveTasks();
  selectedCalendarDate = dueDate;
  calendarMonth = new Date(
    Number(dueDate.slice(0, 4)),
    Number(dueDate.slice(5, 7)) - 1,
    1,
  );
  closeTaskModal();
  renderAll();
});
document.querySelector("#calendar-grid").addEventListener("click", (event) => {
  const day = event.target.closest("[data-date]");
  if (!day) return;
  selectedCalendarDate = day.dataset.date;
  const [year, month] = selectedCalendarDate.split("-").map(Number);
  calendarMonth = new Date(year, month - 1, 1);
  renderCalendar();
});
document.querySelector("#calendar-prev").addEventListener("click", () => {
  calendarMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() - 1,
    1,
  );
  renderCalendar();
});
document.querySelector("#calendar-next").addEventListener("click", () => {
  calendarMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    1,
  );
  renderCalendar();
});
document.querySelector("#calendar-today").addEventListener("click", () => {
  calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  selectedCalendarDate = toDateInputValue(new Date());
  renderCalendar();
});

renderDateAndGreeting();
renderAll();
