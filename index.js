const inputWords = ['pig', 'searcher'];

const wordsSynonyms = new Map();

inputWords.forEach(word => {
    // wordsSynonyms.set(word, thesaurus.search(word));
});

for (const [key, value] of wordsSynonyms.entries()) {
    console.log(key, value);
}
