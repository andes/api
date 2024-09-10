import { connect } from 'amqplib';

export class Hl7v2NetworkController {
    private connection: any;
    private channel: any;

    constructor() {}

    async connectHl7v2(queueConnectionString: string) {
        if (!this.connection) {
            this.connection = await connect(queueConnectionString);
            this.channel = await this.connection.createChannel();
        }
    }

    async closeConnectionHl7v2() {
        if (this.channel) {
            await this.channel.close();
            // console.log('Canal cerrado');
        }
        if (this.connection) {
            await this.connection.close();
            // console.log('Conexión cerrada');
        }
        this.channel = null;
        this.connection = null;
    };

    async sendMessageHl7v2(message: any, queue: string, queueConnectionString: string) {
        await this.connectHl7v2(queueConnectionString);
        await this.channel.assertQueue(queue, { durable: true });
        this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
            persistent: true
        });
        await this.closeConnectionHl7v2;
    };
}

export const hl7v2NetworkController = new Hl7v2NetworkController();
