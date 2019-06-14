export as namespace andes_event_bus;

export interface EventBus {
    /**
     * Emite un evento asyncronico
     * @param {string} name Nombre del evento a emitir
     * @param {any} params Argumentos
     */
    emitAsync(name: String, ...params: any[]);
    emit(name: String, ...params: any[]);
    on(regexp: String | RegExp, callback: (...params: any[]) => void);
}

export declare const EventCore: EventBus;
export declare const EventCoreV2: EventBus;

export declare const EventSocket: EventBus;
