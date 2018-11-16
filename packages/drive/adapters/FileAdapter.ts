import { IAdapter } from './IAdapter.interface';
const fs = require('fs');
const path = require('path');
import { Types } from 'mongoose';

export class FileAdapter implements IAdapter {
    public name = 'file-adapter';
    private folder;
    constructor ({ folder }) {
        this.folder = folder;
    }

    private folderName(name) {
        return path.join(this.folder, name);
    }

    write (stream: NodeJS.WriteStream): Promise<string> {
        return new Promise((resolve, reject) => {
            const id = Types.ObjectId();
            const p = this.folderName(id);
            const file = fs.createWriteStream(p);
            stream.pipe(file);
            stream.on('end', () => {
                return resolve(id.toString());
            });
            stream.on('error', (err) => {
                return reject(err);
            });
        });
    }

    read(uuid: string): Promise<NodeJS.ReadStream> {
        return new Promise((resolve, reject) => {
            const p = this.folderName(uuid);
            const reader = fs.createReadStream(p);
            return resolve(reader);
        });
    }

    delete (uuid: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const p = this.folderName(uuid);
            fs.unlink(p, (err) => {
                if (err) { return reject(err); }
                return resolve();
            });
        });
    }
}
