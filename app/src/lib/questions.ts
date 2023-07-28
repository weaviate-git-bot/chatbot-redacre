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

export interface chatroomProps{
  app: FirebaseApp,
}

export interface signinProps{
  app: FirebaseApp,
}

export interface messageProps{
  key: string,
  question: Question,
}
