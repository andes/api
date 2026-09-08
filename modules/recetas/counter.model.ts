import * as mongoose from 'mongoose';

export interface ICounter extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    seq: number;
}

interface ICounterModel extends mongoose.Model<ICounter> {
    getNextSeq(name: string): Promise<number>;
}

const counterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

counterSchema.index({ name: 1 }, { unique: true });

counterSchema.statics.getNextSeq = async function (name: string): Promise<number> {
    const counter = await this.findOneAndUpdate(
        { name },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
    );
    return counter.seq;
};

export const Counter = mongoose.model<ICounter, ICounterModel>('counter', counterSchema, 'counters');
