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

export const answerQuestion = onDocumentCreated(
  "questions/{questionId}",
  (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.info("No data associated with the event");
      return;
    }

    const question = snapshot.data() as Question;
    logger.info("Question received", {structuredData: true});
    logger.info(event, question, {structuredData: true});
    return snapshot.ref.update({response: "This is a response"});
  }
);

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
