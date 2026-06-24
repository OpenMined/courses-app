import React from 'react';
import { faBookOpen, faCube, faLink } from '@fortawesome/free-solid-svg-icons';
import Page from '@openmined/shared/util-page';

import CourseHeader from './Header';
import { Box } from '@chakra-ui/react';

import {
  hasCompletedConcept,
  hasCompletedLesson,
  hasStartedConcept,
  hasStartedLesson,
} from './_helpers';
import { useCourseHeaderHeight } from '../../helpers';

const genDrawerSections = (
  { type, data },
  resources,
  progress,
  course,
  lesson
) => {
  console.log("Drawer data", data, progress)
  const sections = [
    {
      title: type === 'lessons' ? 'Lessons' : 'Concepts',
      icon: type === 'lessons' ? faBookOpen : faCube,
      fields: data.map(({ _id, title, ...rest }, index) => {
        let status = 'available';

        if (type === 'lessons') {
          if (hasCompletedLesson(progress, _id)) {
            status = 'completed';
          } else if (hasStartedLesson(progress, _id) || index === 0) {
            status = 'available';
          }
        } else if (type === 'concepts') {
          if (hasCompletedConcept(progress, lesson, _id)) {
            status = 'completed';
          } else if (hasStartedConcept(progress, lesson, _id) || index === 0) {
            status = 'available';
          }
        }

        const link =
          status !== 'unavailable'
            ? type === 'lessons'
              ? `/courses/${course}/${_id}`
              : `/courses/${course}/${lesson}/${_id}`
            : null;

        return { status, title, link, number: index + 1, ...rest };
      }),
    },
  ];

  if (resources) {
    sections.push({
      title: 'Resources',
      icon: faLink,
      fields: resources,
    });
  }

  return sections;
};

export default ({ page, header, children }) => {
  if (header && !Array.isArray(header.sections)) {
    header.sections = genDrawerSections(
      header.sections,
      header.resources,
      header.progress,
      header.course,
      header.lesson
    );
  }

  const courseHeaderHeight = useCourseHeaderHeight();
  return (
    <Page title={page.title} description={page.description}>
      {header && <CourseHeader {...header} />}

      <Box
        minHeight="100vh"
        display="grid"
      >
        {children}
      </Box>
    </Page>
  );
};
