const Emitter = require('pattern-emitter');

export class EventBus extends Emitter {

    /**
     * Emite un evento de forma asincrónica
     * @param {string} event Nombre del evento a emitir
     * @param {any}  params listado de paramentros relacionados con el evento
     */

    emitAsync(name: String, ...params: any[]);

    emitAsync() {
        process.nextTick(() => {
            this.emit.apply(this, arguments);
        });
    }

}

export const EventCore = new EventBus();
export const EventCoreV2 = new EventBus();

export const EventSocket = new EventBus();
