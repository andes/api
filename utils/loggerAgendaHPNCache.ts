import { logAgendaCache } from '../core/deprecated_log/schemas/logAgendaHPNCache';

export class LoggerAgendaCache {

    public static logAgenda(agendaId, msg, callback?): any {
        let newLogAgenda = new logAgendaCache({
            agenda: agendaId,
            error: msg,
            createdAt: new Date(),
        });
        newLogAgenda.save(callback);
        return newLogAgenda;
    }
}
