const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const axios = require("axios");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");
const { publishBookingConfirmed } = require("../utils/sqsPublisher");

const TOUR_SERVICE_URL =
  process.env.TOUR_SERVICE_URL || "http://localhost:3002";

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // Fetch tour from Tour Service
  const { data } = await axios.get(
    `${TOUR_SERVICE_URL}/api/v1/tours/${req.params.tourId}`,
  );
  const tour = data.data.data;

  if (!tour) return next(new AppError("Tour not found", 404));

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://natours.dev/img/tours/${tour.imageCover}`],
          },
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    payment_method_types: ["card"],
    success_url: `${frontendUrl}/checkout-success?tour=${req.params.tourId}&price=${tour.price}`,
    cancel_url: `${frontendUrl}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
  });

  res.status(200).json({ status: "success", session });
});

exports.confirmBooking = catchAsync(async (req, res, next) => {
  const tour = req.body.tour || req.query.tour;
  const price = req.body.price || req.query.price;

  if (!tour || !price)
    return next(
      new AppError("Tour and price are required to confirm a booking", 400),
    );

  const booking = await Booking.create({ tour, user: req.user.id, price });

  console.log(req.headers["x-user-email"]);
  // Fire-and-forget: publish to SQS for notification
  publishBookingConfirmed({
    bookingId: booking._id,
    tourId: tour,
    userId: req.user.id,
    userEmail: req.headers["x-user-email"],
    userName: req.headers["x-user-name"],
    price,
  }).catch((err) => console.error("SQS publish error:", err.message));

  res.status(201).json({ status: "success", data: { booking } });
});

exports.getMyBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });

  const enriched = await Promise.all(
    bookings.map(async (booking) => {
      try {
        const { data } = await axios.get(
          `${TOUR_SERVICE_URL}/api/v1/tours/${booking.tour}?fields=name,slug,imageCover,duration,startLocation`,
        );
        const { name, slug, imageCover, duration, startLocation } =
          data.data.data;
        return {
          ...booking.toObject(),
          tour: { name, slug, imageCover, duration, startLocation },
        };
      } catch {
        return booking.toObject();
      }
    }),
  );

  res.status(200).json({
    status: "success",
    results: enriched.length,
    data: { data: enriched },
  });
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
