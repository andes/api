import * as mongoose from 'mongoose';

export let roboSchema = new mongoose.Schema({
    // SMS Options
    message: String,
    phone: String,

    // Emails options
    subject: String,
    email: String,

    // Template name and extra data to render HTML emails (view handlebars)
    template: String,
    extras: mongoose.Schema.Types.Mixed,

    // Aplicatin who send SMS or Email
    from: String,

    // Number of tries
    tries: Number,

    // timestamps
    createdAt: Date,
    updatedAt: Date,

    // options to send message at certain time
    scheduledAt: Date,

    // State of proccess
    status: {
        type: String,
        enum: ['pending', 'success', 'error', 'canceled'],
        required: true,
        default: 'pending'
    },

    // Array de dispositivos registrados en pacienteApp
    device_id: {
        type: [String],
        required: false
    },

    // Campo para pushNotifications
    notificationData: {
        title: String,
        body: String,
        extraData: Object,
        sound: String,
        badge: Number,
        icon: String,
        contentAvailable: Boolean,
        alert: Object,
        required: false
    }
});

export let RoboModel = mongoose.model('sendMessageCache', roboSchema, 'sendMessageCache');

