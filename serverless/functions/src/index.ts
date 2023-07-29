/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 * Document events https://firebase.google.com/docs/functions/firestore-events?gen=2nd
 */

import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {
  QandAs,
  Question,
  CustomError,
  CustomErrorOperation,
  nearTextModules,
  ResultFormat,
  AnswerResponseData,
} from "./types";
import weaviate, {
  WeaviateClient,
  ObjectsBatcher,
  ApiKey,
} from "weaviate-ts-client";

import {onCall} from "firebase-functions/v1/https";
import {filterRejectedPromises, getResponseFormatter} from "./utils";

const classNames = [
  "HuggingFace",
  "HuggingFaceInverted",
  "OpenAI",
  "OpenAIInverted",
];

const client: WeaviateClient = weaviate.client({
  scheme: "https",
  host: "chatbot-redacre-lugk8d1h.weaviate.network",
  apiKey: new ApiKey("4y3LR9x2kP9UcXeDWGJUuFrwlG1YJ4qIRQJn"),
  headers: {
    "X-HuggingFace-Api-Key": "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",
    "X-OpenAI-Api-Key": "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",
    "X-Azure-Api-Key": "YOUR-AZURE-API-KEY",
  },
});

export const answerQuestion = onDocumentCreated(
  "users/{userId}/questions/{questionId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }

    const question = snapshot.data() as Question;

    const results = await filterRejectedPromises<{ data: AnswerResponseData }>([
      client.graphql
        .get()
        .withClassName("HuggingFace")
        .withFields(
          `
            question
            answer
            _additional{
              certainty
              distance
            }
          `
        )
        .withNearText({concepts: [question.question]})
        .withLimit(1)
        .do(),
      client.graphql
        .get()
        .withClassName("HuggingFaceInverted")
        .withFields(
          `
            question
            answer
            _additional{
              certainty
              distance
            }
          `
        )
        .withNearText({concepts: [question.question]})
        .withLimit(1)
        .do(),
      // ? This was an attempt to check the Hybrid search,
      // ? but it doesn't perform better than the nearText search
      // client.graphql.get().withClassName("HuggingFace").withFields(`
      //   question
      //   answer
      // `).withHybrid({
      //   query: question.question,
      //   properties: ["question"],
      //   fusionType: FusionType.relativeScoreFusion,
      // }).withLimit(1).do(),
    ]);

    const parsedResults: ResultFormat[] = results
      .map((result) => {
        return (
          getResponseFormatter(result.data, "HuggingFace") ||
          getResponseFormatter(result.data, "HuggingFaceInverted")
        );
      })
      .filter((result): result is ResultFormat => result !== null);

    if (parsedResults.length > 1) {
      parsedResults.sort((a, b) => b.certainty - a.certainty);
    }

    return snapshot.ref.update({response: JSON.stringify(parsedResults)});
  }
);

// TODO Idempotency functionality follow
// https://weaviate.io/developers/weaviate/tutorials/import

/**
 * Triggered manually to setup the Weaviate schema.
 *
 * @param {any} data
 * @param {any} context
 * @returns {any}
 */
export const setupWeaviate = onCall(async (data, context) => {
  for (const className of classNames) {
    await client.schema.classDeleter().withClassName(className).do();
  }

  const classObjHuggingFace = {
    class: "HuggingFace",
    vectorizer: nearTextModules.TEXT2VEC_HUGGINGFACE,
    description: `A class to store questions and answers provided from 
    https://cdn.statically.io/gh/Brahim-Benzarti/chatbot-redacre/main/faqs.json 
    using the Text2Vec HuggingFace module`,
    properties: [
      {
        dataType: ["text"],
        description: "The question",
        name: "question",
      },
      {
        dataType: ["text"],
        description: "The answer",
        name: "answer",
      },
    ],
    moduleConfig: {
      "text2vec-huggingface": {
        model: "sentence-transformers/all-MiniLM-L6-v2",
        options: {
          waitForModel: true,
        },
      },
    },
  };

  const classObjHuggingFaceInverted = {
    class: "HuggingFaceInverted",
    vectorizer: nearTextModules.TEXT2VEC_HUGGINGFACE,
    description: `A class to store questions and answers provided from 
    https://cdn.statically.io/gh/Brahim-Benzarti/chatbot-redacre/main/faqs.json 
    using the Text2Vec HuggingFace module`,
    properties: [
      {
        dataType: ["text"],
        description: "The question",
        name: "question",
      },
      {
        dataType: ["text"],
        description: "The answer",
        name: "answer",
        indexSearchable: false,
      },
    ],
    moduleConfig: {
      "text2vec-huggingface": {
        model: "sentence-transformers/all-MiniLM-L6-v2",
        options: {
          waitForModel: true,
        },
      },
    },
  };

  // Using OpenAi with different configuration may cause
  // different size footpring use this link
  // to get an estimate visit
  // /developers/weaviate/concepts/resources#an-example-calculation
  // Default model is text-embedding-ada-001, or: ada, babbage ,curie, davinci
  const classObjOpenAI = {
    class: "OpenAI",
    vectorizer: nearTextModules.TEXT2VEC_OPENAI,
    description: `A class to store questions and answers provided from 
    https://cdn.statically.io/gh/Brahim-Benzarti/chatbot-redacre/main/faqs.json
    using the Text2Vec OpenAI module`,
    properties: [
      {
        dataType: ["text"],
        description: "The question",
        name: "question",
      },
      {
        dataType: ["text"],
        description: "The answer",
        name: "answer",
      },
    ],
    moduleConfig: {
      "text2vec-openai": {
        model: "babbage",
        modelVersion: "001",
        type: "text",
      },
    },
  };

  const classObjOpenAIInverted = {
    class: "OpenAIInverted",
    vectorizer: nearTextModules.TEXT2VEC_OPENAI,
    description: `A class to store questions and answers provided from 
    https://cdn.statically.io/gh/Brahim-Benzarti/chatbot-redacre/main/faqs.json
    using the Text2Vec OpenAI module`,
    properties: [
      {
        dataType: ["text"],
        description: "The question",
        name: "question",
      },
      {
        dataType: ["text"],
        description: "The answer",
        name: "answer",
        indexSearchable: false,
      },
    ],
    moduleConfig: {
      "text2vec-openai": {
        model: "babbage",
        modelVersion: "001",
        type: "text",
      },
    },
  };

  try {
    await Promise.allSettled([
      client.schema.classCreator().withClass(classObjOpenAI).do(),
      client.schema.classCreator().withClass(classObjOpenAIInverted).do(),
      client.schema.classCreator().withClass(classObjHuggingFace).do(),
      client.schema.classCreator().withClass(classObjHuggingFaceInverted).do(),
    ]);

    try {
      const result = await client.schema.getter().do();
      return {result};
    } catch (error) {
      throw new CustomError(
        "Failed to get schema: " + JSON.stringify(error),
        CustomErrorOperation.FAIL
      );
    }
  } catch (error) {
    if (error instanceof CustomError) return error;
    return new CustomError(
      "Failed to create schema: " + JSON.stringify(error),
      CustomErrorOperation.FAIL
    );
  }
});

export const seedWeaviate = onCall(async (data, context) => {
  try {
    // TODO Check if target class already exists
    await client.schema.getter().do();
    const filePath = "/Brahim-Benzarti/chatbot-redacre/main/faqs.json";
    const file = await fetch(`https://cdn.statically.io/gh${filePath}`);
    if (file.status !== 200) {
      throw new CustomError("Failed to fetch data", CustomErrorOperation.FAIL);
    }
    try {
      const data = await (<Promise<QandAs[]>>file.json());
      const batchSize = 5;

      let batcher: ObjectsBatcher = client.batch.objectsBatcher();
      let counter = 0;

      for (const question of data) {
        for (const className of classNames) {
          const obj = {
            class: className,
            properties: {
              answer: question.Answer,
              question: question.Question,
            },
          };

          batcher = batcher.withObject(obj);
        }

        if (counter++ == batchSize) {
          await batcher.do();
          counter = 0;
          batcher = client.batch.objectsBatcher();
        }
      }

      const batcherResult = await batcher.do();
      return batcherResult;
    } catch (error) {
      throw new CustomError(
        "Failed parsing data: " + JSON.stringify(error),
        CustomErrorOperation.FAIL
      );
    }
  } catch (error) {
    if (error instanceof CustomError) return error;
    return new CustomError(JSON.stringify(error), CustomErrorOperation.ERROR);
  }
});

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   console.log("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
