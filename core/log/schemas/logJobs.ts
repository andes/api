import * as mongoose from 'mongoose';

export const logJobsSchema = new mongoose.Schema({
    job: {
        type: String,
        enum: [
            'actualizar agendas', 'actualizar carpetas', 'actualizar turnos del dia', 'cda sips', 'farmacias',
            'integracion andes', 'mpi corrector', 'mpi updater', 'recordar turnos',
            'recordatorio agenda', 'robo sender'
        ]
    },
    error: mongoose.Schema.Types.Mixed,
    createdAt: Date,
    createdBy: mongoose.Schema.Types.Mixed

});

export const logJobs = mongoose.model('logJobs', logJobsSchema, 'logJobs');
