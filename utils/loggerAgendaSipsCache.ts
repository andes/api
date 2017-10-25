import { logAgendaCache } from '../core/log/schemas/logAgendaSipsCache';

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
