import React from 'react';
import {
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  Link,
  ListItem,
  Tag,
  TagLabel,
  Text,
  UnorderedList,
} from '@chakra-ui/react';
import { useFirestore } from 'reactfire';
import {
  faBug,
  faCheckCircle,
  faCommentAlt,
  faListUl,
  faMinusCircle,
  faTimesCircle,
  faShapes,
  faStar,
  faClock,
  faCertificate,
} from '@fortawesome/free-solid-svg-icons';
import { Link as RRDLink } from 'react-router-dom';
import { CoursePagesProp } from '@openmined/shared/types';

import ProjectAccordion from './ProjectAccordion';

import {
  getProjectPartStatus,
  getProjectStatus,
  hasStartedProjectPart,
  PROJECT_PART_SUBMISSIONS,
} from '../_helpers';
import { handleProjectPartBegin } from '../_firebase';
import GridContainer from '../../../components/GridContainer';
import Icon from '../../../components/Icon';
import { getLinkPropsFromLink } from '../../../helpers';
import { handleErrors } from '../../../helpers';
import useToast from '../../../components/Toast';
import { discussionLink, issuesLink } from '../../../content/links';

// The detail links on the sidebar
const Detail = ({ title, value, icon = faCheckCircle }) => (
  <Flex align="center" mb={4}>
    <Icon icon={icon} boxSize={8} />
    <Box ml={4}>
      <Text fontWeight="bold">{title}</Text>
      <Text color="gray.700">{value}</Text>
    </Box>
  </Flex>
);

// Make sure that the submissions array always has a status
const ensurePopulatedSubmissionsArray = (submissions) =>
  submissions && submissions.length > 0
    ? [
        ...submissions.map((s) => {
          if (s.status) return s;

          return { ...s, status: 'pending' };
        }),
        ...Array(PROJECT_PART_SUBMISSIONS - submissions.length).fill({
          status: 'none',
        }),
      ]
    : Array(PROJECT_PART_SUBMISSIONS).fill({ status: 'none' });

// Tell us the status the entire project
// ... and go through the user's progress and tell us the status of each part
export const prepAccordionAndStatus = (progress, parts) => {
  const content = parts.map((part) => ({
    ...part,
    status: getProjectPartStatus(progress, part._key),
    submissions: hasStartedProjectPart(progress, part._key)
      ? ensurePopulatedSubmissionsArray(
          progress.project.parts[part._key].submissions
        )
      : [],
  }));

  return { content, status: getProjectStatus(progress, parts) };
};

// Return the appropriate text and <Tag /> styles for the relevant status
const getStatusStyles = (status) => {
  if (status === 'not-started') {
    return {
      text: 'Not Started',
    };
  } else if (status === 'in-progress') {
    return {
      text: 'In Progress',
      icon: faMinusCircle,
      colorScheme: 'blue',
    };
  } else if (status === 'passed') {
    return {
      text: 'Passed',
      icon: faCheckCircle,
      colorScheme: 'green',
    };
  } else if (status === 'failed') {
    return {
      text: 'Failed',
      icon: faTimesCircle,
      colorScheme: 'magenta',
    };
  }
};

export default ({ course, page, progress, user, ts }: CoursePagesProp) => {
  const db = useFirestore();
  const toast = useToast();

  const {
    title: courseTitle,
    project: { title, description, goals, needs, parts },
    level,
    length,
    certification,
  } = page;

  // Set up the width of the sidebar
  const SIDEBAR_WIDTH = 360;

  // Define the resources for that sidebar, too
  const resources = [
    {
      title: 'Discussion Board',
      link: discussionLink,
      icon: faCommentAlt,
    },
    {
      title: 'Course Syllabus',
      link: `/courses/${course}`,
      icon: faListUl,
    },
    {
      title: 'Report Issue',
      link: issuesLink,
      icon: faBug,
    },
  ];

  // Make sure to get the content for each of the parts and the project status
  const { content, status } = prepAccordionAndStatus(progress, parts);

  // Also get the styles for the current project status
  const {
    icon: statusIcon,
    text: statusText,
    ...statusStyles
  } = getStatusStyles(status);

  // When beginning a project part
  const onBeginProjectPart = (part) =>
    handleProjectPartBegin(
      db,
      user.uid,
      course,
      ts,
      progress,
      part
    ).catch((error) => handleErrors(toast, error));

  return (
    <GridContainer py={16}>
      <Flex align="flex-start" direction={{ base: 'column', lg: 'row' }}>
        <Box mr={{ lg: 16 }}>
          <Text color="gray.700" fontWeight="bold" mb={2}>
            {courseTitle}
          </Text>
          <Box position="relative" mb={4}>
            <Icon
              icon={faShapes}
              boxSize={8}
              position="absolute"
              top={1}
              left={-16}
            />
            <Heading as="h1" size="xl">
              {title}
            </Heading>
          </Box>
          <Tag {...statusStyles}>
            {statusIcon && <Icon icon={statusIcon} mr={2} />}
            <TagLabel fontWeight="bold">{statusText}</TagLabel>
          </Tag>
          <Divider my={6} />
          <Text color="gray.700" mb={6}>
            {typeof description === 'string' ? description : description()}
          </Text>
          <Heading mb={4} as="p" size="md">
            Goal
          </Heading>
          <UnorderedList spacing={2} mb={6}>
            {goals.map((goal) => (
              <ListItem key={goal}>{goal}</ListItem>
            ))}
          </UnorderedList>
          <ProjectAccordion
            content={content}
            course={course}
            onBeginProjectPart={onBeginProjectPart}
            mb={6}
          />
          <Button
            disabled={!(status === 'passed' || status === 'failed')}
            // TODO: https://github.com/OpenMined/courses-app/issues/53
            // as={RRDLink}
            // to={`/courses/${course}/project/complete`}
            as="a"
            href={`/courses/${course}/project/complete`}
            target="_self"
            colorScheme="black"
          >
            Finish
          </Button>
        </Box>
        <Box
          bg="gray.100"
          borderRadius="md"
          p={8}
          width={{ base: 'full', lg: SIDEBAR_WIDTH }}
          flex={{ lg: `0 0 ${SIDEBAR_WIDTH}px` }}
          mt={{ base: 8, lg: 0 }}
        >
          {level && <Detail title="Level" value={level} icon={faStar} />}
          {length && <Detail title="Length" value={length} icon={faClock} />}
          {certification && (
            <Detail
              title="Certification"
              value={certification.title}
              icon={faCertificate}
            />
          )}
          <Divider my={6} />
          <Text fontWeight="bold" mb={4}>
            What You'll need
          </Text>
          <UnorderedList spacing={2}>
            {needs.map(({ title, link }) => {
              if (link) {
                return (
                  <ListItem key={title}>
                    <Link
                      {...getLinkPropsFromLink(link)}
                      color="gray.700"
                      _hover={{ color: 'gray.800' }}
                    >
                      {title}
                    </Link>
                  </ListItem>
                );
              }

              return (
                <ListItem key={title} color="gray.700">
                  {title}
                </ListItem>
              );
            })}
          </UnorderedList>
          <Divider my={6} />
          {resources.map(({ title, link, icon }, index) => {
            return (
              <Link
                key={index}
                color="gray.700"
                _hover={{ color: 'gray.800' }}
                variant="flat"
                display="block"
                mt={6}
                {...getLinkPropsFromLink(link)}
              >
                <Flex align="center">
                  <Icon icon={icon} boxSize={5} mr={4} />
                  <Text>{title}</Text>
                </Flex>
              </Link>
            );
          })}
        </Box>
      </Flex>
    </GridContainer>
  );
};
