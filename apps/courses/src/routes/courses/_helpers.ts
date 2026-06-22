import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoursePageWhich, User } from '@openmined/shared/types';
import { useFirestore } from 'reactfire';

export interface CourseProgress {
  lessons?: number;
  completedLessons?: number;
  concepts?: number;
  completedConcepts?: number;
  projectParts?: number;
  completedProjectParts?: number;
}

interface NextAvailablePage {
  lesson?: string;
  concept?: string;
}

// Course permissions
export const hasStartedCourse = (u) =>
  Object.keys(u).length !== 0 && !!u.started_at;
export const hasCompletedCourse = (u) =>
  hasStartedCourse(u) && !!u.completed_at;
export const getCourseProgress = (u, ls, ps): CourseProgress => {
  let numLessons = 0;
  let numCompletedLessons = 0;
  let numConcepts = 0;
  let numCompletedConcepts = 0;
  const numProjectParts = ps?.length ?? 0;
  let numCompletedProjectParts = 0;

  ls.forEach((l) => {
    numLessons++;

    if (hasCompletedLesson(u, l._id)) numCompletedLessons++;

    l.concepts?.forEach((c) => {
      numConcepts++;

      if (hasCompletedConcept(u, l._id, c._id)) numCompletedConcepts++;
    });
  });

  ps?.forEach((p) => {
    if (hasCompletedProjectPart(u, p._key)) numCompletedProjectParts++;
  });

  return {
    lessons: numLessons,
    completedLessons: numCompletedLessons,
    concepts: numConcepts,
    completedConcepts: numCompletedConcepts,
    projectParts: numProjectParts,
    completedProjectParts: numCompletedProjectParts,
  };
};

// Lesson permissions
export const getLessonIndex = (ls, l) => ls.findIndex(({ _id }) => _id === l);
export const getLessonNumber = (ls, l) => getLessonIndex(ls, l) + 1;
export const doesLessonExist = (ls, l) => getLessonIndex(ls, l) !== -1;
export const hasStartedLesson = (u, l) =>
  hasStartedCourse(u) &&
  !!u.lessons &&
  !!u.lessons[l] &&
  !!u.lessons[l].started_at;
export const hasCompletedLesson = (u, l) =>
  hasStartedLesson(u, l) && !!u.lessons[l].completed_at;

// Concept permissions
export const getConceptIndex = (ls, l, c) =>
  ls[getLessonIndex(ls, l)].concepts.findIndex(({ _id }) => _id === c);
export const getConceptNumber = (ls, l, c) => getConceptIndex(ls, l, c) + 1;
export const doesConceptExist = (ls, l, c) =>
  doesLessonExist(ls, l) && getConceptIndex(ls, l, c) !== -1;
export const hasStartedConcept = (u, l, c) =>
  hasStartedLesson(u, l) &&
  !!u.lessons[l].concepts &&
  !!u.lessons[l].concepts[c] &&
  !!u.lessons[l].concepts[c].started_at;
export const hasCompletedConcept = (u, l, c) =>
  hasStartedConcept(u, l, c) && !!u.lessons[l].concepts[c].completed_at;

// Project permissions
export const hasStartedProject = (u) =>
  hasStartedCourse(u) && !!u.project && !!u.project.started_at;
export const hasCompletedProject = (u) =>
  hasStartedProject(u) && !!u.project.completed_at;

// Project part permissions
export const PROJECT_PART_SUBMISSIONS = 3;
export const getProjectPartIndex = (ps, p) =>
  ps.findIndex(({ _key }) => _key === p);
export const getProjectPartNumber = (ps, p) => getProjectPartIndex(ps, p) + 1;
export const doesProjectPartExist = (ps, p) =>
  getProjectPartIndex(ps, p) !== -1;
export const hasStartedProjectPart = (u, p) =>
  hasStartedProject(u) &&
  !!u.project.parts[p] &&
  !!u.project.parts[p].started_at;
export const hasCompletedProjectPart = (u, p) =>
  hasStartedProjectPart(u, p) && !!u.project.parts[p].completed_at;
export const hasSubmittedProjectPart = (u, p) =>
  hasStartedProjectPart(u, p) &&
  !!u.project.parts[p].submissions &&
  u.project.parts[p].submissions.length > 0;
export const hasReceivedProjectPartReview = (u, p) =>
  hasSubmittedProjectPart(u, p) &&
  u.project.parts[p].submissions.filter((s) => s.status).length > 0 &&
  u.project.parts[p].submissions.filter((s) => s.status).length ===
    u.project.parts[p].submissions.length;
export const hasRemainingProjectPartSubmissions = (u, p) =>
  hasReceivedProjectPartReview(u, p) &&
  u.project.parts[p].submissions.filter((s) => s.status).length <
    PROJECT_PART_SUBMISSIONS;
export const SUBMISSION_REVIEW_HOURS = 4;
export const getSubmissionReviewEndTime = (started) =>
  started.add(SUBMISSION_REVIEW_HOURS, 'hour');
export const hasReceivedPassingProjectPartReview = (u, p) => {
  if (!hasReceivedProjectPartReview(u, p)) return false;

  for (let i = 0; i < u.project.parts[p].submissions.length; i++) {
    const currentSubmission = u.project.parts[p].submissions[i];

    if (
      currentSubmission.status === 'passed' &&
      currentSubmission.reviewed_at
    ) {
      return true;
    }
  }

  return false;
};
export const getLastCompletedAndInProgressConcepts = (
  u,
  ls,
  completed = 2,
  inProgress = 1
) => {
  const completedConcepts = [];
  const inProgressConcepts = [];

  ls.forEach((l) => {
    l.concepts?.forEach((c) => {
      if (hasCompletedConcept(u, l._id, c._id)) {
        completedConcepts.push(c);
        if (completedConcepts.length > completed) {
          completedConcepts.shift();
        }
      } else {
        if (inProgressConcepts.length < inProgress) {
          inProgressConcepts.push(c);
        }
      }
    });
  });

  return { completedConcepts, inProgressConcepts };
};
export const hasReceivedFailingProjectPartReview = (u, p) => {
  if (!hasReceivedProjectPartReview(u, p)) return false;

  for (let i = 0; i < u.project.parts[p].submissions.length; i++) {
    const currentSubmission = u.project.parts[p].submissions[i];

    if (
      currentSubmission.status === 'failed' &&
      currentSubmission.reviewed_at
    ) {
      return true;
    }
  }

  return false;
};
export const getProjectPartStatus = (u, p) => {
  // If they have received a review on the project part, and they passed...
  if (hasReceivedPassingProjectPartReview(u, p)) {
    return 'passed';
  }

  // If they have received a review on the project part, and they they failed, but have remaining submissions...
  else if (
    hasReceivedFailingProjectPartReview(u, p) &&
    hasRemainingProjectPartSubmissions(u, p)
  ) {
    return 'failed-but-pending';
  }

  // If they have received a review on the project part, and they they failed, and they don't have any remaining submissions...
  else if (
    hasReceivedFailingProjectPartReview(u, p) &&
    !hasRemainingProjectPartSubmissions(u, p)
  ) {
    return 'failed';
  }

  // If they have submitted the project part, but haven't received a review on it...
  else if (
    hasSubmittedProjectPart(u, p) &&
    !hasReceivedProjectPartReview(u, p)
  ) {
    return 'submitted';
  }

  // If they have started the project part, but they have not completed it...
  else if (hasStartedProjectPart(u, p) && !hasCompletedProjectPart(u, p)) {
    return 'in-progress';
  }

  return 'not-started';
};
export const getProjectStatus = (u, ps) => {
  const progress = [];

  for (let i = 0; i < ps.length; i++) {
    const status = getProjectPartStatus(u, ps[i]._key);

    if (status === 'passed') progress.push('passed');
    else if (status === 'failed') progress.push('failed');
    else if (status !== 'not-started') progress.push('in-progress');
    else progress.push('not-started');
  }

  if (progress.every((i) => i === 'passed')) {
    return 'passed';
  } else if (progress.every((i) => i === 'not-started')) {
    return 'not-started';
  } else if (progress.some((i) => i === 'failed')) {
    return 'failed';
  }

  return 'in-progress';
};

export const getNextAvailablePage = (u, ls): NextAvailablePage => {
  // If we haven't started the course at all, send them to the first lesson initiation page
  if (!hasStartedCourse(u)) return { lesson: ls[0]._id, concept: null };

  for (let i = 0; i < ls.length && ls[i].concepts?.length > 0; i++) {
    const currentLesson = ls[i];

    // If lesson is not started, make sure to mark with started_at
    if (!hasStartedLesson(u, currentLesson._id)) {
      return { lesson: currentLesson._id, concept: null };
    }

    for (let j = 0; j < currentLesson.concepts.length; j++) {
      const currentConcept = currentLesson.concepts[j]._id;

      if (!hasCompletedConcept(u, currentLesson._id, currentConcept)) {
        return { lesson: currentLesson._id, concept: currentConcept };
      }
    }

    // If we got here, then all concepts in that lesson have been completed
    // Even though all concepts are completed, make sure this lesson is marked with completed_at
    if (!hasCompletedLesson(u, currentLesson._id)) {
      return { lesson: currentLesson._id, concept: 'complete' };
    }
  }

  // Ok all lessons, concepts has started_at and completed_at
  return { lesson: 'project', concept: null };
};

// 'which' classification
const isOnProjectPage = (which: CoursePageWhich) => {
  return (
    ['project', 'projectSubmission', 'projectComplete'].indexOf(which) !== -1
  );
};

/* Compares 2 ids which can be actual id as well as falsy values like null, undefined
 * Note: null and undefined are same
 */
const isSameRouteValue = (c1, c2) => c1 === c2 || (!c1 && !c2);
const isSameLessonConcept = (c1, c2) =>
  c1.lesson === c2.lesson && isSameRouteValue(c1.concept, c2.concept);

export const isMentorOfCourse = (user: User, course: string) => {
  return (
    user &&
    user.is_mentor &&
    user.mentorable_courses &&
    Array.isArray(user.mentorable_courses) &&
    user.mentorable_courses.indexOf(course) !== -1
  );
};

export const isAllowedToAccessPage = (
  which: CoursePageWhich,
  user,
  ls,
  course,
  lesson,
  concept,
  suggestedPage: NextAvailablePage
): boolean => {
  // If project is completed, can access this page
  if (which === 'courseComplete') return hasCompletedProject(user);

  // If last lesson is completed, all lessons are completed.
  // If all lessons are completed, can access all project pages
  if (isOnProjectPage(which))
    return hasCompletedLesson(user, ls[ls.length - 1]._id);

  if (which === 'lessonComplete') {
    const clc = ls[getLessonIndex(ls, lesson)].concepts; // "Current lesson concepts"
    // Are we on a lesson completion page, and has the last concept of the current lesson been completed?
    return hasCompletedConcept(user, lesson, clc[clc.length - 1]._id);
  }

  // If it's next available page, pass right away
  if (
    isSameLessonConcept(
      { lesson: suggestedPage.lesson, concept: suggestedPage.concept },
      { lesson, concept }
    )
  ) {
    return true;
  }

  // If lesson is started can access the lesson page
  if (which === 'lesson') return hasStartedLesson(user, lesson);

  if (which === 'concept') {
    // Are we on a concept page, and has the concept been started?
    return hasStartedConcept(user, lesson, concept);
  }

  return false;
};

export const useIsAllowedToAccessPage = (
  which: CoursePageWhich,
  user,
  ls,
  params
) => {
  const [isAllowed, setIsAllowed] = useState(false);
  const { course, lesson, concept } = params;

  useEffect(() => {
    const suggestedPage = getNextAvailablePage(user, ls);
    const canAccess = isAllowedToAccessPage(
      which,
      user,
      ls,
      course,
      lesson,
      concept,
      suggestedPage
    );

    if (!canAccess) {
      let url = `/courses/${course}/${suggestedPage.lesson}`;
      if (suggestedPage.concept) url = `${url}/${suggestedPage.concept}`;

      // TODO: https://github.com/OpenMined/courses-app/issues/53
      // navigate(url);
      window.location.href = url;
    } else {
      setIsAllowed(canAccess);
    }
  }, [user, ls, course, lesson, concept, which]);

  return isAllowed;
};

// TODO: https://github.com/OpenMined/courses-app/issues/54
export const useCoursePermissionGate = (user, lessons, page, params) => {
  // For pages that don't require any permissions or redirection...
  const permissionless = ['search', 'overview'];
  if (permissionless.includes(page)) return { status: 'available' };

  // Patrick, pick things up here...

  return { page, user, lessons, params };
};
