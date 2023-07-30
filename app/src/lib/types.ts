import { FirebaseApp } from "firebase/app";

export interface Question {
  question:           string;
  response?:          string;
  createdAt:          Date;
  respondedAt?:       Date;
  generated?:         boolean;
  userId:             string;
  userPic:            string;
  rating?:            number;
}

export interface ChatroomProps{
  app: FirebaseApp,
}

export interface SigninProps{
  app: FirebaseApp,
}

export interface MessageProps{
  key: string,
  question: Question,
}

export interface WeaviateProps{
  handler: React.MouseEventHandler,
  app: FirebaseApp,
  open: boolean,
  model: WeaviateModels | null,
}

export enum WeaviateModels{
  OPEN_AI= "OpenAI",
  HUGGING_FACE= "HuggingFace",
}

export enum FireBaseServerlessFunctions{
  ANSWER_QUESTION= "answerQuestion",
  SETUP_WEAVIATE= "setupWeaviate",
  SEED_WEAVIATE= "seedWeaviate",
}

export class CustomError extends Error {
  public reason: string;

  constructor(message?: string, public operation?: CustomErrorOperation) {
    super(message);
    this.reason = String(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export enum CustomErrorOperation{
  FAIL= "fail",
  SUCCESS= "success",
  ERROR= "error",
}

export enum FusionType {
  rankedFusion = "rankedFusion",
  relativeScoreFusion = "relativeScoreFusion"
}