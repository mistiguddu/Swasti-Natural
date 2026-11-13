import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, default: 0 },
}, { versionKey: false });

const Counter = mongoose.model('Counter', counterSchema);

export async function nextSequence(name) {
  const counter = await Counter.findByIdAndUpdate(name, { $inc: { sequence: 1 } }, { new: true, upsert: true });
  return counter.sequence;
}

export default Counter;
