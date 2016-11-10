export class ValidateFormatDate {

public static validateDate(date) {
        var RegExPattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
        if ((date.match(RegExPattern)) && (date != '')) {
            return true;
        } else {
            return false;
        }
    }

}