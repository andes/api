import { FileDescriptorModel } from './schemas';
import { Types } from 'mongoose';

export class FileDescriptor {
    public static async create(data) {
        // [TODO] Add some validation
        const fd = new FileDescriptorModel(data);
        return fd.save();
    }

    public static async update(uuid, data) {
        const fd = await this.find(uuid);
        fd.real_id = data.real_id;
        fd.adapter = data.adapter;
        return fd.save();
    }

    public static async find(id) {
        return await FileDescriptorModel.findById(id);
    }
}
