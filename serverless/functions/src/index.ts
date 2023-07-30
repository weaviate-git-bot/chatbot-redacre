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
import {
  classGuard,
  filterRejectedPromises,
  getResponseFormatter,
} from "./utils";

const classNames = [
  "HuggingFace",
  "HuggingFaceInverted",
  "OpenAI",
  "OpenAIInverted",
];

const client: WeaviateClient = weaviate.client({
  scheme: "https",
  host: "YOUR-WEAVIATE-HOST",
  apiKey: new ApiKey("YOUR-WEAVIATE-API-KEY"),
  headers: {
    "X-HuggingFace-Api-Key": "YOUR-HUGGINGFACE-API-KEY",
    "X-OpenAI-Api-Key": "YOUR-OPENAI-API-KEY",
    "X-Azure-Api-Key": "YOUR-AZURE-API-KEY",
  },
});

export const answerQuestionWithHuggingFace = onDocumentCreated(
  "users/{userId}/questions/{questionId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }

    if (!(await classGuard(client, "HuggingFace", "HuggingFaceInverted"))) {
      console.log("Class guard failed");
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

export const answerQuestionWithOpenAi = onDocumentCreated(
  "users/{userId}/questions/{questionId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }

    if (!(await classGuard(client, "OpenAI", "OpenAIInverted"))) {
      console.log("Class guard failed");
      return;
    }

    const question = snapshot.data() as Question;
    const singlePrompt =
      `Use <{answer}> to try to answer <${question.question}>.
      The response should be a single sentence, friendly and casual.`;

    try {
      const result = await client.graphql
        .get()
        .withClassName("OpenAIInverted")
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
        .do();
      if (result.data.Get.OpenAIInverted[0].certainty > 0.7) {
        return snapshot.ref.update({
          response_openai: JSON.stringify(result.data),
        });
      } else {
        console.log("OpenAIInverted certainty is too low");
        const additionalResults = await Promise.all([
          client.graphql
            .get()
            .withClassName("OpenAI")
            .withFields(
              `
                  question
                  answer
                  _additional{
                    answer{
                      hasAnswer
                      result
                    }
                  }
                `
            )
            .withAsk({
              question: question.question,
              properties: ["question"],
            })
            .withLimit(1)
            .do(),
          client.graphql
            .get()
            .withClassName("OpenAI")
            .withFields(
              `
                  question
                  answer
                `
            )
            .withNearText({concepts: [question.question]})
            .withGenerate({singlePrompt})
            .withLimit(1)
            .do(),
        ]);

        const askResult =
          additionalResults[0].data.Get?.OpenAI.length > 0 ?
            additionalResults[0].data.Get?.OpenAI[0]._additional.answer :
            undefined;
        const generateResult =
          additionalResults[1].data.Get?.OpenAI.length > 0 ?
            additionalResults[1].data.Get?.OpenAI[0]._additional.generate :
            undefined;

        if (askResult?.hasAnswer && generateResult?.singleResult) {
          return snapshot.ref.update({
            response: JSON.stringify([{
              answer: generateResult?.singleResult,
            }]),
          });
        } else if (askResult?.hasAnswer) {
          return snapshot.ref.update({
            response: JSON.stringify([{
              answer: additionalResults[0].data.Get?.OpenAI[0].answer,
            }]),
          });
        }
        throw new Error();
      }
    } catch (error) {
      console.log(`Something went wrong: ${error}`);
      return snapshot.ref.update({
        response: JSON.stringify([{
          answer:
            "Sorry, I can't help you with that. Try asking me something else.",
        }]),
      });
    }

    // const parsedResults: ResultFormat[] = results
    //   .map((result) => {
    //     return (
    //       getResponseFormatter(result.data, "OpenAI") ||
    //       getResponseFormatter(result.data, "OpenAIInverted")
    //     );
    //   })
    //   .filter((result): result is ResultFormat => result !== null);

    // if (parsedResults.length > 1) {
    //   parsedResults.sort((a, b) => b.certainty - a.certainty);
    // }
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
  for (let index = 0; index < classNames.length; index++) {
    const className = classNames[index];
    try {
      await client.schema.classDeleter().withClassName(className).do();
    } catch (error) {
      console.log(`Class deletion failed: ${error}`);
      return new CustomError(
        `Failed to create schema: ${error}`,
        CustomErrorOperation.FAIL
      );
    }
  }

  let classesToCreate = undefined;

  if (data.model === "HuggingFace") {
    console.log("Creating HuggingFace classes");
    classesToCreate = [
      {
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
      },
      {
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
      },
    ];
  } else if (data.model === "OpenAI") {
    console.log("Creating OpenAI classes");
    classesToCreate = [
      {
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
          "generative-openai": {
            model: "gpt-3.5-turbo",
          },
        },
      },
      {
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
      },
    ];
  }

  if (classesToCreate) {
    try {
      for (let index = 0; index < classesToCreate.length; index++) {
        const classObj = classesToCreate[index];
        await client.schema.classCreator().withClass(classObj).do();
      }

      try {
        const result = await client.schema.getter().do();
        return {result};
      } catch (error) {
        throw new CustomError(
          `Failed to get schema: ${error}`,
          CustomErrorOperation.FAIL
        );
      }
    } catch (error) {
      if (error instanceof CustomError) return error;
      return new CustomError(
        `Failed to create schema: ${error}`,
        CustomErrorOperation.FAIL
      );
    }
  } else {
    console.log("No model specified");
    return new CustomError("No model specified", CustomErrorOperation.FAIL);
  }
});

export const seedWeaviate = onCall(async (data, context) => {
  try {
    await client.schema.getter().do();
    const filePath = "/Brahim-Benzarti/chatbot-redacre/main/faqs.json";
    const file = await fetch(`https://cdn.statically.io/gh${filePath}`);
    if (file.status !== 200) {
      throw new CustomError("Failed to fetch data", CustomErrorOperation.FAIL);
    }
    try {
      const questions = await (<Promise<QandAs[]>>file.json());

      let batcher: ObjectsBatcher = client.batch.objectsBatcher();
      let counter = 0;
      let classesToSeed = undefined;
      const batchSize = 100;
      const bufferTime = 0;

      if (data.model === "HuggingFace") {
        console.log("Seeding HuggingFace");
        classesToSeed = ["HuggingFace", "HuggingFaceInverted"];
      } else if (data.model === "OpenAI") {
        console.log("Seeding OpenAI");
        classesToSeed = ["OpenAI", "OpenAIInverted"];
        // batchSize = 3;
        // bufferTime = 1000;
      }

      if (classesToSeed) {
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          for (let j = 0; j < classesToSeed.length; j++) {
            const className = classesToSeed[j];
            const obj = {
              class: className,
              properties: {
                answer: question.Answer,
                question: question.Question,
              },
            };

            batcher = batcher.withObject(obj);

            if (counter++ == batchSize) {
              console.log("Seeding batch: ", i, " of ", questions.length);
              await batcher.do();
              await new Promise((resolve) => setTimeout(resolve, bufferTime));
              counter = 0;
              batcher = client.batch.objectsBatcher();
            }
          }
        }

        const batcherResult = await batcher.do();
        return batcherResult;
      }
      console.log("No model specified");
      return {result: "No model specified"};
    } catch (error) {
      console.log("Failed parsing data: ", error);
      throw new CustomError(
        `Failed parsing data: ${error}`,
        CustomErrorOperation.FAIL
      );
    }
  } catch (error) {
    if (error instanceof CustomError) return error;
    return new CustomError(String(error), CustomErrorOperation.ERROR);
  }
});

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   console.log("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
