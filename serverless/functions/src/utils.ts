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
 * @return {Promise<T[]>}
 * excluding any rejected promises.
 */
export async function filterRejectedPromises<T>(
  promises: Promise<T>[]
): Promise<T[]> {
  const results = await Promise.allSettled(promises);
  const resolvedResults: T[] = [];

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      resolvedResults.push(result.value);
    }
  });

  return resolvedResults;
}
