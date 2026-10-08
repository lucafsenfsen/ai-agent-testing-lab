"use strict";

const STORAGE_KEY = "daylist.tasks.v1";
const addForm = document.querySelector("#add-form");
const taskInput = document.querySelector("#task-input");
const list = document.querySelector("#task-list");
const filters = document.querySelector(".filters");
const storageError = document.querySelector("#storage-error");
const announcement = document.querySelector("#announcement");
let filter = "all";
let editingId = null;
let tasks = loadTasks();

function showStorageError(message) {
  storageError.textContent = message;
  storageError.hidden = false;
  document.querySelector("#storage-note").hidden = true;
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const saved = JSON.parse(raw);
    const ids = new Set();
    if (!Array.isArray(saved) || !saved.every(task => {
      if (!task || typeof task.id !== "string" || ids.has(task.id) ||
          typeof task.text !== "string" || !task.text.trim() ||
          task.text.length > 500 || typeof task.completed !== "boolean") return false;
      ids.add(task.id);
      return true;
    })) throw new Error("Invalid saved tasks");
    return saved;
  } catch {
    showStorageError("Saved tasks could not be loaded. You can still use the list, but browser storage may be unavailable.");
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    storageError.hidden = true;
    document.querySelector("#storage-note").hidden = false;
  } catch {
    showStorageError("Changes are available in this tab, but could not be saved. They may be lost when you refresh. Check your browser’s storage settings.");
  }
}

function commit(message) {
  saveTasks();
  render();
  announcement.textContent = message;
}

function validate(input) {
  input.setCustomValidity(input.value.trim() ? "" : "Please enter a task.");
  return input.reportValidity();
}

function button(text, className, onClick) {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = text;
  element.className = className;
  element.addEventListener("click", onClick);
  return element;
}

function focusEdit(id) {
  const row = Array.from(list.children).find(item => item.dataset.id === id);
  const target = row ? row.querySelector(".edit-button") : null;
  (target || taskInput).focus();
}

function createEditor(task) {
  const form = document.createElement("form");
  form.className = "edit-form";
  const input = document.createElement("input");
  input.type = "text";
  input.value = task.text;
  input.maxLength = 500;
  input.required = true;
  input.setAttribute("aria-label", "Edit task");
  input.addEventListener("input", () => input.setCustomValidity(""));
  const actions = document.createElement("div");
  actions.className = "actions";
  const save = document.createElement("button");
  save.type = "submit";
  save.className = "primary";
  save.textContent = "Save";
  const cancel = () => {
    editingId = null;
    render();
    focusEdit(task.id);
  };
  actions.append(save, button("Cancel", "", cancel));
  form.append(input, actions);
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!validate(input)) return;
    task.text = input.value.trim();
    editingId = null;
    commit("Task updated.");
    focusEdit(task.id);
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); cancel(); }
  });
  return form;
}

function render() {
  const visible = tasks.filter(task => filter === "all" ||
    (filter === "completed" ? task.completed : !task.completed));
  list.replaceChildren();
  for (const task of visible) {
    const row = document.createElement("li");
    row.className = `task${task.completed ? " completed" : ""}`;
    row.dataset.id = task.id;
    if (editingId === task.id) {
      row.append(createEditor(task));
    } else {
      const label = document.createElement("label");
      label.className = "task-label";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.addEventListener("change", () => {
        task.completed = checkbox.checked;
        commit(task.completed ? "Task completed." : "Task marked active.");
        const replacement = Array.from(list.children).find(item => item.dataset.id === task.id);
        (replacement?.querySelector('input[type="checkbox"]') || taskInput).focus();
      });
      const text = document.createElement("span");
      text.className = "task-text";
      // Task text is always inserted as text, never interpreted as HTML.
      text.textContent = task.text;
      label.append(checkbox, text);
      const actions = document.createElement("div");
      actions.className = "actions";
      const edit = button("Edit", "edit-button", () => {
        editingId = task.id;
        render();
        const input = list.querySelector(".edit-form input");
        input.focus();
        input.select();
      });
      edit.setAttribute("aria-label", `Edit ${task.text}`);
      const remove = button("Delete", "delete", () => {
        tasks = tasks.filter(item => item.id !== task.id);
        commit("Task deleted.");
        taskInput.focus();
      });
      remove.setAttribute("aria-label", `Delete ${task.text}`);
      actions.append(edit, remove);
      row.append(label, actions);
    }
    list.append(row);
  }

  const completed = tasks.filter(task => task.completed).length;
  const remaining = tasks.length - completed;
  document.querySelector("#task-count").textContent = `${remaining} task${remaining === 1 ? "" : "s"} left`;
  document.querySelector("#progress-label").textContent = `${completed} of ${tasks.length} tasks completed`;
  const progress = document.querySelector("#progress");
  progress.max = tasks.length || 1;
  progress.value = completed;
  document.querySelector("#empty-state").hidden = visible.length > 0;
  const emptyMessages = {
    all: ["A fresh start.", "Add your first task above. Small steps count."],
    active: ["You’re all caught up.", "No active tasks. Enjoy a little breathing room."],
    completed: ["Good things take small steps.", "Your completed tasks will appear here."]
  };
  document.querySelector("#empty-title").textContent = emptyMessages[filter][0];
  document.querySelector("#empty-description").textContent = emptyMessages[filter][1];
  for (const item of filters.querySelectorAll("button")) {
    item.setAttribute("aria-pressed", String(item.dataset.filter === filter));
  }
}

addForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!validate(taskInput)) return;
  let id;
  do { id = `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  while (tasks.some(task => task.id === id));
  tasks.push({ id, text: taskInput.value.trim(), completed: false });
  editingId = null;
  filter = "all";
  taskInput.value = "";
  commit("Task added.");
  taskInput.focus();
});
taskInput.addEventListener("input", () => taskInput.setCustomValidity(""));
filters.addEventListener("click", event => {
  const selected = event.target.closest("button[data-filter]");
  if (!selected) return;
  filter = selected.dataset.filter;
  editingId = null;
  render();
});
render();
