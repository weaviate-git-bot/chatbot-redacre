export interface QandAs {
  Question: string;
  Answer: string;
}

export interface Question {
  question: string;
  response?: string;
  createdAt: Date;
  respondedAt?: Date;
  generated?: boolean;
  userId: string;
  userPic: string;
  rating?: number;
}

export interface messageProps{
  key: string,
  question: Question
}

export enum nearTextModules{
  TEXT2VEC_OPENAI= "text2vec-openai",
  TEXT2VEC_COHERE= "text2vec-cohere",
  TEXT2VEC_HUGGINGFACE= "text2vec-huggingface",
  TEXT2VEC_TRANSFORMERS= "text2vec-transformers",
  TEXT2VEC_CONTEXTIONARY= "text2vec-contextionary",
  MULTI2VEC_CLIP= "multi2vec-clip",
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

export interface ResultFormat {
  question: string;
  answer: string;
  certainty: number;
}

export interface FieldsData {
  question: string;
  answer: string;
  _additional: FieldsDataAdditional;
  [key: string]: any;
}

export interface FieldsDataAdditional {
  certainty: number;
  distance: number;
  [key: string]: any;
}

export interface AnswerResponseData {
  Get: DefinedClasses;
}

export interface DefinedClasses {
  HuggingFace?: FieldsData[];
  HuggingFaceInverted?: FieldsData[];
  OpenAI?: FieldsData[];
  OpenAIInverted?: FieldsData[];
  [key: string]: FieldsData[] | undefined;
}
