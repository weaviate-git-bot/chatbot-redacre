/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as logger from "firebase-functions/logger";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {Question} from "./questions";
import weaviate, {
  WeaviateClient,
  ObjectsBatcher,
  ApiKey,
} from "weaviate-ts-client";

import {onCall} from "firebase-functions/v1/https";

const className: string = 'withHaggingFace';  // I will be using multiple classes, to experiment with different vectorizers
const client: WeaviateClient = weaviate.client({
  scheme: "https",
  host: "chatbot-redacre-qtyzhbqq.weaviate.network",
  apiKey: new ApiKey("Cg3KMHXBLTUdRKWywG2JLApEUeCCRaaPS5ex"),
  headers: {
    "X-HuggingFace-Api-Key": "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",
    "X-OpenAI-Api-Key": "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",
    "X-Azure-Api-Key": "YOUR-AZURE-API-KEY",
  },
});

export const answerQuestion = onDocumentCreated(
  "questions/{questionId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.info("No data associated with the event");
      return;
    }

    const question = snapshot.data() as Question;

    async function nearTextQuery() {
      const many= [];
      try {
        const nearTextv1= await client.graphql.get()
          .withClassName("Question")
          .withFields(`
            question
            answer
            _additional{certainty distance}
          `)
          .withNearText({
            concepts: [question.question],
          })
          .withLimit(3)
          .do();
        many.push(nearTextv1);
      } catch (error) {
        many.push(error);
      }


      try {
        const nearTextv2= await client.graphql.get()
          .withClassName("Question")
          .withFields(`
            question
            answer
            _additional{certainty distance}
          `)
          .withNearText({
            concepts: question.question.split(" "),
          })
          .withLimit(3)
          .do();
        many.push(nearTextv2);
      } catch (error) {
        many.push(error);
      }


      try {
        const ask= await client.graphql
          .get()
          .withClassName("Question")
          .withAsk({
            question: question.question,
            properties: ["question"],
          })
          .withFields(`
            question
            answer
            _additional {
              answer {
                hasAnswer
                property
                result
                startPosition
                endPosition
              }
            }`)
          .withLimit(3)
          .do();
        many.push(ask);
      } catch (error) {
        many.push(error);
      }

      await new Promise((resolve) => setTimeout(resolve, 60000));

      try {
        const ask= await client.graphql
          .get()
          .withClassName("Question")
          .withAsk({
            question: question.question,
            properties: ["answer"],
          })
          .withFields(`
            question
            answer
            _additional {
              answer {
                hasAnswer
                property
                result
                startPosition
                endPosition
              }
            }`)
          .withLimit(3)
          .do();
        many.push(ask);
      } catch (error) {
        many.push(error);
      }


      return JSON.stringify(many, null, 2);
    }

    const response= await nearTextQuery();
    return snapshot.ref.update({response});
  }
);

// Idempotency functionality follow https://weaviate.io/developers/weaviate/tutorials/import
export const seedWeaviate = onCall(async (data, context)=> {

  await client.schema
    .classDeleter()
    .withClassName("Question")
    .do();

  const classObj = {
    "class": className,
    "vectorizer": "text2vec-huggingface",
    "moduleConfig": {
      "text2vec-huggingface": {
        "model": "sentence-transformers/all-MiniLM-L6-v2",
        "options": {
          "waitForModel": true,
        },
      },
    },
  };

  async function addSchema() {
    const res = await client.schema.classCreator().withClass(classObj).do();
    logger.info(JSON.stringify(res, null, 2));
  }

  await addSchema();

  async function getJsonData() {
    const file = await fetch("https://cdn.statically.io/gh/Brahim-Benzarti/chatbot-redacre/main/faqs.json");
    return file.json();
  }

  async function importQuestions() {
    const data = await getJsonData();

    let batcher: ObjectsBatcher = client.batch.objectsBatcher();
    let counter = 0;
    const batchSize = 100;

    for (const question of data) {
      const obj = {
        class: "Question",
        properties: {
          answer: question.Answer,
          question: question.Question,
        },
      };

      batcher = batcher.withObject(obj);

      if (counter++ == batchSize) {
        const res = await batcher.do();
        logger.info(JSON.stringify(res, null, 2));
        counter = 0;
        batcher = client.batch.objectsBatcher();
      }
    }

    const res = await batcher.do();
    logger.info(JSON.stringify(res, null, 2));
  }

  await importQuestions();
});


// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
