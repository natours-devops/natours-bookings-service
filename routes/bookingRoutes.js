const express = require('express');
const bookingController = require('../controllers/bookingController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);
router.post('/confirm', bookingController.confirmBooking);
router.get('/my-bookings', bookingController.getMyBookings);

router.use(restrictTo('admin', 'lead-guide'));
router.route('/').get(bookingController.getAllBookings).post(bookingController.createBooking);
router.route('/:id').get(bookingController.getBooking).patch(bookingController.updateBooking).delete(bookingController.deleteBooking);

module.exports = router;
