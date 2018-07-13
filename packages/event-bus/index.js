const Emitter = require('pattern-emitter');

class EventBus extends Emitter {

    /**
     * Emite un evento de forma asincrónica
     * @param {string} event Nombre del evento a emitir
     * @param {any}  params listado de paramentros relacionados con el evento
     */
    
    emitAsync () {
        process.nextTick(() => {
            this.emit.apply(this, arguments);
        });
    }

}

module.exports = exports = {
    EventBus,
    EventCore: new EventBus(),
    EventSocket: new EventBus()
};