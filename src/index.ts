import axios, {AxiosResponse} from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import {flatMapDeep} from 'lodash';
import {chooseCaseFunction, generateVariables, isSingleWordSentence, isSkippedWordInput} from "./utils/word-utils";
import {distinct} from "./utils/array-utils";
import {APP_PORT, MAX_INPUT_WORDS, MAX_SYNONYMS, THESAURUS_API_KEY, THESAURUS_URL} from "./constants/config";
import {WordInput} from "./types/word-input";

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
                error: "Words were not supplied correctly. Please put an array of words as 'words' in request body",
            })
            .end();
    } else if (words.length > MAX_INPUT_WORDS) {
        res
            .status(400)
            .json({
                error: `Varsyno currently does not support an input of over ${MAX_INPUT_WORDS} words`,
            })
            .end();
    } else if (words.length === 0) {
        res
            .status(200)
            .json({
                alternatives: [],
            })
            .end();
    } else {
        try {
            const isSingleWordInput = words.filter(word => !isSkippedWordInput(word)).length === 1;
            const caseFunction = chooseCaseFunction(caseTypeName);

            const thesaurusResponsesPromises: Promise<AxiosResponse>[] = [];
            words.forEach((wordInput: string | WordInput) => {
                let response: Promise<AxiosResponse>;

                if (typeof wordInput === "string") {
                    response = axios.get(THESAURUS_URL + wordInput, {
                        params: {
                            key: THESAURUS_API_KEY,
                        }
                    });
                } else if (wordInput?.word && !wordInput?.options?.skip) {
                    response = axios.get(THESAURUS_URL + wordInput.word, {
                        params: {
                            key: THESAURUS_API_KEY,
                        }
                    });
                } else {
                    response = new Promise<Partial<AxiosResponse>>(resolve => resolve({
                        status: 200,
                        data: [
                            {
                                meta: {
                                    syns: [[wordInput.word]]
                                }
                            }
                        ]
                    })) as any;
                }

                thesaurusResponsesPromises.push(response);
            });

            const thesaurusResponses = await Promise.all(thesaurusResponsesPromises);
            const thesaurusResponsesData = thesaurusResponses.map(response => response.data);

            if (thesaurusResponses.some(response => response.status !== 200)) {
                res.status(500)
                    .json({
                        error: `Internal Server Error`,
                    })
                    .end();
            } else if (thesaurusResponsesData.some((responseDatum: any) => responseDatum.some((x: any) => !x.meta))) {
                res.status(400)
                    .json({
                        error: `Please verify that all sent words are valid`,
                    })
                    .end();
            } else {
                const wordsSynonyms = words.map((inputWord: string | WordInput, index: number) => {
                    let synonyms = flatMapDeep(thesaurusResponsesData[index].map((x: any) => x.meta.syns))

                    if (!isSingleWordInput) {
                        synonyms = synonyms.slice(0, MAX_SYNONYMS);
                    }

                    synonyms = synonyms.filter((synonym: any) => isSingleWordSentence(synonym))
                        .filter(distinct);
                    return typeof inputWord === "string" ? [inputWord, ...synonyms] : [inputWord.word, ...(inputWord?.options?.skip ? [] : synonyms)];
                });

                const suggestedVariables = generateVariables(wordsSynonyms as string[][])
                    .map(caseFunction);

                res.json({
                    alternatives: suggestedVariables,
                }).end();
            }
        } catch (e) {
            console.error(e);
            res.status(500)
                .json({
                    error: `Internal Server Error`,
                })
                .end();
        }
    }
});

app.listen(APP_PORT, () => console.log(`Server started at http://localhost:${APP_PORT}`));
