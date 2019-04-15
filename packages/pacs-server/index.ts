const VT = String.fromCharCode(0x0b);
const FS = String.fromCharCode(0x1c);
const CR = String.fromCharCode(0x0d);
const net = require('net');


export class PacsServer {
    private _host: String;
    private _port: number;
    constructor(host: String, port: number) {
        this._host = host;
        this._port = port;
    }

    public send(message: String): Promise<any> {
        return new Promise((resolve, reject) => {
            const client = new net.Socket();
            client.connect(this._port, this._host, () => {
                client.write(VT + message + FS + CR);
            });

            client.on('data', (data) => {
                client.destroy(); // kill client after server's response
                return resolve(data.toString());
            });

            client.on('close', () => {

            });

            client.on('error', (err) => {
                return reject(err);
            });
        });
    }
}
