import admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import dayjs from 'dayjs';

import { SUBMISSION_REVIEW_HOURS } from '../../../courses/src/routes/courses/_helpers';
import { MentorReview, CourseProjectSubmission } from '@openmined/shared/types';

export const assignReview = async (data, context) => {
  // Get the current user and the course
  const user = context.auth.uid;
  const course = data.course;

  // If there isn't a user...
  if (!context.auth || !user) return { error: 'Sorry, you are not signed in' };

  try {
    // Try to get this user from the list of users
    const dbUserRef = admin.firestore().collection('users').doc(user);
    const dbUser = await dbUserRef.get();

    // If they're not a user...
    if (!dbUser.exists) return { error: 'Sorry, you are not a user' };

    // Otherwise, get their data
    const dbUserData = dbUser.data();

    // If they're a user, but not a mentor
    if (!dbUserData.is_mentor) return { error: 'Sorry, you are not a mentor' };

    // If they can't review the course they're asking to review...
    if (!dbUserData.mentorable_courses.includes(course)) {
      return { error: 'Sorry, you are not allowed review this course' };
    }

    // Otherwise, this is a legitimate request
    else {
      // Get 1 submission that's ordered by oldest for this course
      // ... that doesn't currently have a mentor assigned
      // ... and the student isn't also the mentor
      // NOTE: Since we're using an inequality filter on student, Firebase requires the first "sort" statement to be on this field
      const dbSubmissions = await admin
        .firestore()
        .collectionGroup('submissions')
        .orderBy('student')
        .where('course', '==', course)
        .where('mentor', '==', null)
        .where('student', '!=', dbUserRef)
        .orderBy('submitted_at', 'asc')
        .get();

      const assignments: CourseProjectSubmission[] = [];
      dbSubmissions.forEach((submission) =>
        assignments.push(submission.data() as CourseProjectSubmission)
      );

      // Filter out resigned from - since we cannot do 2 != filtering
      const notResignedAssignments = assignments.filter((assignment) => {
        const resignedMentors = assignment.resigned_mentors;
        return !resignedMentors || !resignedMentors[user];
      });

      // If we don't find anything...
      if (notResignedAssignments.length == 0) {
        return {
          error: `There are no submissions available for "${course}" course`,
        };
      }

      // Get the assignment
      const assignment = notResignedAssignments[0];

      // Get the ID of the student from that assignment
      const studentId = assignment.student.id;

      const courseRef = admin
        .firestore()
        .doc(`/users/${studentId}/courses/${course}`);

      const batch = admin.firestore().batch();

      // Add the mentor to the list of assigned mentors
      batch.set(
        courseRef,
        {
          allowed_mentors: {
            [assignment.attempt]: user,
          },
        },
        { merge: true }
      );

      // Store a reference to the assignment
      const submissionRef = admin
        .firestore()
        .doc(
          `/users/${studentId}/courses/${course}/submissions/${assignment.id}`
        );

      // Write the assignment to the submission
      batch.set(
        submissionRef,
        {
          mentor: admin.firestore().doc(`/users/${user}`),
          review_started_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Write the assignment to the mentor's reviews subcollection with the same ID
      batch.set(
        admin
          .firestore()
          .collection(`/users/${user}/reviews`)
          .doc(assignment.id),
        {
          submission: submissionRef,
          id: assignment.id,
          student: assignment.student,
          course: assignment.course,
          part: assignment.part,
          attempt: assignment.attempt,
          status: 'pending',
          started_at: admin.firestore.FieldValue.serverTimestamp(),
          completed_at: null,
        }
      );

      await batch.commit();

      // Return it to the user
      return assignment;
    }
  } catch (error) {
    return { error };
  }
};

export const resignReview = async (data, context) => {
  // Get the current user and the assignment
  const user = context.auth.uid;
  const submission = data.submission;
  const mentor = data.mentor;

  // If there isn't a user...
  if (!context.auth || !user) return { error: 'Sorry, you are not signed in' };

  // If the user requestion isn't the mentor themselves...
  if (user !== mentor)
    return { error: 'Sorry, you are not the assigned mentor' };

  try {
    // Get the submission in question
    const dbSubmissions = await admin
      .firestore()
      .collectionGroup('submissions')
      .where('id', '==', submission)
      .where('mentor', '==', admin.firestore().doc(`/users/${user}`))
      .limit(1)
      .get();

    // If we don't find anything...
    if (dbSubmissions.empty) {
      return { error: 'Sorry, we could not find that submission' };
    }

    // Get the assignment reference
    const assignmentRef = dbSubmissions.docs[0].ref;
    const assignment = dbSubmissions.docs[0].data();

    // Get the ID of the student from that assignment
    const studentId = assignment.student._path.segments[1];

    const courseRef = admin
      .firestore()
      .doc(`/users/${studentId}/courses/${assignment.course}`);

    const batch = admin.firestore().batch();

    // Add the mentor to the list of assigned mentors
    batch.set(
      courseRef,
      {
        allowed_mentors: {
          [assignment.attempt]: null,
        },
      },
      { merge: true }
    );

    // Write the assignment to the submission
    const newResignedMentors = assignment.resigned_mentors
      ? { ...assignment.resigned_mentors, [mentor]: true }
      : { [mentor]: true };
    batch.set(
      assignmentRef,
      {
        mentor: null,
        review_started_at: null,
        // log who resigned from this submission
        resigned_mentors: newResignedMentors,
      },
      { merge: true }
    );

    // Resign the review to the mentor's reviews collection
    batch.set(
      admin.firestore().doc(`/users/${mentor}/reviews/${submission}`),
      {
        status: 'resigned',
        completed_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();

    // Return the resigned review to the mentor
    return { success: true };
  } catch (error) {
    return { error };
  }
};

export const checkForUnreviewedSubmissions = async () => {
  try {
    // Get the time "SUBMISSION_REVIEW_HOURS" ago
    const time = dayjs().subtract(SUBMISSION_REVIEW_HOURS, 'hour').toDate();

    // Get all reviews where the review started over "SUBMISSION_REVIEW_HOURS" ago
    // But has not been completed yet
    const dbReviews = await admin
      .firestore()
      .collectionGroup('reviews')
      .where('started_at', '<', time)
      .where('completed_at', '==', null)
      .get();

    // If we don't find anything...
    if (dbReviews.empty) {
      logger.log('There are no submissions that need to be resigned');
      return { success: 'There are no submissions that need to be resigned' };
    }

    // Store all the writes in a batch
    const batch = admin.firestore().batch();

    // For each review
    dbReviews.forEach((review) => {
      // Resign the review
      batch.set(
        review.ref,
        {
          status: 'resigned',
          completed_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Get the data to find the corresponding submission
      const data = review.data();

      // Clear the submission assignment
      batch.set(
        data.submission,
        { mentor: null, review_started_at: null },
        { merge: true }
      );

      // Get the ID of the student from that assignment
      const studentId = data.student._path.segments[1];

      // Remove the mentor from the attempts map
      batch.set(
        admin.firestore().doc(`/users/${studentId}/courses/${data.course}`),
        {
          allowed_mentors: {
            [data.attempt]: null,
          },
        },
        { merge: true }
      );
    });

    // Commit the batch
    batch.commit().then(() => {
      // Get the count
      const count = dbReviews.size;

      logger.log(`We found ${count} submissions that had to be resigned`);
      return {
        success: `We found ${count} submissions that had to be resigned`,
      };
    });
  } catch (error) {
    logger.error('Error', error);
    return { error };
  }
};

export const calculateCompletedResignedReviews = async (change, context) => {
  try {
    const { mentorId } = context.params;

    const dbReviews = await admin
      .firestore()
      .collection(`/users/${mentorId}/reviews`)
      .get();

    const mentorRef = admin.firestore().collection('users').doc(mentorId);

    const reviews: MentorReview[] = dbReviews.docs.map(
      (doc) => doc.data() as MentorReview
    );

    const numResigned = reviews.filter((review) => review.status === 'resigned')
      .length;
    const numCompleted = reviews.filter(
      (review) => review.status === 'reviewed'
    ).length;

    await mentorRef.set({ numResigned, numCompleted }, { merge: true });
  } catch (error) {
    logger.error('calculateAssignedResignedReviews failed', error);
  }
};
