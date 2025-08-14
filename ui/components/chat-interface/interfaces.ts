import { Timestamp } from "firebase/firestore"


export interface ISession {
  sessionId: string
  userId: string
  name?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type TMessage = IUserMessage | IAssistantMessage
export type TMessageRole = 'user' | 'assistant'

export interface IUserMessage {
  id: string
  sessionId: string
  userId: string
  role: 'user'
  message: string
  createdAt: Timestamp
}

export interface IAssistantMessage {
  id: string
  sessionId: string
  userId: string
  role: 'assistant'
  message: IMessageItem[]
  createdAt: Timestamp
}

export interface IMessageItem {
    annotations: any[]
    logprobs: any[]
    text: string
    type: string
}
