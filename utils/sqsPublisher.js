const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const sqs = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });

exports.publishBookingConfirmed = async (payload) => {
  const command = new SendMessageCommand({
    QueueUrl: process.env.SQS_BOOKING_QUEUE_URL,
    MessageBody: JSON.stringify({ type: 'BOOKING_CONFIRMED', data: payload }),
  });
  await sqs.send(command);
};
