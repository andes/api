import { IAdapter } from './IAdapter.interface';

export class SeaweedAdapter implements IAdapter {
    public name = 'seaweed-adapter';
    private seaweedfs;

    constructor ({ server, port }) {
        let weedClient = require('node-seaweedfs');
        this.seaweedfs = new weedClient({server, port });
    }

    write (stream: NodeJS.WriteStream): Promise<string> {
        return this.seaweedfs.write(stream, { headers: { 'transfer-encoding': 'chunked' } }).then((fileInfo) => {
            return fileInfo.fid;
        });
    }

    read(uuid: string): Promise<NodeJS.ReadStream> {
        return new Promise((resolve, reject) => {
            const stream = require('stream');
            const input = new stream.PassThrough();
            this.seaweedfs.read(uuid, input);
            return resolve(input);
        });
    }

    delete (uuid: string): Promise<void> {
        return  this.seaweedfs.remove(uuid);
    }
}
