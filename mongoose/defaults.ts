// Plugin para configurar opciones por defecto en todos los schemas mongoose
export function schemaDefaults(schema) {
    schema.set('toJSON', {
        virtuals: true,
        versionKey: false
    });
}
