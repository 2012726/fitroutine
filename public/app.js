// Global state variables
let currentUserId = null;
let calorieChart = null;

// Daily Target Goals (for percentage progress calculations)
const GOALS = {
  carbs: 150,    // grams
  protein: 75,   // grams
  fat: 50        // grams
};

// Date utilities
document.getElementById('today-date-display').textContent = new Date().toLocaleDateString('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short'
});

// ==========================================
// ON PAGE LOAD & AUTHENTICATION CHECK
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  checkAuthentication();
  initTabNavigation();
  initFormHandlers();
  initSeedHandler();
});

async function checkAuthentication() {
  try {
    const res = await fetch('/auth/me');
    const data = await res.json();

    if (!res.ok || !data.success) {
      // Not authenticated, redirect to login page
      window.location.href = '/login.html';
      return;
    }

    // Authenticated successfully
    currentUserId = data.user.id;
    const username = data.user.username;
    
    // Display Username
    document.getElementById('user-display-name').textContent = username;
    document.getElementById('avatar-letter').textContent = username.charAt(0).toUpperCase();

    // Initial Data Fetch
    refreshAllData();
  } catch (error) {
    console.error('Authentication check failed:', error);
    window.location.href = '/login.html';
  }
}

// Helper to refresh everything
function refreshAllData() {
  fetchDashboardSummary();
  fetchWorkouts();
  fetchMeals();
}

// ==========================================
// VIEW NAVIGATION (Tab Control)
// ==========================================
function initTabNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const tabViews = document.querySelectorAll('.tab-view');
  const pageTitle = document.getElementById('page-title');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // Deactivate all links & hide all views
      navLinks.forEach(l => l.classList.remove('active'));
      tabViews.forEach(v => v.classList.remove('active'));

      // Activate clicked link
      link.classList.add('active');
      const targetTab = link.getAttribute('data-tab');
      document.getElementById(`tab-${targetTab}`).classList.add('active');

      // Update Top Page Title
      if (targetTab === 'dashboard') pageTitle.textContent = '대시보드';
      else if (targetTab === 'workouts') pageTitle.textContent = '운동 기록 관리';
      else if (targetTab === 'meals') pageTitle.textContent = '식단 칼로리 관리';
    });
  });
}

// ==========================================
// DASHBOARD & CHART.JS RENDERING
// ==========================================
async function fetchDashboardSummary() {
  try {
    const res = await fetch('/api/summary');
    const data = await res.json();

    if (!res.ok || !data.success) return;

    const summary = data.summary;

    // 1. Update Card Values
    document.getElementById('stat-consumed').textContent = summary.todayConsumed.toLocaleString();
    document.getElementById('stat-burned').textContent = summary.todayBurned.toLocaleString();
    const net = summary.todayConsumed - summary.todayBurned;
    const netEl = document.getElementById('stat-net');
    netEl.textContent = net.toLocaleString();
    
    // Net calorie color styling
    if (net > 0) {
      netEl.style.color = '#ef4444'; // Reddish/warning if positive (surplus)
    } else {
      netEl.style.color = '#10b981'; // Greenish/good if negative (deficit)
    }

    // 2. Update Nutrition Progress Bars
    const macros = summary.macros;
    document.getElementById('macro-carbs-val').textContent = `${macros.carbs}g / ${GOALS.carbs}g`;
    document.getElementById('macro-protein-val').textContent = `${macros.protein}g / ${GOALS.protein}g`;
    document.getElementById('macro-fat-val').textContent = `${macros.fat}g / ${GOALS.fat}g`;

    const carbsPercent = Math.min((macros.carbs / GOALS.carbs) * 100, 100);
    const proteinPercent = Math.min((macros.protein / GOALS.protein) * 100, 100);
    const fatPercent = Math.min((macros.fat / GOALS.fat) * 100, 100);

    document.getElementById('macro-carbs-bar').style.width = `${carbsPercent}%`;
    document.getElementById('macro-protein-bar').style.width = `${proteinPercent}%`;
    document.getElementById('macro-fat-bar').style.width = `${fatPercent}%`;

    // 3. Render/Update Chart.js Line Chart
    renderChart(summary.chart);
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
  }
}

function renderChart(chartData) {
  const ctx = document.getElementById('weekly-calorie-chart').getContext('2d');

  if (calorieChart) {
    calorieChart.destroy();
  }

  // Define Neon Color Gradients
  const purpleGradient = ctx.createLinearGradient(0, 0, 0, 250);
  purpleGradient.addColorStop(0, 'rgba(147, 51, 234, 0.4)');
  purpleGradient.addColorStop(1, 'rgba(147, 51, 234, 0.0)');

  const cyanGradient = ctx.createLinearGradient(0, 0, 0, 250);
  cyanGradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
  cyanGradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

  calorieChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: '섭취 칼로리 (Consumed)',
          data: chartData.consumed,
          borderColor: '#9333ea',
          backgroundColor: purpleGradient,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: '#a855f7',
          pointHoverRadius: 7
        },
        {
          label: '소모 칼로리 (Burned)',
          data: chartData.burned,
          borderColor: '#06b6d4',
          backgroundColor: cyanGradient,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: '#22d3ee',
          pointHoverRadius: 7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#9ca3af',
            font: { family: 'Outfit, Noto Sans KR' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(7, 9, 19, 0.9)',
          titleFont: { family: 'Outfit, Noto Sans KR', size: 13 },
          bodyFont: { family: 'Outfit, Noto Sans KR', size: 13 },
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: { color: '#9ca3af', font: { family: 'Outfit, Noto Sans KR' } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: { color: '#9ca3af', font: { family: 'Outfit, Noto Sans KR' } },
          min: 0
        }
      }
    }
  });
}

// ==========================================
// WORKOUTS CRUD MANAGEMENT
// ==========================================
async function fetchWorkouts() {
  try {
    const res = await fetch('/api/workouts');
    const data = await res.json();

    if (!res.ok || !data.success) return;

    const listBody = document.getElementById('workout-list-body');
    listBody.innerHTML = '';

    if (data.count === 0) {
      listBody.innerHTML = `<tr><td colspan="6" class="text-center">기록이 없습니다. 새로운 운동을 등록하세요!</td></tr>`;
      return;
    }

    data.data.forEach(workout => {
      const row = document.createElement('tr');
      
      const formattedDate = new Date(workout.date).toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit'
      });

      let badgeClass = 'badge-other';
      if (workout.category === 'Cardio') badgeClass = 'badge-cardio';
      else if (workout.category === 'Strength') badgeClass = 'badge-strength';
      else if (workout.category === 'Flexibility') badgeClass = 'badge-flexibility';

      row.innerHTML = `
        <td>${formattedDate}</td>
        <td><strong>${workout.title}</strong></td>
        <td><span class="badge ${badgeClass}">${getCategoryKo(workout.category)}</span></td>
        <td>${workout.duration}분</td>
        <td><span style="color:#06b6d4; font-weight:600;">-${workout.calories} kcal</span></td>
        <td>
          <button class="btn-delete" onclick="deleteWorkout('${workout._id}')">삭제</button>
        </td>
      `;

      listBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching workouts:', error);
  }
}

function getCategoryKo(cat) {
  const map = { Cardio: '유산소', Strength: '근력', Flexibility: '유연성', Other: '기타' };
  return map[cat] || cat;
}

async function deleteWorkout(id) {
  if (!confirm('정말 이 운동 기록을 삭제하시겠습니까?')) return;

  try {
    const res = await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok && data.success) {
      refreshAllData();
    } else {
      alert(data.message || '삭제 실패');
    }
  } catch (error) {
    console.error('Error deleting workout:', error);
  }
}

// ==========================================
// MEALS CRUD MANAGEMENT
// ==========================================
async function fetchMeals() {
  try {
    const res = await fetch('/api/meals');
    const data = await res.json();

    if (!res.ok || !data.success) return;

    const listBody = document.getElementById('meal-list-body');
    listBody.innerHTML = '';

    if (data.count === 0) {
      listBody.innerHTML = `<tr><td colspan="6" class="text-center">기록이 없습니다. 새로운 식단을 등록하세요!</td></tr>`;
      return;
    }

    data.data.forEach(meal => {
      const row = document.createElement('tr');
      
      const formattedDate = new Date(meal.date).toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit'
      });

      let badgeClass = 'badge-breakfast';
      if (meal.type === 'Lunch') badgeClass = 'badge-lunch';
      else if (meal.type === 'Dinner') badgeClass = 'badge-dinner';
      else if (meal.type === 'Snack') badgeClass = 'badge-snack';

      row.innerHTML = `
        <td>${formattedDate}</td>
        <td><strong>${meal.title}</strong></td>
        <td><span class="badge ${badgeClass}">${getTypeKo(meal.type)}</span></td>
        <td><span style="color:#9333ea; font-weight:600;">+${meal.calories} kcal</span></td>
        <td><span class="macro-split">탄 ${meal.carbs || 0}g | 단 ${meal.protein || 0}g | 지 ${meal.fat || 0}g</span></td>
        <td>
          <button class="btn-delete" onclick="deleteMeal('${meal._id}')">삭제</button>
        </td>
      `;

      listBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching meals:', error);
  }
}

function getTypeKo(type) {
  const map = { Breakfast: '아침', Lunch: '점심', Dinner: '저녁', Snack: '간식' };
  return map[type] || type;
}

async function deleteMeal(id) {
  if (!confirm('정말 이 식단 기록을 삭제하시겠습니까?')) return;

  try {
    const res = await fetch(`/api/meals/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok && data.success) {
      refreshAllData();
    } else {
      alert(data.message || '삭제 실패');
    }
  } catch (error) {
    console.error('Error deleting meal:', error);
  }
}

// ==========================================
// FORM SUBMISSION HANDLERS
// ==========================================
function initFormHandlers() {
  // 1. Workout Form
  const workoutForm = document.getElementById('workout-form');
  workoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('workout-title').value;
    const category = document.getElementById('workout-category').value;
    const duration = document.getElementById('workout-duration').value;
    const calories = document.getElementById('workout-calories').value;
    const dateInput = document.getElementById('workout-date').value;

    const payload = { title, category, duration, calories };
    if (dateInput) {
      payload.date = dateInput;
    }

    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        workoutForm.reset();
        refreshAllData();
      } else {
        alert(data.message || '기록 저장 실패');
      }
    } catch (error) {
      console.error('Workout log submit error:', error);
    }
  });

  // 2. Meal Form
  const mealForm = document.getElementById('meal-form');
  mealForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('meal-title').value;
    const type = document.getElementById('meal-type').value;
    const calories = document.getElementById('meal-calories').value;
    const protein = document.getElementById('meal-protein').value;
    const carbs = document.getElementById('meal-carbs').value;
    const fat = document.getElementById('meal-fat').value;
    const dateInput = document.getElementById('meal-date').value;

    const payload = { title, type, calories, protein, carbs, fat };
    if (dateInput) {
      payload.date = dateInput;
    }

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        mealForm.reset();
        refreshAllData();
      } else {
        alert(data.message || '식단 저장 실패');
      }
    } catch (error) {
      console.error('Meal log submit error:', error);
    }
  });
}

// ==========================================
// SEEDING HANDLER (Load Demo Data)
// ==========================================
function initSeedHandler() {
  const seedBtn = document.getElementById('btn-seed');
  seedBtn.addEventListener('click', async () => {
    if (!confirm('7일 동안의 가상 데이터를 데이터베이스에 채우겠습니까? (이전의 모든 정보는 덮어씌워집니다.)')) return;

    seedBtn.disabled = true;
    seedBtn.textContent = '⚡ 생성 중...';

    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        alert(data.message);
        refreshAllData();
      } else {
        alert(data.message || '데모 데이터 로드 실패');
      }
    } catch (error) {
      console.error('Seeding error:', error);
    } finally {
      seedBtn.disabled = false;
      seedBtn.textContent = '⚡ 데모 데이터 채우기';
    }
  });
}
