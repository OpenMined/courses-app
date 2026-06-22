import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useFirestore, useUser } from 'reactfire';
import {
  CoursePageWhich,
  CoursePagesProp,
  Course,
} from '@openmined/shared/types';
import { useFirebaseSanity } from '@openmined/shared/data-access-sanity';

import { useIsAllowedToAccessPage } from './_helpers';
import * as configs from './_configs';
import CourseWrap from './Wrapper';
import { getCourseRef } from './_firebase';

import Loading from '../../components/Loading';
import { usePrevious } from '../../helpers';

import CourseSearch from './search';
import CourseOverview from './overview';
import CourseComplete from './course-complete';
import CourseProject from './project';
import CourseProjectSubmission from './project-submission';
import CourseProjectComplete from './project-complete';
import CourseLesson from './lesson';
import CourseLessonComplete from './lesson-complete';
import CourseConcept from './concept';

// What component do we render given what page is specified in the main routes file?
const pages = {
  search: CourseSearch,
  overview: CourseOverview,
  courseComplete: CourseComplete,
  project: CourseProject,
  projectSubmission: CourseProjectSubmission,
  projectComplete: CourseProjectComplete,
  lesson: CourseLesson,
  lessonComplete: CourseLessonComplete,
  concept: CourseConcept,
};

const PermissionsGate = ({ children, progress, which, page, ...params }) => {
  // Check whether or not we're able to see this page
  const isAllowed = useIsAllowedToAccessPage(
    which,
    progress, // The user's progress
    page.lessons || page.course.lessons, // The CMS's list of lessons and concepts
    params,
  );

  if (!isAllowed) return <Loading />;

  // Otherwise, render the component itself
  return children;
}

type PropType = {
  which: CoursePageWhich;
};

export default ({ which }: PropType) => {
  // Get all the URL params
  const params: any = useParams();

  // Get all search params
  const [searchParams] = useSearchParams();

  // We need to have the UID of the student when a mentor wants to view the submission page of a student
  // Since they will have different ID's, we need to ensure that IF we're a mentor trying to leave a review
  // That the "dbCourseRef" is referencing the right user
  // If we're not a mentor in the process of a review, we can assume it's a student trying to get their own "dbCourseRef"
  const mentorStudentToken = searchParams.get('student');

  // Get the user's current progress on their courses
  const user: firebase.User = useUser();
  const uId = user ? user.uid : null;
  const db = useFirestore();
  const dbCourseRef =
    params.course && user
      ? getCourseRef(db, mentorStudentToken || user.uid, params.course)
      : null;

  // Set the course object that the user is requesting
  const [dbCourse, setDbCourse] = useState<Course>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      const courseData = (await dbCourseRef.get()).data();

      setDbCourse(courseData || {});
    };

    if (dbCourseRef) fetchCourse();
  }, [uId, mentorStudentToken, params.lesson, params.course, params.concept]);

  const prevUId = usePrevious(uId);
  useEffect(() => {
    if (!uId && prevUId) {
      // when user is logged out
      setDbCourse({});
    }
  }, [uId, prevUId]);

  // Store a reference to the server timestamp (we'll use this later to mark start and completion time)
  // Note that this value will always reflect the Date.now() value on the server, it's not a static time reference
  const serverTimestamp = useFirestore.FieldValue.serverTimestamp;

  // Create variables to store the page to render and the query we'll make to Sanity
  const CoursePage = pages[which];

  // Define what pages do not need the permissions check
  const permissionlessPages = ['search', 'overview'];

  // Define which pages should not block rendering when user is authenticated
  const blocklessPages = ['search'];

  // Get our data from the CMS
  const { data, loading } = useFirebaseSanity(which, params);

  // TODO: https://github.com/OpenMined/courses-app/issues/54
  // const newPermissionGate = useCoursePermissionGate(
  //   dbCourse,
  //   data,
  //   which,
  //   params
  // );
  // console.log('NEW', newPermissionGate);

  // Define the props we'll be passing to each page (and to the permission hook)
  const props: CoursePagesProp = {
    ...params,
    page: data,
    which,
    user,
    progress: dbCourse,
    ts: serverTimestamp,
  };

  // If we're still waiting on the CMS, render the loader
  if (loading) return <Loading />;

  // If user is authenticated, wait for dbCourse on all blocking pages
  if (user && !dbCourse && !blocklessPages.includes(which)) return <Loading />;

  // Prepare the configuration we'll send to the wrapper
  let config: any = {};

  try {
    config = configs[which](props);
  } catch (err) {
    return <Loading />;
  }

  // If the page being requested doesn't require the permission gate, render the component directly
  if (permissionlessPages.includes(which)) {
    return (
      <CourseWrap {...config}>
        <CoursePage {...props} />
      </CourseWrap>
    );
  }

  // When ready, pass our component as a child of the permissions page
  return (
    <PermissionsGate {...props}>
      <CourseWrap {...config}>
        <CoursePage {...props} />
      </CourseWrap>
    </PermissionsGate>
  );
};
