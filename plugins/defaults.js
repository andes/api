// Plugin para configurar opciones por defecto en todos los schemas mongoose
module.exports = exports = function mongooseConfigPlugin(schema) {
    schema.set('toJSON', {
        virtuals: true,
        versionKey: false
    });
}