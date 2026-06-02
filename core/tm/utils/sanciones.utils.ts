export function normalizeSanciones(value) {
    if (value === undefined || value === null) {
        return null;
    }
    if (!Array.isArray(value)) {
        return value;
    }
    const sanciones = value.filter(sancion => !isEmptySancion(sancion));
    return sanciones.length > 0 ? sanciones : null;
}

function isEmptySancion(sancion) {
    if (!sancion) {
        return true;
    }
    return isEmptyValue(sancion.numero)
        && isEmptyValue(sancion.motivo)
        && isEmptyValue(sancion.normaLegal)
        && isEmptyValue(sancion.fecha)
        && isEmptyValue(sancion.vencimiento)
        && isEmptyNestedSancion(sancion.sancion);
}

function isEmptyNestedSancion(sancion) {
    if (!sancion) {
        return true;
    }
    return isEmptyValue(sancion.id) && isEmptyValue(sancion.nombre);
}

function isEmptyValue(value) {
    return value === undefined || value === null || value === '';
}

// Las funciones de este archivo se encargan de normalizar las sanciones para que no se guarden sanciones vacías en la base de datos,
// lo que puede causar problemas a la hora de filtrar por sanciones activas o vencidas.

// Se crea este archivo para evitar que la lógica de normalización de sanciones esté mezclada con la lógica de los controladores o los esquemas,
// y para poder reutilizarla en diferentes partes de la aplicación. Con esto logramos evitar que se genere una dependencia circular entre el
// controlador de profesionales y el esquema de turno solicitado, ya que ambos necesitan normalizar las sanciones.

// NOTA: Las funciones utilitarias puras (sin accesos a la base de datos ni a lógicas de negocio) deben estar en archivos utils/, no en controladores
// ni schemas para evitar los ciclos de dependencias.
