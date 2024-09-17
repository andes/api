import { connect } from 'amqplib';

export class Hl7v2NetworkController {
    private connection: any;
    private channel: any;

    constructor() {}

    async connectHl7v2(queueConnectionString: string): Promise<void | Error> {
        try {
            if (!this.connection) {
                this.connection = await connect(queueConnectionString);
                this.channel = await this.connection.createChannel();
                // console.log("Connected to RabbitMQ");
            }
        } catch (error) {
            return new Error('Failed to connect to RabbitMQ: ' + error.message);
        }
    }

    async closeConnectionHl7v2(): Promise<void | Error> {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
                // console.log('Connection closed');
            }
            this.channel = null;
            this.connection = null;
        } catch (error) {
            return new Error('Failed to close RabbitMQ connection: ' + error.message);
        }
    }

    async sendMessageHl7v2(message: any, queue: string, queueConnectionString: string): Promise<void | Error> {
        const connectError = await this.connectHl7v2(queueConnectionString);
        if (connectError) {
            return connectError;
        }

        try {
            await this.channel.assertQueue(queue, { durable: true });
            this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
                persistent: true
            });
            // console.log('Message sent to queue:', queue);
        } catch (error) {
            return new Error('Failed to send message to queue: ' + error.message);
        } finally {
            await this.closeConnectionHl7v2();
        };
    };
};

export const hl7v2NetworkController = new Hl7v2NetworkController();
