import { logAgendaCache } from '../core/log/schemas/logAgendaHPNCache';

export class LoggerAgendaCache {

    public static logAgenda(agendaId, msg, callback?): any {
        const newLogAgenda = new logAgendaCache({
            agenda: agendaId,
            error: msg,
            createdAt: new Date(),
        });
        newLogAgenda.save(callback);
        return newLogAgenda;
    }
}
