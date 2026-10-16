import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { createPostCleanupHandler } from './cleanup.mjs';
import { DATABASE_ID, PROJECT_ID, REGION, STORAGE_BUCKET } from './config.mjs';

const app = getApps().find((candidate) => candidate.name === 'cantera-cleanup')
  ?? initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET }, 'cantera-cleanup');

export const cleanupCommunityPost = onDocumentDeleted({
  database: DATABASE_ID,
  document: 'communityPosts/{postId}',
  region: REGION,
  retry: true,
  timeoutSeconds: 540,
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 2,
  concurrency: 1,
}, async (event) => createPostCleanupHandler({
  db: getFirestore(app, DATABASE_ID),
  bucket: getStorage(app).bucket(STORAGE_BUCKET),
  logger,
})(event));
