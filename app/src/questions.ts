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

export interface messageProps{
  key: string,
  question: Question
}
