export interface IID {
    root: String;
    extension?: String;
}

export interface ICode {
    code: String;
    codeSystem: String;
    displayName?: String;
    codeSystemName?: String;
}

export interface IConfidentialityCode {
    code: String;
    codeSystem: String;
}

export interface ILanguageCode {
    code: String;
    // codeSystem: String;
}

export interface ISetId {
    root: String;
}

export interface ITemplateId {
    root: String;
}
