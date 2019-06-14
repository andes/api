

function removeMinus(word: string) {
    if (word.charAt(0) === '-') {
        return word.substring(1);
    }
    return word;
}

/**
 * Determina si un campo fue elegido para ser devuelto.
 * Ejemplos:
 * isSelected("nombre apeliido", "nombre") = true
 * isSelected("nombre apeliido", "ciudad") = false
 * isSelected("-nombre -apeliido", "nombre") = false
 * isSelected("-nombre -apeliido", "ciudad") = true
 * isSelected("", "ciudad") = true
 */

export function isSelected(select: string, field: string) {
    if (!select || select.length === 0) {
        return true;
    }
    const words = select.split(/\s+/);

    const firstWord = words[0];
    const isExclusive = firstWord.charAt(0) === '-';
    const isPresent = words.map(removeMinus).indexOf(field) >= 0;
    if (isExclusive) {
        return !isPresent;
    } else {
        return isPresent;
    }

}
