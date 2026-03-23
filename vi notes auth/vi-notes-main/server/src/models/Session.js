import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    t: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    key: {
      type: String
    },
    keyType: {
      type: String
    },
    meta: {
      type: Object
    },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      default: '',
      trim: true
    },
    content: {
      type: String,
      default: ''
    },
    startedAt: {
      type: Date,
      required: true
    },
    endedAt: {
      type: Date
    },
    events: {
      type: [eventSchema],
      default: []
    },
    stats: {
      type: Object
    },
  },
  { timestamps: true }
);

const Session = mongoose.model('Session', sessionSchema);

export default Session;
