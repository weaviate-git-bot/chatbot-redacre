import {WeaviateClient} from "weaviate-ts-client";
import {AnswerResponseData, ResultFormat} from "./types";

/**
 * Function to check if a property exists in the data object
 * @param {any} data AnswerResponseData
 * @param {any} property string
 * @return {any}
 */
export function hasProperty(
  data: AnswerResponseData,
  property: string
): boolean {
  return (
    data && data.Get && Object.prototype.hasOwnProperty.call(data.Get, property)
  );
}

/**
 * A helper function to get the response formatter for a specific property
 * @param {any} data:AnswerResponseData
 * @param {any} property:string
 * @return {any}
 */
export function getResponseFormatter(
  data: AnswerResponseData,
  property: string
): ResultFormat | null {
  if (hasProperty(data, property)) {
    const dataArray = data.Get[property];
    if (dataArray && dataArray.length > 0) {
      const response = dataArray[0];
      const {question, answer, _additional} = response;
      const {certainty} = _additional;
      return {question, answer, certainty};
    }
  }
  return null;
}

/**
 * Filters out rejected promises from an array of promises.
 *
 * @template T
 * @param {Promise<T>[]} promises
 * @param {number} [delay=0]
 * @return {Promise<T[]>}
 * excluding any rejected promises.
 */
export async function filterRejectedPromises<T>(
  promises: Promise<T>[],
  delay = 0
): Promise<T[]> {
  if (delay > 0) {
    const resolvedResults: T[] = [];

    for (const promise of promises) {
      try {
        const result = await promise;
        await new Promise((resolve) => setTimeout(resolve, delay));
        resolvedResults.push(result);
      } catch (error) {
        console.log(error);
      }
    }

    return resolvedResults;
  } else {
    const results = await Promise.allSettled(promises);
    const resolvedResults: T[] = [];

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        resolvedResults.push(result.value);
      }
    });

    return resolvedResults;
  }
}

/**
 * Checks if the specified classes exist in the Weaviate schema.
 *
 * @param {WeaviateClient} client - Used to interact with the Weaviate instance.
 * @param {...string} classNames - The names of the classes to be checked.
 * @return {Promise<boolean>}
 * A Promise that resolves to true if all classes exist, otherwise false.
 * @throws {Error}
 * If there is an issue with retrieving the classes from the Weaviate schema.
 */
export async function classGuard(
  client: WeaviateClient,
  ...classNames: string[]
) {
  if (classNames.length === 0) return false;
  for (let I = 0; I < classNames.length; I++) {
    const className = classNames[I];
    try {
      await client.schema.classGetter().withClassName(className).do();
      return true;
    } catch (error) {
      console.log("Class deletion failed: " + JSON.stringify(error));
      return false;
    }
  }
  return false;
}
