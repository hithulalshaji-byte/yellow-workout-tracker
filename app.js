// PureTrack Workout Tracker - Core Application Logic

// Default Exercise Database
const DEFAULT_EXERCISES = [
  "Bench Press (Barbell)",
  "Incline Dumbbell Press",
  "Squat (Barbell)",
  "Deadlift (Barbell)",
  "Overhead Press (Barbell)",
  "Dumbbell Bicep Curl",
  "Cable Tricep Pushdown",
  "Lat Pulldown",
  "Seated Cable Row",
  "Pull-up",
  "Dumbbell Lateral Raise",
  "Leg Press",
  "Lying Leg Curl",
  "Calf Raise"
];

// App State
let state = {
  profile: {
    name: "",
    age: "",
    weight: "",
    height: "",
    targetWeight: "",
    goal: "Strength Training"
  },
  history: [],
  activeWorkout: {
    title: "Push Day",
    date: new Date().toISOString().split('T')[0],
    exercises: []
  },
  customExercises: []
};

// Global Chart References
let activeChartData = null;

// Initialize the Application
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupEventListeners();
  setupTabSystem();
  setupExerciseAutocomplete();
  
  // Renders
  renderProfile();
  renderWelcomePanel();
  renderActiveWorkout();
  renderHistory();
  populateChartSelectors();
  
  // Handle Canvas resize
  window.addEventListener('resize', () => {
    if (activeChartData && document.getElementById('tab-history').classList.contains('active')) {
      drawProgressChart();
    }
  });
});

// Load from Local Storage
function loadData() {
  const profileData = localStorage.getItem("puretrack_profile");
  if (profileData) {
    state.profile = JSON.parse(profileData);
  }

  const historyData = localStorage.getItem("puretrack_history");
  if (historyData) {
    state.history = JSON.parse(historyData);
  }

  const activeData = localStorage.getItem("puretrack_active");
  if (activeData) {
    state.activeWorkout = JSON.parse(activeData);
    // Sync date to today if it's empty
    if (!state.activeWorkout.date) {
      state.activeWorkout.date = new Date().toISOString().split('T')[0];
    }
  } else {
    resetActiveWorkoutState();
  }

  const customExData = localStorage.getItem("puretrack_custom_exercises");
  if (customExData) {
    state.customExercises = JSON.parse(customExData);
  }
}

// Save to Local Storage
function saveData() {
  localStorage.setItem("puretrack_profile", JSON.stringify(state.profile));
  localStorage.setItem("puretrack_history", JSON.stringify(state.history));
  localStorage.setItem("puretrack_active", JSON.stringify(state.activeWorkout));
  localStorage.setItem("puretrack_custom_exercises", JSON.stringify(state.customExercises));
}

// Reset Active Workout
function resetActiveWorkoutState() {
  state.activeWorkout = {
    title: "Workout Session",
    date: new Date().toISOString().split('T')[0],
    exercises: []
  };
}

// setup tab navigation
function setupTabSystem() {
  const tabButtons = document.querySelectorAll(".nav-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      
      tabButtons.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      
      btn.classList.add("active");
      document.getElementById(targetTab).classList.add("active");
      
      // Trigger charts redrawing if entering history tab
      if (targetTab === "tab-history") {
        renderHistory();
        populateChartSelectors();
        drawProgressChart();
      }
    });
  });

  // History empty state shortcut
  const goLogWorkoutBtn = document.getElementById("btn-go-log-workout");
  if (goLogWorkoutBtn) {
    goLogWorkoutBtn.addEventListener("click", () => {
      document.getElementById("tab-btn-workout").click();
    });
  }
}

// Welcome Panel and Header Sync
function renderWelcomePanel() {
  const welcomeMessage = document.getElementById("welcome-message");
  const avatarInitials = document.getElementById("avatar-initials");
  const avatarName = document.getElementById("avatar-name");
  
  const statWorkouts = document.getElementById("stat-workouts");
  const statStreak = document.getElementById("stat-streak");
  const statWeight = document.getElementById("stat-weight");

  const name = state.profile.name || "Guest";
  welcomeMessage.textContent = `Hello, ${name}!`;
  avatarName.textContent = name;
  avatarInitials.textContent = name.substring(0, 2).toUpperCase();

  // Stats calculation
  statWorkouts.textContent = state.history.length;
  statStreak.textContent = calculateStreak();
  statWeight.textContent = state.profile.weight || "--";
}

// Streak Calculation
function calculateStreak() {
  if (state.history.length === 0) return 0;
  
  // Sort workout dates descending
  const dates = state.history
    .map(w => w.date)
    .filter((v, i, a) => a.indexOf(v) === i) // unique dates
    .sort((a, b) => new Date(b) - new Date(a));
    
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastWorkoutDate = new Date(dates[0]);
  lastWorkoutDate.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(today - lastWorkoutDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // If last workout was more than 1 day ago (excluding today), streak is broken
  if (diffDays > 1) {
    return 0;
  }
  
  let streak = 1;
  let currentDate = lastWorkoutDate;
  
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i]);
    prevDate.setHours(0, 0, 0, 0);
    
    const diff = Math.ceil((currentDate - prevDate) / (1000 * 60 * 60 * 24));
    
    if (diff === 1) {
      streak++;
      currentDate = prevDate;
    } else if (diff > 1) {
      break; // Streak broken
    }
  }
  
  return streak;
}

// Setup Event Listeners
function setupEventListeners() {
  // Workout controls
  const titleInput = document.getElementById("workout-title-input");
  titleInput.addEventListener("input", (e) => {
    state.activeWorkout.title = e.target.value;
    saveData();
  });

  const clearBtn = document.getElementById("btn-clear-workout");
  clearBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear your current session? All unsaved active progress will be lost.")) {
      resetActiveWorkoutState();
      saveData();
      renderActiveWorkout();
      titleInput.value = "Workout Session";
    }
  });

  const saveBtn = document.getElementById("btn-save-workout");
  saveBtn.addEventListener("click", saveActiveWorkout);

  // Profile Form
  const profileForm = document.getElementById("profile-form");
  profileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    state.profile.name = document.getElementById("profile-name").value;
    state.profile.age = parseInt(document.getElementById("profile-age").value) || "";
    state.profile.weight = parseFloat(document.getElementById("profile-weight").value) || "";
    state.profile.height = parseInt(document.getElementById("profile-height").value) || "";
    state.profile.targetWeight = parseFloat(document.getElementById("profile-target-weight").value) || "";
    state.profile.goal = document.getElementById("profile-goal").value;

    saveData();
    renderProfile();
    renderWelcomePanel();
    
    // Smooth scroll to top and show message
    window.scrollTo({ top: 0, behavior: 'smooth' });
    alert("Profile saved successfully!");
  });

  // Chart Exercise Selector Change
  const chartSelect = document.getElementById("chart-exercise-select");
  chartSelect.addEventListener("change", (e) => {
    loadChartForExercise(e.target.value);
  });
}

// Exercise Autocomplete list
function setupExerciseAutocomplete() {
  const searchInput = document.getElementById("exercise-search-input");
  const dropdown = document.getElementById("exercise-dropdown");
  const addBtn = document.getElementById("btn-add-exercise");

  // Get combined exercises list
  const getExerciseOptions = () => {
    const all = [...DEFAULT_EXERCISES, ...state.customExercises];
    return [...new Set(all)].sort();
  };

  // Close dropdown on click outside
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });

  searchInput.addEventListener("focus", () => {
    renderDropdownItems(searchInput.value);
  });

  searchInput.addEventListener("input", (e) => {
    renderDropdownItems(e.target.value);
  });

  function renderDropdownItems(filter = "") {
    const list = getExerciseOptions();
    const query = filter.toLowerCase().trim();
    const filtered = list.filter(item => item.toLowerCase().includes(query));
    
    dropdown.innerHTML = "";
    
    if (filtered.length === 0) {
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.textContent = `Create custom: "${filter}"`;
      item.addEventListener("click", () => {
        addExerciseToSession(filter);
        if (!state.customExercises.includes(filter) && !DEFAULT_EXERCISES.includes(filter)) {
          state.customExercises.push(filter);
          saveData();
        }
        searchInput.value = "";
        dropdown.classList.remove("show");
      });
      dropdown.appendChild(item);
    } else {
      filtered.forEach(name => {
        const item = document.createElement("div");
        item.className = "dropdown-item";
        item.textContent = name;
        item.addEventListener("click", () => {
          addExerciseToSession(name);
          searchInput.value = "";
          dropdown.classList.remove("show");
        });
        dropdown.appendChild(item);
      });
    }
    
    dropdown.classList.add("show");
  }

  addBtn.addEventListener("click", () => {
    const value = searchInput.value.trim();
    if (value) {
      addExerciseToSession(value);
      if (!state.customExercises.includes(value) && !DEFAULT_EXERCISES.includes(value)) {
        state.customExercises.push(value);
        saveData();
      }
      searchInput.value = "";
      dropdown.classList.remove("show");
    }
  });
}

// Add Exercise to Active Session
function addExerciseToSession(exerciseName) {
  if (!exerciseName) return;

  // Check if already in active workout
  const exists = state.activeWorkout.exercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
  if (exists) {
    alert("Exercise is already in active session!");
    return;
  }

  // Look up last stats for this exercise to pre-populate (helpful suggestion)
  const defaultSets = [];
  const lastStats = findLastSessionStats(exerciseName);

  if (lastStats && lastStats.sets && lastStats.sets.length > 0) {
    // Copy sets from the last session but keep them uncompleted
    lastStats.sets.forEach((set, index) => {
      defaultSets.push({
        weight: set.weight,
        reps: set.reps,
        completed: false
      });
    });
  } else {
    // Default starting set
    defaultSets.push({
      weight: 10,
      reps: 10,
      completed: false
    });
  }

  state.activeWorkout.exercises.push({
    name: exerciseName,
    sets: defaultSets
  });

  saveData();
  renderActiveWorkout();
}

// Find previous session for an exercise
function findLastSessionStats(exerciseName) {
  if (state.history.length === 0) return null;
  
  // Sort history newest first
  const sortedHistory = [...state.history].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  for (const workout of sortedHistory) {
    const exercise = workout.exercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
    if (exercise) {
      return exercise;
    }
  }
  
  return null;
}

// Render Active Workout
function renderActiveWorkout() {
  const container = document.getElementById("exercises-list");
  const actionsRow = document.getElementById("workout-actions-row");
  const summarySubtitle = document.getElementById("workout-summary-subtitle");
  
  container.innerHTML = "";

  if (state.activeWorkout.exercises.length === 0) {
    actionsRow.style.display = "none";
    summarySubtitle.textContent = "No exercises added yet. Select one above to begin!";
    
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <i data-lucide="dumbbell" class="empty-icon"></i>
      <p>Your session is empty. Use the control panel to search and add exercises.</p>
    `;
    container.appendChild(empty);
    lucide.createIcons();
    return;
  }

  actionsRow.style.display = "flex";
  summarySubtitle.textContent = `Log weights and reps for your ${state.activeWorkout.exercises.length} exercise(s).`;

  state.activeWorkout.exercises.forEach((exercise, exerciseIndex) => {
    const card = document.createElement("div");
    card.className = "exercise-card";
    
    // Header
    const cardHeader = document.createElement("div");
    cardHeader.className = "exercise-card-header";
    
    const titleArea = document.createElement("div");
    titleArea.className = "exercise-title-area";
    
    const num = document.createElement("span");
    num.className = "exercise-number";
    num.textContent = exerciseIndex + 1;
    
    const title = document.createElement("h4");
    title.textContent = exercise.name;
    
    titleArea.appendChild(num);
    titleArea.appendChild(title);
    
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-remove-exercise";
    removeBtn.setAttribute("title", "Remove Exercise");
    removeBtn.innerHTML = `<i data-lucide="x"></i>`;
    removeBtn.addEventListener("click", () => {
      if (confirm(`Remove ${exercise.name} from active session?`)) {
        state.activeWorkout.exercises.splice(exerciseIndex, 1);
        saveData();
        renderActiveWorkout();
      }
    });

    cardHeader.appendChild(titleArea);
    cardHeader.appendChild(removeBtn);
    card.appendChild(cardHeader);

    // Sets Logger Table
    const tableContainer = document.createElement("div");
    tableContainer.className = "sets-table-container";
    
    const table = document.createElement("table");
    table.className = "sets-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th style="width: 50px; text-align: center;">Set</th>
          <th>Weight</th>
          <th>Reps</th>
          <th style="text-align: right; padding-right: 18px;">Status</th>
        </tr>
      </thead>
      <tbody class="sets-tbody">
      </tbody>
    `;

    const tbody = table.querySelector(".sets-tbody");
    
    exercise.sets.forEach((set, setIndex) => {
      const row = document.createElement("tr");
      row.className = "set-row";
      
      // Set number
      const numCell = document.createElement("td");
      numCell.className = "set-number-cell";
      numCell.textContent = setIndex + 1;
      row.appendChild(numCell);

      // Weight Input
      const weightCell = document.createElement("td");
      const weightGroup = document.createElement("div");
      weightGroup.className = "set-input-group";
      const weightInput = document.createElement("input");
      weightInput.type = "number";
      weightInput.step = "0.5";
      weightInput.value = set.weight;
      weightInput.placeholder = "0";
      
      weightInput.addEventListener("input", (e) => {
        set.weight = parseFloat(e.target.value) || 0;
        saveData();
      });
      
      const weightUnit = document.createElement("span");
      weightUnit.className = "set-unit-label";
      weightUnit.textContent = "kg";
      
      weightGroup.appendChild(weightInput);
      weightGroup.appendChild(weightUnit);
      weightCell.appendChild(weightGroup);
      row.appendChild(weightCell);

      // Reps Input
      const repsCell = document.createElement("td");
      const repsGroup = document.createElement("div");
      repsGroup.className = "set-input-group";
      const repsInput = document.createElement("input");
      repsInput.type = "number";
      repsInput.value = set.reps;
      repsInput.placeholder = "0";
      
      repsInput.addEventListener("input", (e) => {
        set.reps = parseInt(e.target.value) || 0;
        saveData();
      });
      
      const repsUnit = document.createElement("span");
      repsUnit.className = "set-unit-label";
      repsUnit.textContent = "reps";
      
      repsGroup.appendChild(repsInput);
      repsGroup.appendChild(repsUnit);
      repsCell.appendChild(repsGroup);
      row.appendChild(repsCell);

      // Actions
      const actionsCell = document.createElement("td");
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "set-actions-cell";
      
      // Log/Complete Button
      const logBtn = document.createElement("button");
      logBtn.className = `btn-icon-only btn-set-complete ${set.completed ? 'completed' : ''}`;
      logBtn.innerHTML = `<i data-lucide="check"></i>`;
      logBtn.addEventListener("click", () => {
        set.completed = !set.completed;
        logBtn.classList.toggle("completed", set.completed);
        saveData();
      });

      // Delete Set Button
      const delBtn = document.createElement("button");
      delBtn.className = "btn-icon-only btn-delete-set";
      delBtn.innerHTML = `<i data-lucide="trash-2"></i>`;
      delBtn.addEventListener("click", () => {
        exercise.sets.splice(setIndex, 1);
        saveData();
        renderActiveWorkout();
      });

      actionsDiv.appendChild(logBtn);
      actionsDiv.appendChild(delBtn);
      actionsCell.appendChild(actionsDiv);
      row.appendChild(actionsCell);

      tbody.appendChild(row);
    });

    tableContainer.appendChild(table);
    card.appendChild(tableContainer);

    // Exercise Card Footer
    const cardFooter = document.createElement("div");
    cardFooter.className = "exercise-footer";
    
    const addSetBtn = document.createElement("button");
    addSetBtn.className = "btn btn-secondary-outline btn-sm";
    addSetBtn.innerHTML = `<i data-lucide="plus"></i> Add Set`;
    addSetBtn.addEventListener("click", () => {
      // Copy last set details if exists
      const lastSet = exercise.sets[exercise.sets.length - 1];
      exercise.sets.push({
        weight: lastSet ? lastSet.weight : 10,
        reps: lastSet ? lastSet.reps : 10,
        completed: false
      });
      saveData();
      renderActiveWorkout();
    });

    const copyLastSetBtn = document.createElement("button");
    copyLastSetBtn.className = "btn btn-primary-outline btn-sm";
    copyLastSetBtn.innerHTML = `<i data-lucide="copy"></i> Copy Last Set`;
    copyLastSetBtn.addEventListener("click", () => {
      if (exercise.sets.length === 0) return;
      const lastSet = exercise.sets[exercise.sets.length - 1];
      exercise.sets.push({
        weight: lastSet.weight,
        reps: lastSet.reps,
        completed: false
      });
      saveData();
      renderActiveWorkout();
    });

    cardFooter.appendChild(addSetBtn);
    if (exercise.sets.length > 0) {
      cardFooter.appendChild(copyLastSetBtn);
    }
    card.appendChild(cardFooter);

    container.appendChild(card);
  });

  lucide.createIcons();
}

// Complete & Save Active Workout
function saveActiveWorkout() {
  const exercises = state.activeWorkout.exercises;
  
  if (exercises.length === 0) {
    alert("Add at least one exercise to save the session.");
    return;
  }

  // Filter out exercises with no sets, and filter sets to only completed ones?
  // Let's ask or decide: let's include all sets, but check if user wants to log all.
  // Actually, let's keep all sets so they are documented, but alert if there are uncompleted sets.
  const hasUncompleted = exercises.some(ex => ex.sets.some(s => !s.completed));
  if (hasUncompleted) {
    if (!confirm("Some sets are not checked as completed. Save them anyway?")) {
      return;
    }
  }

  // Create final workout item
  const completedWorkout = {
    id: Date.now().toString(),
    title: state.activeWorkout.title || "Workout Session",
    date: state.activeWorkout.date || new Date().toISOString().split('T')[0],
    exercises: JSON.parse(JSON.stringify(exercises)) // Deep copy
  };

  // Add to history
  state.history.unshift(completedWorkout);
  
  // Clean active session
  resetActiveWorkoutState();
  saveData();

  // Reset inputs
  document.getElementById("workout-title-input").value = "Workout Session";
  
  // Render updates
  renderActiveWorkout();
  renderHistory();
  populateChartSelectors();
  renderWelcomePanel();

  // Redirect to History
  document.getElementById("tab-btn-history").click();
  alert("Workout session saved successfully!");
}

// Render History Log
function renderHistory() {
  const container = document.getElementById("history-list-container");
  const countBadge = document.getElementById("history-count");

  container.innerHTML = "";
  countBadge.textContent = `${state.history.length} Workouts`;

  if (state.history.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <i data-lucide="clipboard-list" class="empty-icon"></i>
      <p>No workouts recorded yet.</p>
      <button class="btn btn-primary-outline btn-sm" id="btn-go-log-workout-inner">Log Your First Workout</button>
    `;
    container.appendChild(empty);
    
    document.getElementById("btn-go-log-workout-inner").addEventListener("click", () => {
      document.getElementById("tab-btn-workout").click();
    });
    
    lucide.createIcons();
    return;
  }

  state.history.forEach((workout) => {
    const card = document.createElement("div");
    card.className = "history-card";
    card.id = `history-${workout.id}`;

    // Calculate total weight and sets for quick summary
    let totalSets = 0;
    let maxWeight = 0;
    workout.exercises.forEach(ex => {
      totalSets += ex.sets.length;
      ex.sets.forEach(s => {
        if (s.weight > maxWeight) maxWeight = s.weight;
      });
    });

    // Header
    const header = document.createElement("div");
    header.className = "history-card-header";
    header.innerHTML = `
      <div class="history-card-title">
        <h4>${workout.title}</h4>
        <div class="history-card-meta">
          <span><i data-lucide="calendar"></i> ${formatFriendlyDate(workout.date)}</span>
          <span><i data-lucide="layers"></i> ${workout.exercises.length} Exercises</span>
          <span><i data-lucide="dumbbell"></i> ${totalSets} Sets</span>
        </div>
      </div>
      <button class="history-card-toggle"><i data-lucide="chevron-down"></i></button>
    `;

    // Toggle Expansion
    header.addEventListener("click", () => {
      card.classList.toggle("expanded");
    });

    // Body details
    const body = document.createElement("div");
    body.className = "history-card-body";

    workout.exercises.forEach((ex) => {
      const exRow = document.createElement("div");
      exRow.className = "history-exercise-row";
      
      const name = document.createElement("div");
      name.className = "history-exercise-name";
      name.textContent = ex.name;
      exRow.appendChild(name);

      const pillsContainer = document.createElement("div");
      pillsContainer.className = "history-sets-pills";

      ex.sets.forEach((set, sIdx) => {
        const pill = document.createElement("span");
        pill.className = "history-set-pill";
        pill.textContent = `Set ${sIdx + 1}: ${set.weight}kg × ${set.reps}`;
        pillsContainer.appendChild(pill);
      });

      exRow.appendChild(pillsContainer);
      body.appendChild(exRow);
    });

    // Actions (Delete)
    const actionsRow = document.createElement("div");
    actionsRow.className = "history-card-actions";
    
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger-outline btn-sm";
    deleteBtn.innerHTML = `<i data-lucide="trash-2"></i> Delete`;
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Avoid triggering accordion toggle
      if (confirm(`Are you sure you want to delete this workout from your history?`)) {
        state.history = state.history.filter(w => w.id !== workout.id);
        saveData();
        renderHistory();
        populateChartSelectors();
        renderWelcomePanel();
        drawProgressChart(); // Redraw chart in case active exercise was deleted
      }
    });

    actionsRow.appendChild(deleteBtn);
    body.appendChild(actionsRow);

    card.appendChild(header);
    card.appendChild(body);
    container.appendChild(card);
  });

  lucide.createIcons();
}

function formatFriendlyDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Populate Chart Exercise Select dropdown
function populateChartSelectors() {
  const select = document.getElementById("chart-exercise-select");
  const currentValue = select.value;
  
  select.innerHTML = '<option value="">Select an Exercise</option>';

  // Collect all unique exercise names present in history
  const historyExercises = new Set();
  state.history.forEach(workout => {
    workout.exercises.forEach(ex => {
      historyExercises.add(ex.name);
    });
  });

  const sortedExercises = Array.from(historyExercises).sort();
  sortedExercises.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  // Keep selection if it still exists
  if (sortedExercises.includes(currentValue)) {
    select.value = currentValue;
  } else {
    activeChartData = null;
  }
}

// Load historical data for selected exercise and render chart
function loadChartForExercise(exerciseName) {
  const canvas = document.getElementById("progress-canvas");
  const chartContainer = document.getElementById("chart-container");
  const insightDiv = document.getElementById("exercise-insights");

  if (!exerciseName) {
    chartContainer.classList.remove("has-data");
    insightDiv.style.display = "none";
    activeChartData = null;
    return;
  }

  // Filter history for this exercise, oldest first for charting chronology
  const exerciseData = [];
  const reversedHistory = [...state.history].reverse();

  reversedHistory.forEach(workout => {
    const exercise = workout.exercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
    if (exercise && exercise.sets && exercise.sets.length > 0) {
      // Calculate max weight and estimated 1RM
      let maxWeight = 0;
      let max1RM = 0;
      let totalReps = 0;

      exercise.sets.forEach(set => {
        totalReps += set.reps;
        if (set.weight > maxWeight) {
          maxWeight = set.weight;
        }
        // Epley formula for 1RM: w * (1 + r/30)
        let est1RM = set.weight * (1 + set.reps / 30);
        if (est1RM > max1RM) {
          max1RM = est1RM;
        }
      });

      exerciseData.push({
        date: workout.date,
        maxWeight: maxWeight,
        est1RM: Math.round(max1RM * 10) / 10,
        totalReps: totalReps
      });
    }
  });

  if (exerciseData.length === 0) {
    chartContainer.classList.remove("has-data");
    insightDiv.style.display = "none";
    activeChartData = null;
    return;
  }

  activeChartData = {
    exerciseName: exerciseName,
    points: exerciseData
  };

  chartContainer.classList.add("has-data");
  insightDiv.style.display = "block";
  
  // Calculate aggregate insights
  let peak1RM = 0;
  let maxWeightLifted = 0;
  let aggregateReps = 0;

  exerciseData.forEach(d => {
    if (d.est1RM > peak1RM) peak1RM = d.est1RM;
    if (d.maxWeight > maxWeightLifted) maxWeightLifted = d.maxWeight;
    aggregateReps += d.totalReps;
  });

  document.getElementById("insight-1rm").textContent = `${peak1RM} kg`;
  document.getElementById("insight-max-weight").textContent = `${maxWeightLifted} kg`;
  document.getElementById("insight-total-reps").textContent = aggregateReps;

  drawProgressChart();
}

// Custom HTML5 Canvas Progress Chart Drawer
function drawProgressChart() {
  if (!activeChartData) return;

  const canvas = document.getElementById("progress-canvas");
  const ctx = canvas.getContext("2d");

  // Handle High DPI displays
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  // Clear
  ctx.clearRect(0, 0, width, height);

  const points = activeChartData.points;
  const count = points.length;

  // Padding
  const paddingLeft = 50;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 40;

  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  // Find min/max values for scaling
  let maxVal = 0;
  let minVal = Infinity;

  points.forEach(p => {
    if (p.maxWeight > maxVal) maxVal = p.maxWeight;
    if (p.maxWeight < minVal) minVal = p.maxWeight;
  });

  // Give some breathing room
  maxVal = Math.ceil(maxVal * 1.1 / 5) * 5;
  minVal = Math.floor(minVal * 0.9 / 5) * 5;
  if (minVal < 0) minVal = 0;
  if (maxVal === minVal) {
    maxVal = minVal + 10;
    minVal = Math.max(0, minVal - 10);
  }

  // Draw Grid Lines & Labels
  const gridLines = 4;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#64748b";
  ctx.font = "11px 'Outfit', sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= gridLines; i++) {
    const val = minVal + (maxVal - minVal) * (i / gridLines);
    const y = paddingTop + graphHeight - (graphHeight * (i / gridLines));
    
    // Grid line
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();

    // Value Label
    ctx.fillText(`${Math.round(val)}kg`, paddingLeft - 8, y);
  }

  // Coordinates calculation helper
  const getCoords = (index, value) => {
    let x;
    if (count === 1) {
      x = paddingLeft + graphWidth / 2;
    } else {
      x = paddingLeft + (graphWidth * (index / (count - 1)));
    }
    const y = paddingTop + graphHeight - (graphHeight * ((value - minVal) / (maxVal - minVal)));
    return { x, y };
  };

  // Draw Line and Gradient Area
  if (count > 0) {
    // 1. Gradient Fill
    const gradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + graphHeight);
    gradient.addColorStop(0, "rgba(245, 158, 11, 0.25)"); // Accent yellow transparent
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    const firstPt = getCoords(0, points[0].maxWeight);
    ctx.moveTo(paddingLeft, paddingTop + graphHeight);
    ctx.lineTo(firstPt.x, firstPt.y);

    for (let i = 1; i < count; i++) {
      const pt = getCoords(i, points[i].maxWeight);
      ctx.lineTo(pt.x, pt.y);
    }
    
    const lastPt = getCoords(count - 1, points[count - 1].maxWeight);
    ctx.lineTo(lastPt.x, paddingTop + graphHeight);
    ctx.closePath();
    ctx.fill();

    // 2. Thick Line
    ctx.strokeStyle = "#f59e0b"; // Primary Yellow
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    ctx.moveTo(firstPt.x, firstPt.y);
    for (let i = 1; i < count; i++) {
      const pt = getCoords(i, points[i].maxWeight);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();

    // 3. Dots & Dates
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    points.forEach((p, idx) => {
      const pt = getCoords(idx, p.maxWeight);

      // Dot
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Date Label (Draw every item if short list, or skip to avoid overlap)
      const shouldDrawDate = count <= 5 || idx === 0 || idx === count - 1 || idx === Math.floor(count / 2);
      if (shouldDrawDate) {
        ctx.fillStyle = "#64748b";
        // Format MM/DD
        const dateParts = p.date.split('-');
        const shortDate = dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}` : p.date;
        ctx.fillText(shortDate, pt.x, paddingTop + graphHeight + 8);
      }
    });
  }
}

// Render Profile Details
function renderProfile() {
  document.getElementById("profile-name").value = state.profile.name || "";
  document.getElementById("profile-age").value = state.profile.age || "";
  document.getElementById("profile-weight").value = state.profile.weight || "";
  document.getElementById("profile-height").value = state.profile.height || "";
  document.getElementById("profile-target-weight").value = state.profile.targetWeight || "";
  document.getElementById("profile-goal").value = state.profile.goal || "Strength Training";

  // Render Stats Card
  const summaryName = document.getElementById("summary-name");
  const summaryGoal = document.getElementById("summary-goal-label");
  const summaryAvatar = document.getElementById("summary-avatar");
  const summaryBMI = document.getElementById("summary-bmi");
  const summaryTargetDiff = document.getElementById("summary-target-diff");
  const summaryLastActive = document.getElementById("summary-last-active");

  const name = state.profile.name || "Guest User";
  summaryName.textContent = name;
  summaryGoal.textContent = state.profile.goal;
  summaryAvatar.textContent = name.substring(0, 2).toUpperCase();

  // BMI calculation
  const weight = state.profile.weight;
  const height = state.profile.height;
  if (weight && height) {
    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
    
    let classification = "";
    if (bmi < 18.5) classification = " (Underweight)";
    else if (bmi < 25) classification = " (Normal)";
    else if (bmi < 30) classification = " (Overweight)";
    else classification = " (Obese)";

    summaryBMI.textContent = `${bmi}${classification}`;
  } else {
    summaryBMI.textContent = "--";
  }

  // Target difference
  const targetWeight = state.profile.targetWeight;
  if (weight && targetWeight) {
    const diff = (weight - targetWeight).toFixed(1);
    if (diff > 0) {
      summaryTargetDiff.textContent = `Lose ${diff} kg`;
    } else if (diff < 0) {
      summaryTargetDiff.textContent = `Gain ${Math.abs(diff)} kg`;
    } else {
      summaryTargetDiff.textContent = "Goal Reached!";
    }
  } else {
    summaryTargetDiff.textContent = "--";
  }

  // Last Active
  if (state.history.length > 0) {
    const sortedDates = state.history.map(w => w.date).sort((a,b) => new Date(b) - new Date(a));
    summaryLastActive.textContent = formatFriendlyDate(sortedDates[0]);
  } else {
    summaryLastActive.textContent = "Never";
  }
}
