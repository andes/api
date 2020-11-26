import { FileDescriptorModel } from './schemas';
import { Auth } from '../../../auth/auth.class';

export class FileDescriptor {
    public static async create(data, req) {
        // [TODO] Add some validation
        const fd = new FileDescriptorModel(data);
        Auth.audit(fd, req);
        return fd.save();
    }

    public static async update(uuid, data, req) {
        const fd = await this.find(uuid);
        fd.real_id = data.real_id;
        fd.adapter = data.adapter;
        Auth.audit(fd, req);
        return fd.save();
    }

    public static async delete(uuid) {
        const fd = await this.find(uuid);
        return fd.remove();
    }

    public static async find(id) {
        return await FileDescriptorModel.findById(id);
    }
}
