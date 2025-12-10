(function () {
  const STORAGE_KEY = "todo_vanilla_polished_v1";

  const addForm = document.getElementById("addForm");
  const newTask = document.getElementById("newTask");
  const listEl = document.getElementById("list");
  const filters = document.querySelectorAll(".filters button");
  const sortSelect = document.getElementById("sortSelect");
  const searchInput = document.getElementById("search");
  const itemsLeft = document.getElementById("itemsLeft");
  const clearCompletedBtn = document.getElementById("clearCompleted");
  const clearAllBtn = document.getElementById("clearAll");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");
  const backupBtn = document.getElementById("backupBtn");

  let tasks = load();
  let filter = "all";
  render();

  // ---------------------------
  // Add Task
  // ---------------------------
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const txt = newTask.value.trim();
    if (!txt) return;

    tasks.unshift({
      id: Date.now().toString(),
      text: txt,
      completed: false,
      createdAt: Date.now(),
    });

    newTask.value = "";
    save();
    render();
  });

  // ---------------------------
  // Filters
  // ---------------------------
  filters.forEach((btn) =>
    btn.addEventListener("click", () => {
      filters.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filter = btn.dataset.filter;
      render();
    })
  );

  sortSelect.addEventListener("change", render);
  searchInput.addEventListener("input", render);

  // ---------------------------
  // Clear completed
  // ---------------------------
  clearCompletedBtn.addEventListener("click", () => {
    tasks = tasks.filter((t) => !t.completed);
    save();
    render();
  });

  // ---------------------------
  // Clear all
  // ---------------------------
  clearAllBtn.addEventListener("click", () => {
    if (confirm("Clear ALL tasks?")) {
      tasks = [];
      save();
      render();
    }
  });

  // ---------------------------
  // Export
  // ---------------------------
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks.json";
    a.click();

    URL.revokeObjectURL(url);
  });

  // ---------------------------
  // Import
  // ---------------------------
  importBtn.addEventListener("click", () => importFile.click());

  importFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm("Import tasks and overwrite existing?")) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data)) {
          tasks = data.map((it) => ({
            id: it.id || Date.now().toString(),
            text: it.text || "",
            completed: !!it.completed,
            createdAt: it.createdAt || Date.now(),
          }));
          save();
          render();
        } else {
          alert("Invalid JSON file.");
        }
      } catch {
        alert("Error parsing file.");
      }
    };
    reader.readAsText(file);
  });

  // ---------------------------
  // Backup Copy JSON
  // ---------------------------
  backupBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(JSON.stringify(tasks, null, 2));
    alert("Copied JSON to clipboard");
  });

  // ---------------------------
  // Rendering tasks
  // ---------------------------
  function render() {
    const query = searchInput.value.toLowerCase();

    let filtered = tasks.filter((t) => {
      if (filter === "active" && t.completed) return false;
      if (filter === "completed" && !t.completed) return false;
      if (!t.text.toLowerCase().includes(query)) return false;
      return true;
    });

    filtered.sort((a, b) =>
      sortSelect.value === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    );

    listEl.innerHTML = "";
    filtered.forEach((task, index) => {
      const li = document.createElement("li");
      li.className = "item";
      li.draggable = true;
      li.dataset.index = index;

      li.innerHTML = `
        <input type="checkbox" class="checkbox" ${task.completed ? "checked" : ""}>
        <div class="text ${task.completed ? "done" : ""}">
          <span class="label">${task.text}</span>
        </div>
        <button class="btn danger delete">✕</button>
      `;

      // Toggle complete
      li.querySelector(".checkbox").addEventListener("change", () => {
        task.completed = !task.completed;
        save();
        render();
      });

      // Delete
      li.querySelector(".delete").addEventListener("click", () => {
        tasks = tasks.filter((t) => t.id !== task.id);
        save();
        render();
      });

      // Editing on double-click
      li.querySelector(".text").addEventListener("dblclick", () => startEdit(li, task));

      // Drag events
      li.addEventListener("dragstart", () => {
        li.classList.add("dragging");
        li.dataset.dragIndex = index;
      });

      li.addEventListener("dragend", () => {
        li.classList.remove("dragging");
      });

      listEl.appendChild(li);
    });

    enableDrag();

    itemsLeft.textContent = `${tasks.filter((t) => !t.completed).length} items left`;
  }

  // ---------------------------
  // Editing
  // ---------------------------
  function startEdit(li, task) {
    const span = li.querySelector(".label");
    const input = document.createElement("input");

    input.className = "editor";
    input.value = task.text;
    li.querySelector(".text").replaceChild(input, span);
    input.focus();

    input.addEventListener("blur", finish);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish();
      if (e.key === "Escape") cancel();
    });

    function finish() {
      task.text = input.value.trim() || task.text;
      save();
      render();
    }

    function cancel() {
      render();
    }
  }

  // ---------------------------
  // Drag & Drop Sorting
  // ---------------------------
  function enableDrag() {
    listEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      const dragging = listEl.querySelector(".dragging");
      const after = getDragAfter(e.clientY);
      if (after == null) listEl.appendChild(dragging);
      else listEl.insertBefore(dragging, after);
    });

    listEl.addEventListener("drop", () => {
      const items = [...listEl.children];
      tasks = items.map((el) => tasks[el.dataset.index]);
      save();
      render();
    });
  }

  function getDragAfter(y) {
    const items = [...listEl.querySelectorAll(".item:not(.dragging)")];
    return items.find((item) => {
      const rect = item.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });
  }

  // ---------------------------
  // Load & Save
  // ---------------------------
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }
})();
