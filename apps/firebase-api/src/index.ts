import path from 'path';
import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import * as dotenv from 'dotenv-flow';

const envs = [
  path.resolve(process.cwd(), '.secret.env'),
  path.resolve(process.cwd(), '.env'),
];

if (process.env.NODE_ENV === 'development') {
  envs.push(path.resolve(process.cwd(), '.local.env'));
}

dotenv.load(envs);
admin.initializeApp();

// import ssr from './app/ssr';
import {
  assignReview,
  resignReview,
  checkForUnreviewedSubmissions,
  calculateCompletedResignedReviews,
} from './app/review';
import { completeCourse } from './app/courses';
import { sendEmail } from './app/email';
import sanity from './app/sanity';
import { onCourseSubmissionUpdate } from './app/submissions';
import { addUniqueNumberToUser, addUNumToAllUsers } from './app/users';

// stats
import { initStatsCollection } from './app/stats/index';
import {
  statsActiveUserIncrease,
  statsActiveUserDecrease,
} from './app/stats/active-users';
import { calStatsOnWriteReviews } from './app/stats/reviews';
import { calStatsOnWriteSubmissions } from './app/stats/submissions';
import { calStatsOnWriteCourses } from './app/stats/courses';

// Pick review for assignment or resign from a review
exports.assignReview = functions
  .region('europe-west1')
  .https.onCall(assignReview);
exports.resignReview = functions
  .region('europe-west1')
  .https.onCall(resignReview);

// Check for all unreviewed (and late) submissions and reassign them
exports.checkForUnreviewedSubmissions = functions
  .region('europe-west1')
  .pubsub.schedule('every 30 minutes')
  .onRun(checkForUnreviewedSubmissions);

// Complete a course
exports.completeCourse = functions
  .region('europe-west1')
  .https.onCall(completeCourse);

// Add unique number to each user
exports.addUniqueNumberToUser = functions
  .region('europe-west1')
  .auth.user()
  .onCreate(addUniqueNumberToUser);

// Add unique number to all users
exports.addUniqueNumberToAllUsers = functions
  .region('europe-west1')
  // Use higher memory and timeout since it might take some time to process
  .runWith({ memory: '2GB', timeoutSeconds: 540 })
  .https.onRequest(addUNumToAllUsers);

// Send the user an email when they sign up
exports.sendWelcomeEmail = functions
  .region('europe-west1')
  .auth.user()
  .onCreate((user) => sendEmail('createAccount', user.email, { user }));

// Send the user an email when they delete their account
exports.sendByeEmail = functions
  .region('europe-west1')
  .auth.user()
  .onDelete((user) => sendEmail('deleteAccount', user.email, { user }));

// Send the user an email when they start a course
exports.startCourse = functions
  .region('europe-west1')
  .firestore.document('users/{userId}/courses/{courseId}')
  .onCreate(async (snap, context) => {
    await admin
      .auth()
      .getUser(context.params.userId)
      .then((user) => {
        return sendEmail('startCourse', user.email, { data: snap.data() });
      });
  });

// Send the user an email when they receive a project review
exports.receiveReview = functions
  .region('europe-west1')
  .firestore.document(
    'users/{userId}/courses/{courseId}/submissions/{submissionId}'
  )
  .onUpdate(onCourseSubmissionUpdate);

// Calculate the resigned and completed reviews
exports.calculateCompletedResignedReviews = functions
  .region('europe-west1')
  .firestore.document('users/{mentorId}/reviews/{reviewId}')
  .onWrite(calculateCompletedResignedReviews);

// Init stats collection
exports.initStatsCollection = functions
  .region('europe-west1')
  // Use higher memory and timeout since it might take some time to process
  .runWith({ memory: '2GB', timeoutSeconds: 540 })
  .https.onRequest(initStatsCollection);

// Calculate the submissions related stats
exports.calStatsOnWriteSubmissions = functions
  .region('europe-west1')
  .firestore.document(
    'users/{userId}/courses/{courseId}/submissions/{submissionId}'
  )
  .onWrite(calStatsOnWriteSubmissions);

// Calculated reviews related stats
exports.calStatsOnWriteReviews = functions
  .region('europe-west1')
  .firestore.document('users/{mentorId}/reviews/{reviewId}')
  .onWrite(calStatsOnWriteReviews);

// Calculated courses related stats
exports.calStatsOnWriteCourses = functions
  .region('europe-west1')
  .firestore.document('users/{userId}/courses/{courseId}')
  .onWrite(calStatsOnWriteCourses);

// Increase when there's a new user
exports.statsActiveUserIncrease = functions
  .region('europe-west1')
  .auth.user()
  .onCreate(statsActiveUserIncrease);

// Decrease when user is removed
exports.statsActiveUserDecrease = functions
  .region('europe-west1')
  .auth.user()
  .onDelete(statsActiveUserDecrease);

// Set up Sanity API requests
exports.sanity = functions.region('europe-west1').https.onCall(sanity);

// TODO: https://github.com/OpenMined/courses-app/issues/52
// exports.ssr = functions.region('europe-west1').https.onRequest(ssr);
