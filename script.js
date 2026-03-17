const STORAGE_KEY = "destroyer66-state";
const STORAGE_VERSION = 2;
const TOTAL_DAYS = 66;
const TOTAL_WEEKS = Math.ceil(TOTAL_DAYS / 7);
const TASK_DEFINITIONS = [
  { id: "wakeUp", type: "binary", label: profile => `Wake up at ${formatTime(profile.wakeTime)}`, xp: 10 },
  { id: "sleep", type: "binary", label: profile => `Sleep by ${formatTime(profile.sleepTime)}`, xp: 10 },
  { id: "water", type: "measurable", label: profile => "Water intake", target: profile => profile.waterLiters, unit: "L", step: 0.1, xp: 10 },
  { id: "study", type: "measurable", label: profile => "Study / work", target: profile => profile.studyHours, unit: "hrs", step: 0.5, xp: 10 },
  { id: "meditation", type: "measurable", label: profile => "Meditation", target: profile => profile.meditationMinutes, unit: "min", step: 1, xp: 10 }
];

const DAILY_TASKS = TASK_DEFINITIONS.map(task => task.id);

const LEVELS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 250 },
  { level: 4, xp: 500 },
  { level: 5, xp: 900 }
];

const STRENGTH_SPLIT = [
  "Chest",
  "Shoulders",
  "Legs",
  "Abs / Core",
  "Neck",
  "Mixed Strength",
  "Rest Day"
];

const EXERCISE_LIBRARY = {
  "Chest": [
    ["Wall Push Ups", "Knee Push Ups", "Push Ups", "Decline Push Ups"],
    ["Incline Push Ups", "Incline Push Ups", "Diamond Push Ups", "Archer Push Ups"],
    ["Bench Dips", "Bench Dips", "Bench Dips", "Slow Bench Dips"],
    ["Push Up Hold", "Push Up Hold", "Tempo Push Ups", "Explosive Push Ups"]
  ],
  "Shoulders": [
    ["Arm Circles", "Arm Circles", "Arm Circles", "Slow Arm Circles"],
    ["Shoulder Taps", "Shoulder Taps", "Shoulder Taps", "Plank Shoulder Taps"],
    ["Pike Hold", "Pike Push Ups", "Pike Push Ups", "Elevated Pike Push Ups"],
    ["Wall Slides", "Wall Slides", "Handstand Wall Hold", "Handstand Lean Hold"]
  ],
  "Legs": [
    ["Box Squats", "Bodyweight Squats", "Bodyweight Squats", "Jump Squats"],
    ["Reverse Lunges", "Reverse Lunges", "Walking Lunges", "Jump Lunges"],
    ["Glute Bridges", "Glute Bridges", "Single Leg Glute Bridges", "Single Leg Hip Thrusts"],
    ["Calf Raises", "Calf Raises", "Single Leg Calf Raises", "Pause Calf Raises"]
  ],
  "Abs / Core": [
    ["Dead Bug", "Crunches", "Crunches", "V-Ups"],
    ["Forearm Plank", "Forearm Plank", "Extended Plank", "Plank Reach"],
    ["Leg Raises", "Bent Knee Raises", "Leg Raises", "Hollow Body Hold"],
    ["Russian Twists", "Russian Twists", "Bicycle Crunches", "Toe Touch Crunches"]
  ],
  "Neck": [
    ["Neck Flexion", "Neck Flexion", "Neck Flexion", "Neck Flexion"],
    ["Neck Extension", "Neck Extension", "Neck Extension", "Neck Extension"],
    ["Neck Side Hold", "Neck Side Hold", "Neck Side Hold", "Neck Side Hold"],
    ["Scapular Retraction", "Scapular Retraction", "Scapular Retraction", "Prone Y Raises"]
  ]
};

const ACHIEVEMENTS = [
  {
    id: "initiate",
    title: "The Initiate",
    description: "Complete Day 1.",
    unlockedWhen: stats => stats.completedDays >= 1
  },
  {
    id: "consistency1",
    title: "Consistency I",
    description: "Reach a 3 day streak.",
    unlockedWhen: stats => stats.maxStreak >= 3
  },
  {
    id: "consistency2",
    title: "Consistency II",
    description: "Reach a 7 day streak.",
    unlockedWhen: stats => stats.maxStreak >= 7
  },
  {
    id: "destroyer",
    title: "Destroyer",
    description: "Complete all 66 days.",
    unlockedWhen: stats => stats.completedDays >= TOTAL_DAYS
  }
];

let appState = loadState();
let activeTab = "dashboard";
let renderedDayNumber = 1;
let lastKnownDateKey = getTodayKey();
let dayWatcherId = null;

const elements = {
  setupScreen: document.getElementById("setupScreen"),
  mainScreen: document.getElementById("mainScreen"),
  setupForm: document.getElementById("setupForm"),
  setupError: document.getElementById("setupError"),
  resetButton: document.getElementById("resetButton"),
  dailyTaskList: document.getElementById("dailyTaskList"),
  strengthTitle: document.getElementById("strengthTitle"),
  strengthPlan: document.getElementById("strengthPlan"),
  strengthComplete: document.getElementById("strengthComplete"),
  strengthToggleWrap: document.getElementById("strengthToggleWrap"),
  cardioPlan: document.getElementById("cardioPlan"),
  achievementGrid: document.getElementById("achievementGrid"),
  historySummary: document.getElementById("historySummary"),
  historyGrid: document.getElementById("historyGrid"),
  dayHeading: document.getElementById("dayHeading"),
  dayFocus: document.getElementById("dayFocus"),
  challengeProgressLabel: document.getElementById("challengeProgressLabel"),
  challengePercentLabel: document.getElementById("challengePercentLabel"),
  challengeProgressBar: document.getElementById("challengeProgressBar"),
  xpTotalLabel: document.getElementById("xpTotalLabel"),
  todayXpLabel: document.getElementById("todayXpLabel"),
  xpLevelLabel: document.getElementById("xpLevelLabel"),
  xpNextLabel: document.getElementById("xpNextLabel"),
  xpProgressBar: document.getElementById("xpProgressBar"),
  weekLabel: document.getElementById("weekLabel"),
  levelBadge: document.getElementById("levelBadge"),
  streakCounter: document.getElementById("streakCounter"),
  topDayCounter: document.getElementById("topDayCounter"),
  topStreakCounter: document.getElementById("topStreakCounter"),
  tabButtons: document.querySelectorAll(".tab-button"),
  dashboardTab: document.getElementById("dashboardTab"),
  historyTab: document.getElementById("historyTab")
};

initializeApp();

function initializeApp() {
  bindEvents();
  startDayWatcher();

  if (!appState || !appState.profile || !appState.challenge) {
    showSetup();
    return;
  }

  syncAchievements();
  showMainApp();
  renderApp();
}

function bindEvents() {
  elements.setupForm.addEventListener("submit", handleSetupSubmit);
  elements.resetButton.addEventListener("click", handleResetChallenge);

  elements.strengthComplete.addEventListener("change", event => {
    updateProgressRecord(renderedDayNumber, record => {
      record.strengthComplete = event.target.checked;
    });
  });


  elements.tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      renderTabs();
    });

    button.addEventListener("keydown", event => {
      handleTabKeydown(event, button);
    });
  });
}

function handleSetupSubmit(event) {
  event.preventDefault();
  clearSetupError();

  if (!event.target.reportValidity()) {
    return;
  }

  const formData = new FormData(event.target);
  const profile = {
    wakeTime: formData.get("wakeTime"),
    sleepTime: formData.get("sleepTime"),
    studyHours: Number(formData.get("studyHours")),
    waterLiters: Number(formData.get("waterLiters")),
    meditationMinutes: Number(formData.get("meditationMinutes")),
    exerciseExperience: formData.get("exerciseExperience"),
    runningAbility: formData.get("runningAbility"),
    runningTarget: formData.get("runningTarget")
  };

  const validationError = validateProfile(profile);
  if (validationError) {
    showSetupError(validationError);
    return;
  }

  appState = createFreshState(profile);
  saveProgress();
  showMainApp();
  renderApp();
}

function handleResetChallenge() {
  if (!appState) {
    return;
  }

  const confirmed = window.confirm("Reset the challenge, clear all saved answers, and start again from the setup questions?");
  if (!confirmed) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  appState = null;
  activeTab = "dashboard";
  renderedDayNumber = 1;
  elements.setupForm.reset();
  showSetup();
}

function createFreshState(profile) {
  return {
    version: STORAGE_VERSION,
    profile,
    challenge: generateChallengePlan(profile),
    progress: {
      dayRecords: {},
      achievements: {}
    }
  };
}

// Build the full 66-day roadmap once and reuse it from LocalStorage.
function generateChallengePlan(profile, startedAt = getTodayKey()) {
  const runningStart = getRunningAbilityMeters(profile.runningAbility);
  const runningTarget = Number(profile.runningTarget);
  const strengthStartLevel = getStrengthStartLevel(profile.exerciseExperience);
  const strengthTargetLevel = Math.min(10, strengthStartLevel + 4);
  const overallStartLevel = Math.round(((strengthStartLevel + normalizeDistanceToLevel(runningStart)) / 2) * 10) / 10;
  const overallTargetLevel = Math.round(((strengthTargetLevel + normalizeDistanceToLevel(runningTarget)) / 2) * 10) / 10;
  const days = [];

  for (let dayNumber = 1; dayNumber <= TOTAL_DAYS; dayNumber += 1) {
    const weekIndex = Math.floor((dayNumber - 1) / 7);
    const splitIndex = (dayNumber - 1) % 7;
    const dayName = STRENGTH_SPLIT[splitIndex];
    const weeklyStrengthLevel = getWeeklyStrengthLevel(strengthStartLevel, strengthTargetLevel, weekIndex);

    days.push({
      dayNumber,
      weekNumber: weekIndex + 1,
      splitName: dayName,
      strength: generateWorkoutPlan(dayName, weeklyStrengthLevel, weekIndex),
      cardio: generateRunningPlan(profile, weekIndex, splitIndex)
    });
  }

  return {
    startedAt,
    generatedAt: new Date().toISOString(),
    startLevel: overallStartLevel,
    targetLevel: overallTargetLevel,
    days
  };
}

function generateWorkoutPlan(dayName, strengthLevel, weekIndex) {
  if (dayName === "Rest Day") {
    return {
      scheduled: false,
      focus: "Recovery",
      exercises: [
        {
          name: "Mobility Reset",
          detail: "10-15 minutes of stretching, light walking, and deep breathing."
        }
      ]
    };
  }

  if (dayName === "Mixed Strength") {
    return buildMixedWorkout(strengthLevel, weekIndex);
  }

  const levelTier = getExerciseTier(strengthLevel);
  const baseSets = Math.min(5, 2 + Math.floor(weekIndex / 3) + (strengthLevel >= 6 ? 1 : 0));
  const baseReps = Math.round(8 + weekIndex * 1.5 + strengthLevel);
  const exerciseCount = dayName === "Neck" ? 3 : 4;
  const sourceExercises = EXERCISE_LIBRARY[dayName].slice(0, exerciseCount);

  return {
    scheduled: true,
    focus: dayName,
    exercises: sourceExercises.map((exerciseVariants, index) => ({
      name: exerciseVariants[levelTier],
      detail: formatStrengthPrescription(dayName, index, baseSets, baseReps, weekIndex, strengthLevel)
    }))
  };
}

function buildMixedWorkout(strengthLevel, weekIndex) {
  const categories = ["Chest", "Shoulders", "Legs", "Abs / Core"];
  const tier = getExerciseTier(strengthLevel);
  const sets = Math.min(5, 2 + Math.floor(weekIndex / 2));
  const reps = Math.round(10 + weekIndex * 1.3 + strengthLevel);

  return {
    scheduled: true,
    focus: "Full Body Mix",
    exercises: categories.map((category, index) => ({
      name: EXERCISE_LIBRARY[category][index][tier],
      detail: `${sets} x ${reps}${category === "Abs / Core" ? " sec / reps mix" : ""}`
    }))
  };
}

function generateRunningPlan(profile, weekIndex, splitIndex) {
  const isRunDay = [0, 2, 4].includes(splitIndex);
  const currentAbility = getRunningAbilityMeters(profile.runningAbility);
  const targetMeters = Number(profile.runningTarget);

  if (!isRunDay) {
    return {
      scheduled: false,
      label: "Recovery day",
      detail: "No running scheduled today. Walk lightly or focus on mobility."
    };
  }

  const weekTarget = getWeeklyRunningTarget(currentAbility, targetMeters, weekIndex, profile.runningAbility === "none");
  const dayMultiplier = splitIndex === 0 ? 0.85 : splitIndex === 2 ? 1 : 1.15;
  const sessionMeters = roundDistance(weekTarget * dayMultiplier);
  const sessionStyle = getRunningStyle(profile.runningAbility, weekIndex, sessionMeters);

  return {
    scheduled: true,
    targetMeters: sessionMeters,
    label: `${sessionStyle} ${formatDistance(sessionMeters)}`,
    detail: `Session ${[0, 2, 4].indexOf(splitIndex) + 1} of 3 this week. Build steady aerobic endurance toward ${formatDistance(targetMeters)}.`
  };
}

function getWeeklyRunningTarget(startMeters, targetMeters, weekIndex, startedFromNoRunning) {
  const weekNumber = weekIndex + 1;

  if (startedFromNoRunning) {
    const seedProgression = [500, 800, 1000, 1500, 2000, 3000];

    if (weekNumber <= seedProgression.length) {
      return Math.min(targetMeters, seedProgression[weekNumber - 1]);
    }

    const remainingWeeks = TOTAL_WEEKS - seedProgression.length;
    const remainingProgress = remainingWeeks <= 1 ? 1 : (weekNumber - seedProgression.length - 1) / (remainingWeeks - 1);
    return roundDistance(interpolateValue(Math.min(targetMeters, 3000), targetMeters, remainingProgress));
  }

  const adjustedStart = Math.max(startMeters, 500);
  const weeklyIncrease = ((targetMeters - adjustedStart) / TOTAL_DAYS) * 7;
  const projected = adjustedStart + weeklyIncrease * weekIndex;
  return roundDistance(Math.max(500, Math.min(targetMeters, projected)));
}

function getWeeklyStrengthLevel(startLevel, targetLevel, weekIndex) {
  const dailyIncrease = (targetLevel - startLevel) / TOTAL_DAYS;
  return startLevel + dailyIncrease * 7 * weekIndex;
}

function formatStrengthPrescription(dayName, exerciseIndex, sets, reps, weekIndex, strengthLevel) {
  const adjustedSets = Math.min(5, sets + (exerciseIndex === 0 && weekIndex > 5 ? 1 : 0));
  const adjustedReps = Math.max(6, reps + exerciseIndex * 2);

  if (dayName === "Abs / Core" && exerciseIndex === 1) {
    return `${adjustedSets} x ${Math.max(20, adjustedReps + 10)} sec`;
  }

  if (dayName === "Neck") {
    return `${Math.max(2, adjustedSets - 1)} x ${Math.max(10, Math.round(10 + strengthLevel + weekIndex))} controlled reps`;
  }

  return `${adjustedSets} x ${adjustedReps}`;
}

// Update a single day record, then recalculate rewards and UI.
function updateProgressRecord(dayNumber, updater) {
  if (!dayNumber || !appState) {
    return;
  }

  const record = getDayRecord(dayNumber);
  updater(record);
  appState.progress.dayRecords[String(dayNumber)] = record;
  syncAchievements();
  saveProgress();
  renderApp();
}

function syncAchievements() {
  if (!appState) {
    return;
  }

  const stats = calculateStats();

  ACHIEVEMENTS.forEach(achievement => {
    const alreadyUnlocked = appState.progress.achievements[achievement.id];
    if (!alreadyUnlocked && achievement.unlockedWhen(stats)) {
      appState.progress.achievements[achievement.id] = getTodayKey();
    }
  });
}

function saveProgress() {
  if (!appState) {
    return;
  }

  appState.version = STORAGE_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return normalizeState(JSON.parse(stored));
  } catch (error) {
    console.error("Failed to parse stored challenge data.", error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function renderApp() {
  if (!appState || !appState.challenge) {
    showSetup();
    return;
  }

  syncAchievements();
  saveProgress();

  const currentDayNumber = getCurrentDayNumber();
  renderedDayNumber = currentDayNumber;
  const dayPlan = getDayPlan(currentDayNumber);
  const dayRecord = getDayRecord(currentDayNumber);
  const stats = calculateStats();
  const xpData = updateXP(stats.totalXP);

  renderDashboard(dayPlan, dayRecord, stats, xpData);
  renderAchievements();
  renderHistory(stats);
  renderTabs();
}

function renderDashboard(dayPlan, dayRecord, stats, xpData) {
  const completedCount = stats.completedDays;
  const challengePercent = Math.round((completedCount / TOTAL_DAYS) * 100);
  const todayXp = calculateDayXP(dayPlan, dayRecord);
  const challengeEnded = hasChallengeEnded();

  elements.dayHeading.textContent = challengeEnded ? "Day 66 - Final Push" : `Day ${getCurrentDayNumber()}`;
  elements.dayFocus.textContent = `${dayPlan.splitName} focus for Week ${dayPlan.weekNumber}. Start level ${appState.challenge.startLevel} -> target level ${appState.challenge.targetLevel}.`;
  elements.challengeProgressLabel.textContent = `${completedCount} / ${TOTAL_DAYS} complete`;
  elements.challengePercentLabel.textContent = `${challengePercent}%`;
  elements.challengeProgressBar.style.width = `${challengePercent}%`;

  elements.xpTotalLabel.textContent = `${stats.totalXP} XP`;
  elements.todayXpLabel.textContent = `${todayXp} XP`;
  elements.xpLevelLabel.textContent = `Level ${xpData.current.level}`;
  elements.xpNextLabel.textContent = xpData.nextLevel ? `Next at ${xpData.nextLevel.xp} XP` : "Max level reached";
  elements.xpProgressBar.style.width = `${xpData.progressPercent}%`;
  elements.weekLabel.textContent = `Week ${dayPlan.weekNumber}`;
  elements.levelBadge.textContent = `Level ${xpData.current.level}`;
  elements.streakCounter.textContent = `${stats.currentStreak} day streak`;
  elements.topDayCounter.textContent = `Day ${getCurrentDayNumber()} / ${TOTAL_DAYS}`;
  elements.topStreakCounter.textContent = `🔥 ${stats.currentStreak}`;

  renderDailyTasks(dayRecord);
  renderStrength(dayPlan, dayRecord);
  renderCardio(dayPlan, dayRecord);
}

function renderDailyTasks(dayRecord) {
  const profile = appState.profile;

  elements.dailyTaskList.innerHTML = TASK_DEFINITIONS
    .map(task => {
      if (task.type === "binary") {
        const checked = Boolean(dayRecord.taskChecks[task.id]);
        const xpEarned = checked ? task.xp : 0;
        return `
          <div class="task-item ${checked ? "completed" : ""}">
            <div class="task-copy">
              <strong>${task.label(profile)}</strong>
              <span>Binary task · ${xpEarned}/${task.xp} XP</span>
            </div>
            <label class="toggle-pill">
              <input class="check-input" type="checkbox" data-task-id="${task.id}" ${checked ? "checked" : ""}>
              <span>${checked ? "Done" : "Mark done"}</span>
            </label>
          </div>
        `;
      }

      const target = task.target(profile);
      const rawValue = Number(dayRecord.taskValues[task.id] || 0);
      const value = clampNumber(rawValue, 0, target * 2, 0);
      const progress = Math.min(1, target === 0 ? 0 : value / target);
      const percent = Math.round(progress * 100);
      const xpEarned = Math.round(task.xp * progress);

      return `
        <div class="task-item ${percent >= 100 ? "completed" : ""}">
          <div class="task-copy">
            <strong>${task.label(profile)} <span class="muted">(${target} ${task.unit})</span></strong>
            <span>${percent}% complete · ${xpEarned}/${task.xp} XP</span>
          </div>
          <div class="task-input-row">
            <input class="task-metric-input" type="number" min="0" step="${task.step}" value="${value}" data-task-value="${task.id}">
            <span class="task-unit">${task.unit}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${percent}%"></div>
          </div>
        </div>
      `;
    })
    .join("");

  elements.dailyTaskList.querySelectorAll("[data-task-id]").forEach(input => {
    input.addEventListener("change", event => {
      const taskId = event.target.dataset.taskId;
      updateProgressRecord(renderedDayNumber, record => {
        record.taskChecks[taskId] = event.target.checked;
      });
    });
  });

  elements.dailyTaskList.querySelectorAll("[data-task-value]").forEach(input => {
    input.addEventListener("input", event => {
      const taskId = event.target.dataset.taskValue;
      updateProgressRecord(renderedDayNumber, record => {
        record.taskValues[taskId] = Number(event.target.value) || 0;
      });
    });
  });
}

function renderStrength(dayPlan, dayRecord) {
  elements.strengthTitle.textContent = dayPlan.strength.focus;
  elements.strengthPlan.innerHTML = dayPlan.strength.exercises
    .map(exercise => `
      <div class="exercise-item">
        <strong>${exercise.name}</strong>
        <span>${exercise.detail}</span>
      </div>
    `)
    .join("");

  const shouldDisable = !dayPlan.strength.scheduled;
  elements.strengthComplete.checked = shouldDisable ? false : Boolean(dayRecord.strengthComplete);
  elements.strengthComplete.disabled = shouldDisable;
  elements.strengthToggleWrap.classList.toggle("disabled", shouldDisable);
}

function renderCardio(dayPlan, dayRecord) {
  if (!dayPlan.cardio.scheduled) {
    elements.cardioPlan.innerHTML = `
      <div class="exercise-item">
        <strong>${dayPlan.cardio.label}</strong>
        <span>${dayPlan.cardio.detail}</span>
      </div>
    `;
    return;
  }

  const targetMeters = Number(dayPlan.cardio.targetMeters || 0);
  const distance = clampNumber(dayRecord.cardioMeters || 0, 0, targetMeters * 2, 0);
  const progress = Math.min(1, targetMeters === 0 ? 0 : distance / targetMeters);
  const percent = Math.round(progress * 100);
  const xpEarned = Math.round(30 * progress);

  elements.cardioPlan.innerHTML = `
    <div class="exercise-item ${percent >= 100 ? "completed" : ""}">
      <strong>${dayPlan.cardio.label}</strong>
      <span>${dayPlan.cardio.detail}</span>
      <div class="task-input-row">
        <input id="cardioDistanceInput" class="task-metric-input" type="number" min="0" step="0.1" value="${(distance / 1000).toFixed(1)}">
        <span class="task-unit">km / target ${(targetMeters / 1000).toFixed(1)} km</span>
      </div>
      <div class="progress-track"><div class="progress-fill xp" style="width:${percent}%"></div></div>
      <span>${percent}% complete · ${xpEarned}/30 XP</span>
    </div>
  `;

  const cardioInput = document.getElementById("cardioDistanceInput");
  if (cardioInput) {
    cardioInput.addEventListener("input", event => {
      const valueKm = Number(event.target.value) || 0;
      updateProgressRecord(renderedDayNumber, record => {
        record.cardioMeters = Math.round(valueKm * 1000);
        record.cardioComplete = record.cardioMeters >= targetMeters;
      });
    });
  }
}

function renderAchievements() {
  const unlockedEntries = ACHIEVEMENTS
    .filter(achievement => appState.progress.achievements[achievement.id])
    .map(achievement => ({
      ...achievement,
      unlockedAt: appState.progress.achievements[achievement.id]
    }));

  if (unlockedEntries.length === 0) {
    elements.achievementGrid.innerHTML = `<div class="empty-state">No achievements unlocked yet. Finish today strong.</div>`;
    return;
  }

  elements.achievementGrid.innerHTML = unlockedEntries
    .map(achievement => `
      <article class="achievement-card">
        <strong>${achievement.title}</strong>
        <span>${achievement.description}</span>
        <span>Unlocked on ${formatDateLabel(achievement.unlockedAt)}</span>
      </article>
    `)
    .join("");
}

function renderHistory(stats) {
  const elapsedDays = Math.min(getCurrentDayNumber(), TOTAL_DAYS);
  const trackedDays = Math.max(1, elapsedDays);
  const completionRate = Math.round((stats.completedDays / trackedDays) * 100);

  elements.historySummary.innerHTML = `
    <div class="history-stat">
      <span class="mini-label">Completed Days</span>
      <strong>${stats.completedDays}</strong>
    </div>
    <div class="history-stat">
      <span class="mini-label">Missed Days</span>
      <strong>${stats.missedDays}</strong>
    </div>
    <div class="history-stat">
      <span class="mini-label">Completion Rate</span>
      <strong>${completionRate}%</strong>
    </div>
  `;

  elements.historyGrid.innerHTML = appState.challenge.days
    .map(dayPlan => {
      const status = getDayStatus(dayPlan.dayNumber);
      const dayXp = calculateDayXP(dayPlan, getDayRecord(dayPlan.dayNumber));

      return `
        <article class="history-card ${status}">
          <strong>Day ${dayPlan.dayNumber}</strong>
          <span>Week ${dayPlan.weekNumber} - ${dayPlan.splitName}</span>
          <span>${dayPlan.cardio.scheduled ? dayPlan.cardio.label : "No run scheduled"}</span>
          <span>${dayXp} XP earned</span>
          <div class="status-badge ${status}">${labelizeStatus(status)}</div>
        </article>
      `;
    })
    .join("");
}

function renderTabs() {
  elements.tabButtons.forEach(button => {
    const isActive = button.dataset.tab === activeTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.setAttribute("tabindex", isActive ? "0" : "-1");
  });

  const dashboardHidden = activeTab !== "dashboard";
  const historyHidden = activeTab !== "history";

  elements.dashboardTab.classList.toggle("hidden", dashboardHidden);
  elements.historyTab.classList.toggle("hidden", historyHidden);
  elements.dashboardTab.toggleAttribute("hidden", dashboardHidden);
  elements.historyTab.toggleAttribute("hidden", historyHidden);
}

function showSetup() {
  clearSetupError();
  elements.setupScreen.classList.remove("hidden");
  elements.mainScreen.classList.add("hidden");
}

function showMainApp() {
  elements.setupScreen.classList.add("hidden");
  elements.mainScreen.classList.remove("hidden");
}

function getDayPlan(dayNumber) {
  return appState.challenge.days[Math.max(0, Math.min(TOTAL_DAYS, dayNumber) - 1)];
}

function getDayRecord(dayNumber) {
  return (
    appState.progress.dayRecords[String(dayNumber)] || {
      taskChecks: {
        wakeUp: false,
        sleep: false
      },
      taskValues: {
        water: 0,
        study: 0,
        meditation: 0
      },
      strengthComplete: false,
      cardioComplete: false,
      cardioMeters: 0
    }
  );
}

// Aggregate challenge-wide stats from the saved day records.
function calculateStats() {
  const currentDay = getCurrentDayNumber();
  const availableDays = Math.min(currentDay, TOTAL_DAYS);
  let completedDays = 0;
  let missedDays = 0;
  let totalXP = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let rollingStreak = 0;

  for (let dayNumber = 1; dayNumber <= TOTAL_DAYS; dayNumber += 1) {
    const dayPlan = getDayPlan(dayNumber);
    const dayRecord = getDayRecord(dayNumber);
    const dayComplete = isDayComplete(dayPlan, dayRecord);

    totalXP += calculateDayXP(dayPlan, dayRecord);

    if (dayNumber <= availableDays) {
      if (dayComplete) {
        completedDays += 1;
        rollingStreak += 1;
        maxStreak = Math.max(maxStreak, rollingStreak);
      } else {
        if (dayNumber < currentDay) {
          missedDays += 1;
        }
        rollingStreak = 0;
      }
    }
  }

  let streakCursor = Math.min(currentDay, TOTAL_DAYS);
  if (streakCursor >= 1 && !isDayComplete(getDayPlan(streakCursor), getDayRecord(streakCursor))) {
    streakCursor -= 1;
  }

  while (streakCursor >= 1 && isDayComplete(getDayPlan(streakCursor), getDayRecord(streakCursor))) {
    currentStreak += 1;
    streakCursor -= 1;
  }

  return {
    completedDays,
    missedDays,
    totalXP,
    currentStreak,
    maxStreak
  };
}

function calculateDayXP(dayPlan, dayRecord) {
  const profile = appState.profile;
  const taskXP = TASK_DEFINITIONS.reduce((total, task) => {
    if (task.type === "binary") {
      return total + (dayRecord.taskChecks[task.id] ? task.xp : 0);
    }

    const target = task.target(profile);
    const actual = Number(dayRecord.taskValues[task.id] || 0);
    const ratio = Math.max(0, Math.min(1, target === 0 ? 0 : actual / target));
    return total + Math.round(task.xp * ratio);
  }, 0);

  const cardioRatio = dayPlan.cardio.scheduled
    ? Math.max(0, Math.min(1, (dayRecord.cardioMeters || 0) / (dayPlan.cardio.targetMeters || 1)))
    : 1;
  const cardioXP = Math.round(30 * cardioRatio);
  const strengthXP = dayPlan.strength.scheduled ? (dayRecord.strengthComplete ? 30 : 0) : 30;
  const dailyTasksComplete = TASK_DEFINITIONS.every(task => getTaskCompletionRatio(task, dayRecord, profile) >= 1);
  const workoutComplete = (!dayPlan.strength.scheduled || dayRecord.strengthComplete) && cardioRatio >= 1;
  const completionBonus = dailyTasksComplete ? 50 : 0;
  const workoutBonus = workoutComplete ? 20 : 0;
  const streakXP = isDayComplete(dayPlan, dayRecord) ? 5 : 0;

  return taskXP + cardioXP + strengthXP + completionBonus + workoutBonus + streakXP;
}

function isDayComplete(dayPlan, dayRecord) {
  const profile = appState.profile;
  const tasksComplete = TASK_DEFINITIONS.every(task => getTaskCompletionRatio(task, dayRecord, profile) >= 1);
  const strengthDone = !dayPlan.strength.scheduled || dayRecord.strengthComplete;
  const cardioDone = !dayPlan.cardio.scheduled || (dayRecord.cardioMeters || 0) >= (dayPlan.cardio.targetMeters || 0);
  return tasksComplete && strengthDone && cardioDone;
}

function getTaskCompletionRatio(task, dayRecord, profile) {
  if (task.type === "binary") {
    return dayRecord.taskChecks[task.id] ? 1 : 0;
  }

  const target = task.target(profile);
  const actual = Number(dayRecord.taskValues[task.id] || 0);
  return Math.max(0, Math.min(1, target === 0 ? 0 : actual / target));
}

function updateXP(totalXP) {
  let currentLevel = LEVELS[0];
  let nextLevel = null;

  LEVELS.forEach((level, index) => {
    if (totalXP >= level.xp) {
      currentLevel = level;
      nextLevel = LEVELS[index + 1] || null;
    }
  });

  if (!nextLevel) {
    return {
      current: currentLevel,
      nextLevel: null,
      progressPercent: 100
    };
  }

  const span = nextLevel.xp - currentLevel.xp;
  const currentProgress = totalXP - currentLevel.xp;

  return {
    current: currentLevel,
    nextLevel,
    progressPercent: Math.min(100, Math.round((currentProgress / span) * 100))
  };
}

function getCurrentDayNumber() {
  if (!appState || !appState.challenge) {
    return 1;
  }

  const elapsed = getDayDifference(appState.challenge.startedAt, getTodayKey()) + 1;
  return Math.max(1, Math.min(TOTAL_DAYS, elapsed));
}

function getDayDifference(startKey, endKey) {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);

  if (!start || !end) {
    return 0;
  }

  const difference = end.getTime() - start.getTime();
  return Math.floor(difference / (1000 * 60 * 60 * 24));
}

function getDayStatus(dayNumber) {
  const currentDay = getCurrentDayNumber();
  const dayComplete = isDayComplete(getDayPlan(dayNumber), getDayRecord(dayNumber));

  if (dayComplete) {
    return "completed";
  }

  if (dayNumber < currentDay) {
    return "missed";
  }

  if (dayNumber === currentDay) {
    return "today";
  }

  return "pending";
}

function hasChallengeEnded() {
  return Boolean(appState && getDayDifference(appState.challenge.startedAt, getTodayKey()) + 1 >= TOTAL_DAYS);
}

function getStrengthStartLevel(experience) {
  const map = {
    none: 1,
    beginner: 3,
    intermediate: 5,
    advanced: 7
  };

  return map[experience] || 1;
}

function getExerciseTier(strengthLevel) {
  if (strengthLevel < 2.5) {
    return 0;
  }
  if (strengthLevel < 4.5) {
    return 1;
  }
  if (strengthLevel < 6.5) {
    return 2;
  }
  return 3;
}

function getRunningAbilityMeters(runningAbility) {
  const abilityMap = {
    none: 0,
    500: 500,
    1000: 1000,
    3000: 3000,
    5000: 5000
  };

  return abilityMap[runningAbility] || 0;
}

function normalizeDistanceToLevel(distance) {
  return Math.min(10, Math.max(1, distance / 1000));
}

function getRunningStyle(runningAbility, weekIndex, sessionMeters) {
  if (runningAbility === "none" && weekIndex <= 1) {
    return "Walk";
  }

  if (weekIndex <= 2 || sessionMeters <= 1000) {
    return "Walk / Jog";
  }

  if (weekIndex <= 4 || sessionMeters <= 2500) {
    return "Jog";
  }

  return "Run";
}

function roundDistance(distance) {
  return Math.round(distance / 100) * 100;
}

function formatDistance(distance) {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(distance % 1000 === 0 ? 0 : 1)} km`;
  }

  return `${distance} m`;
}

function formatTime(timeValue) {
  const [hours, minutes] = timeValue.split(":");
  const hourNumber = Number(hours);
  const suffix = hourNumber >= 12 ? "PM" : "AM";
  const displayHour = hourNumber % 12 || 12;
  return `${displayHour}:${minutes} ${suffix}`;
}

function formatNumber(value) {
  return Number.isInteger(value) ? value : value.toFixed(1);
}

function formatDateLabel(dateKey) {
  const date = parseDateKey(dateKey);

  if (!date) {
    return "Unknown date";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function interpolateValue(start, end, progress) {
  return start + (end - start) * Math.max(0, Math.min(1, progress));
}

function labelizeStatus(status) {
  const labels = {
    completed: "Completed",
    missed: "Missed",
    today: "Today",
    pending: "Pending"
  };

  return labels[status] || status;
}

function validateProfile(profile) {
  const runningAbilityMeters = getRunningAbilityMeters(profile.runningAbility);
  const runningTargetMeters = Number(profile.runningTarget);

  if (runningTargetMeters < runningAbilityMeters) {
    return "Running target should be equal to or higher than your current running ability.";
  }

  return null;
}

function showSetupError(message) {
  elements.setupError.textContent = message;
  elements.setupError.classList.remove("hidden");
}

function clearSetupError() {
  elements.setupError.textContent = "";
  elements.setupError.classList.add("hidden");
}

function handleTabKeydown(event, button) {
  const buttons = Array.from(elements.tabButtons);
  const currentIndex = buttons.indexOf(button);

  if (currentIndex === -1) {
    return;
  }

  let nextIndex = currentIndex;
  if (event.key === "ArrowRight") {
    nextIndex = (currentIndex + 1) % buttons.length;
  } else if (event.key === "ArrowLeft") {
    nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = buttons.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  const nextButton = buttons[nextIndex];
  activeTab = nextButton.dataset.tab;
  renderTabs();
  nextButton.focus();
}

function startDayWatcher() {
  if (dayWatcherId !== null) {
    window.clearInterval(dayWatcherId);
  }

  dayWatcherId = window.setInterval(() => {
    const todayKey = getTodayKey();
    if (todayKey === lastKnownDateKey) {
      return;
    }

    lastKnownDateKey = todayKey;
    if (appState && appState.challenge) {
      renderApp();
    }
  }, 60000);
}

function normalizeState(state) {
  if (!state || typeof state !== "object") {
    return null;
  }

  const profile = normalizeProfile(state.profile);
  if (!profile) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }

  const challenge = normalizeChallenge(state.challenge, profile);
  const progress = normalizeProgress(state.progress);

  return {
    version: STORAGE_VERSION,
    profile,
    challenge,
    progress
  };
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  const wakeTime = normalizeTime(profile.wakeTime);
  const sleepTime = normalizeTime(profile.sleepTime);
  const exerciseExperience = ["none", "beginner", "intermediate", "advanced"].includes(profile.exerciseExperience)
    ? profile.exerciseExperience
    : "none";
  const runningAbility = ["none", "500", "1000", "3000", "5000"].includes(profile.runningAbility)
    ? profile.runningAbility
    : "none";
  let runningTarget = ["3000", "5000", "10000"].includes(String(profile.runningTarget))
    ? String(profile.runningTarget)
    : "3000";

  if (!wakeTime || !sleepTime) {
    return null;
  }

  if (Number(runningTarget) < getRunningAbilityMeters(runningAbility)) {
    runningTarget = String(Math.max(3000, getRunningAbilityMeters(runningAbility)));
  }

  return {
    wakeTime,
    sleepTime,
    studyHours: clampNumber(profile.studyHours, 1, 16, 3),
    waterLiters: clampNumber(profile.waterLiters, 1, 8, 2.5),
    meditationMinutes: clampNumber(profile.meditationMinutes, 1, 120, 10),
    exerciseExperience,
    runningAbility,
    runningTarget
  };
}

function normalizeChallenge(challenge, profile) {
  const startedAt = challenge && isValidDateKey(challenge.startedAt) ? challenge.startedAt : getTodayKey();
  return generateChallengePlan(profile, startedAt);
}

function normalizeProgress(progress) {
  const safeProgress = progress && typeof progress === "object" ? progress : {};
  const sourceDayRecords = safeProgress.dayRecords && typeof safeProgress.dayRecords === "object" ? safeProgress.dayRecords : {};
  const normalizedDayRecords = {};

  Object.keys(sourceDayRecords).forEach(dayKey => {
    const dayNumber = Number(dayKey);
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > TOTAL_DAYS) {
      return;
    }

    normalizedDayRecords[String(dayNumber)] = normalizeDayRecord(sourceDayRecords[dayKey]);
  });

  const sourceAchievements = safeProgress.achievements && typeof safeProgress.achievements === "object"
    ? safeProgress.achievements
    : {};
  const validAchievementIds = new Set(ACHIEVEMENTS.map(achievement => achievement.id));
  const normalizedAchievements = {};

  Object.entries(sourceAchievements).forEach(([achievementId, unlockedAt]) => {
    if (validAchievementIds.has(achievementId) && isValidDateKey(unlockedAt)) {
      normalizedAchievements[achievementId] = unlockedAt;
    }
  });

  return {
    dayRecords: normalizedDayRecords,
    achievements: normalizedAchievements
  };
}

function normalizeDayRecord(record) {
  const sourceRecord = record && typeof record === "object" ? record : {};
  const sourceTaskChecks = sourceRecord.taskChecks && typeof sourceRecord.taskChecks === "object" ? sourceRecord.taskChecks : {};
  const sourceTaskValues = sourceRecord.taskValues && typeof sourceRecord.taskValues === "object" ? sourceRecord.taskValues : {};

  return {
    taskChecks: {
      wakeUp: Boolean(sourceTaskChecks.wakeUp),
      sleep: Boolean(sourceTaskChecks.sleep)
    },
    taskValues: {
      water: clampNumber(sourceTaskValues.water, 0, 50, 0),
      study: clampNumber(sourceTaskValues.study, 0, 24, 0),
      meditation: clampNumber(sourceTaskValues.meditation, 0, 400, 0)
    },
    strengthComplete: Boolean(sourceRecord.strengthComplete),
    cardioComplete: Boolean(sourceRecord.cardioComplete),
    cardioMeters: clampNumber(sourceRecord.cardioMeters, 0, 100000, 0)
  };
}

function normalizeTime(value) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : null;
}

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numericValue));
}

function isValidDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseDateKey(dateKey) {
  if (!isValidDateKey(dateKey)) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
