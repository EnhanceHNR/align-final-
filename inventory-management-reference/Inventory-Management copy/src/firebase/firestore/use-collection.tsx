
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
  forceRefetch: () => void;
}

export function useCollection<T = any>(
    targetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>))  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const forceRefetch = useCallback(() => {
    setRefetchTrigger(c => c + 1);
  }, []);

  useEffect(() => {
    if (!targetRefOrQuery) {
        setIsLoading(false);
        setData(null);
        setError(null);
        return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      targetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = snapshot.docs.map(doc => ({ ...(doc.data() as T), id: doc.id }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        let path: string;
        if (targetRefOrQuery.type === 'collection') {
            path = (targetRefOrQuery as CollectionReference).path;
        } else {
            // This is a simplified way to get path from a query.
            // A more robust solution might be needed for complex queries.
            path = (targetRefOrQuery as Query)._query.path.canonicalString();
        }

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [targetRefOrQuery, refetchTrigger]);

  return { data, isLoading, error, forceRefetch };
}
