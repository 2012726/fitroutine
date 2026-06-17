const mongoose = require('mongoose');

const MealSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a meal description'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Please select a meal type'],
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    default: 'Breakfast'
  },
  calories: {
    type: Number,
    required: [true, 'Please specify calories consumed'],
    min: [0, 'Calories cannot be negative']
  },
  protein: {
    type: Number,
    default: 0,
    min: [0, 'Macronutrients cannot be negative']
  },
  carbs: {
    type: Number,
    default: 0,
    min: [0, 'Macronutrients cannot be negative']
  },
  fat: {
    type: Number,
    default: 0,
    min: [0, 'Macronutrients cannot be negative']
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Meal', MealSchema);
