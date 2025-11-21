import { Quote } from "../types";
import { COLLECTIONS } from "../constants";
import {
    getDocuments,
    getDocument
} from "../firebase/firestore-utils";

export const getQuotes = (userId: string) => getDocuments<Quote>(COLLECTIONS.QUOTES, userId);
export const getQuote = (id: string) => getDocument<Quote>(COLLECTIONS.QUOTES, id);
