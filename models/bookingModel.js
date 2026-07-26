const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'Booking must belong to a tour'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'Booking must belong to a user'],
  },
  price: { type: Number, required: [true, 'Booking must have a price'] },
  createdAt: { type: Date, default: Date.now },
  paid: { type: Boolean, default: true },
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
