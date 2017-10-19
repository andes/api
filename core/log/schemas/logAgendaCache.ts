import * as mongoose from 'mongoose';

export let logAgendaCacheSchema = new mongoose.Schema({
    agenda: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'agendaCache'
    },
    error: mongoose.Schema.Types.Mixed,
    createdAt: Date,
    createdBy: mongoose.Schema.Types.Mixed

});

export let logAgendaCache = mongoose.model('logAgendaCache', logAgendaCacheSchema, 'logAgendaCache');
