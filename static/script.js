const addForm = document.getElementById("addForm");
const newTask = document.getElementById("newTask");
const listEl = document.getElementById("list");
const filters = document.querySelectorAll(".filters button");
const clearCompletedBtn = document.getElementById("clearCompleted");

let tasks = [];
let currentFilter = "all";

// --------------------
// Load Tasks
// --------------------
async function loadTasks() {
  const res = await fetch("/api/todos");
  tasks = await res.json();
  render();
}

// --------------------
// Add Task
// --------------------
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = newTask.value.trim();
  if (!text) return;

  await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  newTask.value = "";
  loadTasks();
});

// --------------------
// Filters
// --------------------
filters.forEach(btn => {
  btn.addEventListener("click", () => {
    filters.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

// --------------------
// Render
// --------------------
function render() {
  listEl.innerHTML = "";

  let filtered = tasks.filter(task => {
    if (currentFilter === "active") return task.completed === 0;
    if (currentFilter === "completed") return task.completed === 1;
    return true;
  });

  filtered.forEach(task => {
    const li = document.createElement("li");
    li.className = "item";

    li.innerHTML = `
      <input type="checkbox" ${task.completed ? "checked" : ""}>

      <span class="task-text ${task.completed ? "done" : ""}">
        ${task.text}
      </span>

      <button class="edit-btn">Edit</button>
      <button class="delete-btn">Delete</button>
    `;

    // Toggle
    li.querySelector("input").addEventListener("change", async () => {
      await fetch(`/api/todos/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: task.text,
          completed: task.completed ? 0 : 1
        })
      });
      loadTasks();
    });

    // Delete
    li.querySelector(".delete-btn").addEventListener("click", async () => {
      await fetch(`/api/todos/${task.id}`, {
        method: "DELETE"
      });
      loadTasks();
    });

    // Edit
    li.querySelector(".edit-btn").addEventListener("click", () => {
      startEdit(li, task);
    });

    listEl.appendChild(li);
  });
  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="empty">No tasks found</div>`;
  }
}

// --------------------
// Edit Function
// --------------------
function startEdit(li, task) {
  const span = li.querySelector(".task-text");

  const input = document.createElement("input");
  input.value = task.text;
  input.className = "edit-input";

  span.replaceWith(input);
  input.focus();

  input.addEventListener("blur", saveEdit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") loadTasks();
  });

  async function saveEdit() {
    const newText = input.value.trim();
    if (!newText) return loadTasks();

    await fetch(`/api/todos/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: newText,
        completed: task.completed
      })
    });

    loadTasks();
  }
}

// --------------------
// Clear Completed
// --------------------
clearCompletedBtn.addEventListener("click", async () => {
  await fetch("/api/todos/clear_completed", {
    method: "DELETE"
  });
  loadTasks();
});

// Initial load
loadTasks();