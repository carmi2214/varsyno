import axios, {AxiosResponse} from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import {flatMapDeep} from 'lodash';
import {chooseCaseFunction, generateVariables, isSingleWord} from "./utils/word-utils";
import {distinct} from "./utils/array-utils";
import {APP_PORT, MAX_INPUT_WORDS, MAX_SYNONYMS, THESAURUS_API_KEY, THESAURUS_URL} from "./constants/config";

const app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', (req, res) => res.send(`Welcome to Varsyno`));

app.post('/suggest', async (req, res) => {
    const {words, case: caseTypeName} = req.body;

    if (!(words && Array.isArray(words))) {
        res
            .status(400)
            .json({
                error: "Words were not supplied correctly. Please put an array of words as 'words' in request body"
            })
            .end();
    } else if (words.length > MAX_INPUT_WORDS) {
        res
            .status(400)
            .json({
                error: `Varsyno currently does not support an input of over ${MAX_INPUT_WORDS} words`
            })
            .end();
    } else {
        try {
            const caseFunction = chooseCaseFunction(caseTypeName);

            const thesaurusResponsesPromises: Promise<AxiosResponse>[] = [];
            words.forEach((word: string) => {
                const response = axios.get(THESAURUS_URL + word, {
                    params: {
                        key: THESAURUS_API_KEY,
                    }
                });
                thesaurusResponsesPromises.push(response);
            });

            const thesaurusResponses = await Promise.all(thesaurusResponsesPromises);
            const thesaurusResponsesData = thesaurusResponses.map(response => response.data);

            if (thesaurusResponses.some(response => response.status !== 200)) {
                res.status(500)
                    .json({
                        error: `Internal Server Error`
                    })
                    .end();
            } else if (thesaurusResponsesData.some((responseDatum: any) => responseDatum.some((x: any) => !x.meta))) {
                res.status(400)
                    .json({
                        error: `Please verify that all sent words are valid`
                    })
                    .end();
            } else {
                const wordsSynonyms = words.map((inputWord: string, index: number) => {
                    const synonyms = flatMapDeep(thesaurusResponsesData[index].map((x: any) => x.meta.syns))
                        .slice(0, MAX_SYNONYMS)
                        .filter((synonym: any) => isSingleWord(synonym))
                        .filter(distinct);
                    return [inputWord, ...synonyms];
                });

                const suggestedVariables = generateVariables(wordsSynonyms as string[][]).map(caseFunction);

                res.json({
                    alternatives: suggestedVariables,
                }).end();
            }
        } catch (e) {
            console.error(e);
            res.status(500)
                .json({
                    error: `Internal Server Error`
                })
                .end();
        }
    }
});

app.listen(APP_PORT, () => console.log(`Server started at http://localhost:${APP_PORT}`));
