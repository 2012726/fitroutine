const express = require('express');
const session = require('express-session');
const path = require('path');
const connectDB = require('./config/db.js');
const User = require('./models/User.js');
const Workout = require('./models/Workout.js');
const Meal = require('./models/Meal.js');
const { isAuthenticated } = require('./middlewares/auth.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session Middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fitroutine-secret-key-12345',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: false // Set to true if using HTTPS in production
    }
  })
);

// Helper function to format Date to YYYY-MM-DD
const getLocalDateString = (dateObj) => {
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Route protection for static main page
app.get('/', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve public static files
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// AUTHENTICATION ROUTES (Form & REST)
// ==========================================

// POST /auth/register - User registration
app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    // Create new user (password is automatically hashed via Mongoose pre-save hook)
    const user = await User.create({
      username,
      email,
      password
    });

    // Create session (auto login)
    req.session.userId = user._id;
    req.session.username = user.username;

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// POST /auth/login - User login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Create session
    req.session.userId = user._id;
    req.session.username = user.username;

    res.json({
      success: true,
      message: 'Login successful!',
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// GET /auth/logout - Log user out
app.get('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out.' });
    }
    res.clearCookie('connect.sid');
    res.redirect('/login.html');
  });
});

// GET /auth/me - Get current user profile info
app.get('/auth/me', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      success: true,
      user: {
        id: req.session.userId,
        username: req.session.username
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Not logged in.' });
  }
});

// ==========================================
// WORKOUT CRUD API
// ==========================================

// GET /api/workouts - Get user workouts
app.get('/api/workouts', isAuthenticated, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.session.userId }).sort({ date: -1 });
    res.json({ success: true, count: workouts.length, data: workouts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/workouts - Add new workout
app.post('/api/workouts', isAuthenticated, async (req, res) => {
  try {
    const { title, category, duration, calories, date } = req.body;

    if (!title || !category || !duration || !calories) {
      return res.status(400).json({ success: false, message: 'Please add all required fields.' });
    }

    const workoutData = {
      user: req.session.userId,
      title,
      category,
      duration: Number(duration),
      calories: Number(calories)
    };

    if (date) {
      workoutData.date = new Date(date);
    }

    const workout = await Workout.create(workoutData);
    res.status(201).json({ success: true, data: workout });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/workouts/:id - Delete workout
app.delete('/api/workouts/:id', isAuthenticated, async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.session.userId });

    if (!workout) {
      return res.status(404).json({ success: false, message: 'Workout log not found or unauthorized' });
    }

    await workout.deleteOne();
    res.json({ success: true, message: 'Workout log removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// MEAL CRUD API
// ==========================================

// GET /api/meals - Get user meals
app.get('/api/meals', isAuthenticated, async (req, res) => {
  try {
    const meals = await Meal.find({ user: req.session.userId }).sort({ date: -1 });
    res.json({ success: true, count: meals.length, data: meals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/meals - Add new meal
app.post('/api/meals', isAuthenticated, async (req, res) => {
  try {
    const { title, type, calories, protein, carbs, fat, date } = req.body;

    if (!title || !type || !calories) {
      return res.status(400).json({ success: false, message: 'Please add all required fields.' });
    }

    const mealData = {
      user: req.session.userId,
      title,
      type,
      calories: Number(calories),
      protein: Number(protein || 0),
      carbs: Number(carbs || 0),
      fat: Number(fat || 0)
    };

    if (date) {
      mealData.date = new Date(date);
    }

    const meal = await Meal.create(mealData);
    res.status(201).json({ success: true, data: meal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/meals/:id - Delete meal
app.delete('/api/meals/:id', isAuthenticated, async (req, res) => {
  try {
    const meal = await Meal.findOne({ _id: req.params.id, user: req.session.userId });

    if (!meal) {
      return res.status(404).json({ success: false, message: 'Meal log not found or unauthorized' });
    }

    await meal.deleteOne();
    res.json({ success: true, message: 'Meal log removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// DASHBOARD SUMMARY API (Complex queries/charts)
// ==========================================

app.get('/api/summary', isAuthenticated, async (req, res) => {
  try {
    // Current Local Date calculations
    const todayStr = getLocalDateString(new Date());

    // Get all records of the user
    const workouts = await Workout.find({ user: req.session.userId });
    const meals = await Meal.find({ user: req.session.userId });

    // Calculate today's aggregates
    let todayConsumed = 0;
    let todayBurned = 0;
    let todayProtein = 0;
    let todayCarbs = 0;
    let todayFat = 0;

    meals.forEach(meal => {
      if (getLocalDateString(meal.date) === todayStr) {
        todayConsumed += meal.calories;
        todayProtein += meal.protein || 0;
        todayCarbs += meal.carbs || 0;
        todayFat += meal.fat || 0;
      }
    });

    workouts.forEach(workout => {
      if (getLocalDateString(workout.date) === todayStr) {
        todayBurned += workout.calories;
      }
    });

    // Generate last 7 days chart labels & data
    const chartLabels = [];
    const chartConsumed = [];
    const chartBurned = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      
      // Label formatted for UI (e.g. "06/13" or "Jun 13")
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      chartLabels.push(`${month}/${date}`);

      // Sum values for this specific day
      let dayConsumed = 0;
      let dayBurned = 0;

      meals.forEach(meal => {
        if (getLocalDateString(meal.date) === dateStr) {
          dayConsumed += meal.calories;
        }
      });

      workouts.forEach(workout => {
        if (getLocalDateString(workout.date) === dateStr) {
          dayBurned += workout.calories;
        }
      });

      chartConsumed.push(dayConsumed);
      chartBurned.push(dayBurned);
    }

    res.json({
      success: true,
      summary: {
        todayConsumed,
        todayBurned,
        macros: {
          protein: todayProtein,
          carbs: todayCarbs,
          fat: todayFat
        },
        chart: {
          labels: chartLabels,
          consumed: chartConsumed,
          burned: chartBurned
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Seed data route - allows users to quickly generate realistic history for demonstration
app.post('/api/seed', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Clear existing data for this user to avoid duplicating seeds
    await Workout.deleteMany({ user: userId });
    await Meal.deleteMany({ user: userId });

    const today = new Date();

    // Create 7 days of history
    const workoutsSeed = [];
    const mealsSeed = [];

    const exerciseTypes = [
      { title: '러닝머신 유산소', category: 'Cardio', duration: 40, calories: 350 },
      { title: '가슴/삼두 웨이트', category: 'Strength', duration: 60, calories: 280 },
      { title: '하체 스쿼트', category: 'Strength', duration: 50, calories: 320 },
      { title: '실내 사이클', category: 'Cardio', duration: 30, calories: 240 },
      { title: '요가 및 스트레칭', category: 'Flexibility', duration: 45, calories: 120 },
      { title: '수영', category: 'Cardio', duration: 50, calories: 400 },
      { title: '등/이두 데드리프트', category: 'Strength', duration: 60, calories: 300 }
    ];

    const mealTypes = [
      { title: '닭가슴살 샐러드 & 현미밥', type: 'Lunch', calories: 480, protein: 35, carbs: 55, fat: 8 },
      { title: '단백질 쉐이크 & 바나나', type: 'Snack', calories: 250, protein: 25, carbs: 30, fat: 2 },
      { title: '연어 구이 & 아보카도 샐러드', type: 'Dinner', calories: 620, protein: 40, carbs: 20, fat: 38 },
      { title: '오트밀 & 견과류', type: 'Breakfast', calories: 350, protein: 12, carbs: 45, fat: 10 },
      { title: '소고기 스테이크 & 구운 채소', type: 'Dinner', calories: 750, protein: 55, carbs: 15, fat: 42 }
    ];

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() - i);

      // Randomly pick 1-2 meals for each day
      const mealCount = 2 + Math.floor(Math.random() * 2); // 2 to 3 meals
      for (let j = 0; j < mealCount; j++) {
        const mealTemplate = mealTypes[Math.floor(Math.random() * mealTypes.length)];
        mealsSeed.push({
          user: userId,
          title: mealTemplate.title,
          type: mealTemplate.type,
          calories: mealTemplate.calories + Math.floor(Math.random() * 80) - 40,
          protein: mealTemplate.protein,
          carbs: mealTemplate.carbs,
          fat: mealTemplate.fat,
          date: new Date(targetDate)
        });
      }

      // Randomly add a workout for 5 of the 7 days
      if (Math.random() > 0.25) {
        const exerciseTemplate = exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)];
        workoutsSeed.push({
          user: userId,
          title: exerciseTemplate.title,
          category: exerciseTemplate.category,
          duration: exerciseTemplate.duration,
          calories: exerciseTemplate.calories + Math.floor(Math.random() * 50) - 25,
          date: new Date(targetDate)
        });
      }
    }

    await Workout.insertMany(workoutsSeed);
    await Meal.insertMany(mealsSeed);

    res.json({ success: true, message: '7일치 샘플 데이터가 성공적으로 생성되었습니다!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});
