const mongoose = require('mongoose');

const WorkoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add an exercise title'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: ['Cardio', 'Strength', 'Flexibility', 'Other'],
    default: 'Strength'
  },
  duration: {
    type: Number,
    required: [true, 'Please specify duration in minutes'],
    min: [1, 'Duration must be at least 1 minute']
  },
  calories: {
    type: Number,
    required: [true, 'Please specify calories burned'],
    min: [0, 'Calories cannot be negative']
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Workout', WorkoutSchema);
