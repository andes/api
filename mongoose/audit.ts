import * as mongoose from 'mongoose';

// Plugin para configurar auditoría
module.exports = function (schema, options) {
    schema.add({
        createdAt: Date,
        createdBy: mongoose.Schema.Types.Mixed,
        updatedAt: Date,
        updatedBy: mongoose.Schema.Types.Mixed
    });

    // Define un método que debe llamarse en el documento principal antes de ejecutar .save()
    schema.methods.audit = function (user) {
        this.$audit = user;
    };

    schema.pre('save', function (next) {
        let user = this.$audit;
        let o = this.ownerDocument && this.ownerDocument();
        while (o && !user) {
            user = o.$audit;
            o = o.ownerDocument && o.ownerDocument();
        }

        if (!user) {
            return next(new Error('AUDIT PLUGIN ERROR: Inicialice el plugin utilizando el método audit(). Ejemplo: myModel.audit(req.user)'));
        }

        // Todo ok...
        if (this.isNew) {
            this.createdAt = new Date();
            this.createdBy = user;
        } else {
            if (this.isModified()) {
                this.updatedAt = new Date();
                this.updatedBy = user;
            }
        }
        next();
    });
};
