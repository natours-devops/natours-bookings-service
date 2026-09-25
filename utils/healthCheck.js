const mongoose = require('mongoose');
const { SQSClient, GetQueueAttributesCommand } = require('@aws-sdk/client-sqs');
const Stripe = require('stripe');

const sqs = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });

module.exports = (serviceName) => async (req, res) => {
  const health = {
    status: 'UP',
    service: serviceName,
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    health.checks.database = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
    if (health.checks.database === 'DOWN') health.status = 'DOWN';
  } catch (err) {
    health.checks.database = 'DOWN';
    health.status = 'DOWN';
  }

  try {
    await sqs.send(new GetQueueAttributesCommand({
      QueueUrl: process.env.SQS_BOOKING_QUEUE_URL,
      AttributeNames: ['ApproximateNumberOfMessages'],
    }));
    health.checks.sqs = 'UP';
  } catch (err) {
    health.checks.sqs = 'DOWN';
    health.status = 'DOWN';
  }

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    await stripe.balance.retrieve();
    health.checks.stripe = 'UP';
  } catch (err) {
    health.checks.stripe = 'DOWN';
    health.status = 'DOWN';
  }

  res.status(health.status === 'UP' ? 200 : 503).json(health);
};
