import {isEmpty} from "lodash";
import {CaseEnum} from "../enums/case.enum";
import Case from "case";

export const isSingleWord = (sentence: string): boolean => sentence.split(' ').length === 1;

export const chooseCaseFunction = (caseTypeName: string): (word: string) => string => {
    let caseFunction: (word: string) => string;
    switch (caseTypeName) {
        case CaseEnum.Snake:
            caseFunction = Case.snake;
            break;
        case CaseEnum.Pascal:
            caseFunction = Case.pascal;
            break;
        case CaseEnum.Camel:
            caseFunction = Case.camel;
            break;
        case CaseEnum.Kebab:
            caseFunction = Case.kebab;
            break;
        case CaseEnum.Screaming:
            caseFunction = Case.constant;
            break;
        case CaseEnum.Upper:
            caseFunction = Case.upper;
            break;
        case CaseEnum.Lower:
            caseFunction = Case.lower;
            break;
        case CaseEnum.Capital:
            caseFunction = Case.capital;
            break;
        case CaseEnum.Header:
            caseFunction = Case.header;
            break;
        default:
            caseFunction = Case.snake;
            break;
    }

    return caseFunction;
};

export const generateVariables = (wordsComponents: string[][], prependedVariables: string[] = [], isFirstTime = true): string[] => {
    if (!Array.isArray(wordsComponents) ||
        isEmpty(wordsComponents) ||
        !Array.isArray(wordsComponents[0]) ||
        (!Array.isArray(wordsComponents[1]) && isEmpty(prependedVariables))) {
        if (isFirstTime) {
            return wordsComponents[0];
        }
        return prependedVariables;
    }

    let firstWordOptions = prependedVariables;
    let secondWordOptions = wordsComponents[0];
    if (isFirstTime) {
        firstWordOptions = wordsComponents[0];
        secondWordOptions = wordsComponents[1];
    }

    const combinations = [];
    for (const firstWordOption of firstWordOptions) {
        for (const secondWordOption of secondWordOptions) {
            combinations.push(firstWordOption + '_' + secondWordOption);
        }
    }

    return generateVariables(wordsComponents.slice(isFirstTime ? 2 : 1), combinations, false);
};