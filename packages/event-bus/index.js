"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Emitter = require('pattern-emitter');
class EventBus extends Emitter {
    emitAsync() {
        process.nextTick(() => {
            this.emit.apply(this, arguments);
        });
    }
}
exports.EventBus = EventBus;
exports.EventCore = new EventBus();
//# sourceMappingURL=index.js.map