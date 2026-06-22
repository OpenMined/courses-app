import React, { useState } from 'react';
import {
  Box,
  Button,
  Circle,
  Divider,
  Flex,
  Heading,
  Image,
  Link,
  SimpleGrid,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import {
  useFirestore,
  useFirestoreCollectionData,
  useFirestoreDocData,
  useFunctions,
  useUser,
} from 'reactfire';
import {
  faCommentAlt,
  faPiggyBank,
  faQuestionCircle,
  faShapes,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { faCalendarCheck } from '@fortawesome/free-regular-svg-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { CourseProjectSubmission, CourseMetric } from '@openmined/shared/types';

import {
  getSubmissionReviewEndTime,
  SUBMISSION_REVIEW_HOURS,
} from '../../courses/_helpers';
import { analytics } from '../../../helpers';
import ColoredTabs from '../../../components/ColoredTabs';
import useToast, { toastConfig } from '../../../components/Toast';
import Countdown from '../../../components/Countdown';
import Icon from '../../../components/Icon';
import {
  discussionLink,
  mentorfaqLink,
  mentorratesLink,
  codeofconductLink,
  shiftscheduleLink,
} from '../../../content/links';
import { useMentorLoadReviews } from '../../../hooks/useMentorLoadReviews';

dayjs.extend(relativeTime);

const useActiveReviewData = () => {
  const user: firebase.User = useUser();
  const db = useFirestore();
  const activeReviewsRef = db
    .collectionGroup('submissions')
    .where('mentor', '==', db.doc(`/users/${user.uid}`))
    .where('status', '==', null);
  const activeReviewsData: CourseProjectSubmission[] = useFirestoreCollectionData(
    activeReviewsRef
  );

  return activeReviewsData;
};
const getMentorableCourses = (courses, user) =>
  user.mentorable_courses.map((id) => {
    const courseIndex = courses.findIndex(({ slug }) => slug === id);

    if (courseIndex !== -1) return courses[courseIndex];
    return null;
  });

export const MentorContext = ({ courses }) => {
  const toast = useToast();
  const functions: firebase.functions.Functions = useFunctions();
  // @ts-ignore
  functions.region = 'europe-west1';

  const requestResignation = functions.httpsCallable('resignReview');

  const [buttonClicked, setButtonClicked] = useState(false);

  const activeReviewsData = useActiveReviewData();

  const activeReviews = activeReviewsData.map((r) => {
    const courseIndex = courses.findIndex(({ slug }) => slug === r.course);

    if (courseIndex !== -1) return { ...r, course: courses[courseIndex] };
    return null;
  });

  return (
    <Box width="full" borderRadius="md" boxShadow="lg" overflow="hidden" p={6}>
      <Heading as="p" size="md" mb={2}>
        Your Reviews
      </Heading>
      {activeReviews.length === 0 && (
        <Box p={4} bg="gray.200" color="gray.700" borderRadius="md">
          Your queue is empty, click "Review" on a course below to begin.
        </Box>
      )}
      {activeReviews.length > 0 &&
        activeReviews.map((review, index) => (
          <Box key={index} mt={activeReviews.length > 1 && index !== 0 ? 4 : 0}>
            <Text fontFamily="mono" color="gray.700">
              Time Remaining:{' '}
              <Countdown
                time={getSubmissionReviewEndTime(
                  dayjs(review.review_started_at.toDate())
                )}
              />
            </Text>
            <Flex
              p={3}
              mt={2}
              bg="gray.200"
              borderRadius="md"
              direction={['column', null, 'row']}
              justify="space-between"
              align="center"
            >
              <Flex align="center">
                <Icon icon={faShapes} boxSize={8} ml={1} mr={4} />
                <Heading as="p" size="sm">
                  {review.course.project
                    ? review.course.project.parts[
                        review.course.project.parts.findIndex(
                          (p) => p._key === review.part
                        )
                      ].title
                    : 'Upcoming project'}
                </Heading>
              </Flex>
              <Flex align="center" mt={[3, null, 0]}>
                <Button
                  variant="ghost"
                  colorScheme="gray"
                  mr={3}
                  isDisabled={buttonClicked}
                  isLoading={buttonClicked}
                  onClick={() => {
                    setButtonClicked(true);

                    analytics.logEvent('Project Submission Resigned', {
                      course: review.course,
                      part: review.part,
                      attempt: review.attempt,
                    });

                    requestResignation({
                      submission: review.id,
                      mentor: review.mentor.id,
                    }).then(({ data }) => {
                      setButtonClicked(false);

                      if (data && !data.error) {
                        toast({
                          ...toastConfig,
                          title: 'Resigned from review',
                          description: 'You have resigned from this review',
                          status: 'success',
                        });
                      } else {
                        toast({
                          ...toastConfig,
                          title: 'Error resigning from review',
                          description: data.error,
                          status: 'error',
                        });
                      }
                    });
                  }}
                >
                  Resign
                </Button>
                <Button
                  colorScheme="black"
                  isDisabled={buttonClicked}
                  isLoading={buttonClicked}
                  // TODO: https://github.com/OpenMined/courses-app/issues/53
                  // as={RRDLink}
                  // to={`/courses/${review.course.slug}/project/${review.part}/${review.attempt}/?student=${review.student.id}`}
                  as="a"
                  href={`/courses/${review.course.slug}/project/${review.part}/${review.attempt}/?student=${review.student.id}`}
                  target="_self"
                >
                  Review
                </Button>
              </Flex>
            </Flex>
          </Box>
        ))}
      <Divider my={6} />
      <Heading as="p" size="md" mb={2}>
        Your Shifts
      </Heading>
      <Text color="gray.700" mb={6}>
        Sign up for a Discussion Board shift on our "Shift Calendar".
      </Text>
      <Flex direction={['column', null, null, 'row']} align="center">
        <Link
          as="a"
          href={shiftscheduleLink}
          target="_blank"
          rel="noopener noreferrer"
          color="gray.700"
          _hover={{ color: 'gray.800' }}
          variant="flat"
        >
          <Flex align="center">
            <Icon icon={faCalendarCheck} boxSize={5} mr={3} />
            <Text fontWeight="bold">Shift Calendar</Text>
          </Flex>
        </Link>
        <Link
          as="a"
          href={discussionLink}
          target="_blank"
          rel="noopener noreferrer"
          ml={[0, null, null, 8]}
          mt={[2, null, null, 0]}
          color="gray.700"
          _hover={{ color: 'gray.800' }}
          variant="flat"
        >
          <Flex align="center">
            <Icon icon={faCommentAlt} boxSize={5} mr={3} />
            <Text fontWeight="bold">Discussion Board</Text>
          </Flex>
        </Link>
      </Flex>
    </Box>
  );
};

const NullSetTabPanel = ({ children }) => (
  <Box
    p={4}
    bg="gray.100"
    color="gray.700"
    borderRadius="md"
    textAlign="center"
    fontStyle="italic"
  >
    {children}
  </Box>
);

export const MentorTabs = ({ courses, mentor }) => {
  const ProjectQueueCourse = ({ title, slug, visual: { full }, project }) => {
    const parts = project?.parts;
    const toast = useToast();
    const functions: firebase.functions.Functions = useFunctions();
    // @ts-ignore
    functions.region = 'europe-west1';

    const requestReview = functions.httpsCallable('assignReview');

    const [hasRequestedReview, setHasRequestedReview] = useState(false);

    // const db = useFirestore();
    // const courseMetricRef = db.collection('stats').doc(slug);
    // const courseMetric: CourseMetric = useFirestoreDocData(courseMetricRef);

    const activeReviewsData = useActiveReviewData();
    const assignDisabled = activeReviewsData.length > 0;
    return (
      <Box key={title} borderRadius="md" boxShadow="lg" overflow="hidden">
        <Flex
          p={6}
          direction="column"
          align="center"
          bg="gray.800"
          color="white"
        >
          <Heading as="p" size="md" mb={4}>
            {title}
          </Heading>
          <Image src={full} alt={title} />
          {/* {!!courseMetric && !!courseMetric.numSubmissionsPending && (
            <Text color="gray.400" mt={4}>
              {courseMetric.numSubmissionsPending} in queue
            </Text>
          )} */}
        </Flex>
        <Flex p={6} direction="column" align="center">
          <Box mt={-3} mb={8} width="full">
            {parts ? (
              parts.map((part, index) => (
                <Flex
                  align="center"
                  p={3}
                  borderBottom="1px solid"
                  borderBottomColor="gray.400"
                  key={index}
                >
                  <Circle
                    bg="gray.800"
                    color="white"
                    fontWeight="bold"
                    boxSize={8}
                    mr={3}
                  >
                    {index + 1}
                  </Circle>
                  <Text fontWeight="bold">{part.title}</Text>
                </Flex>
              ))
            ) : (
              <Flex
                align="center"
                p={3}
                borderBottom="1px solid"
                borderBottomColor="gray.400"
              >
                <Circle
                  bg="gray.800"
                  color="white"
                  fontWeight="bold"
                  boxSize={8}
                  mr={3}
                >
                  -
                </Circle>
                <Text fontWeight="bold">Upcoming project</Text>
              </Flex>
            )}
          </Box>
          <Flex justify="space-between" align="center" width="full">
            <Link
              // TODO: https://github.com/OpenMined/courses-app/issues/53
              // as={RRDLink}
              // to={`/courses/${slug}`}
              as="a"
              href={`/courses/${slug}`}
              target="_self"
              color="gray.700"
              _hover={{ color: 'gray.800' }}
            >
              Project Overview
            </Link>
            <Tooltip
              label="You must complete your pending review prior to being assigned a new submission."
              shouldWrapChildren
              hasArrow
              placement="top"
              isDisabled={!assignDisabled}
            >
              {parts && (
                <Button
                  colorScheme="black"
                  disabled={hasRequestedReview || assignDisabled}
                  isLoading={hasRequestedReview}
                  onClick={() => {
                    setHasRequestedReview(true);

                    requestReview({ course: slug }).then(({ data }) => {
                      if (data && !data.error) {
                        setHasRequestedReview(false);

                        toast({
                          ...toastConfig,
                          title: 'Review assigned',
                          description: `You have been assigned a review, you have ${SUBMISSION_REVIEW_HOURS} hours to complete this review`,
                          status: 'success',
                        });

                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        toast({
                          ...toastConfig,
                          title: 'Error assigning review',
                          description: data.error,
                          status: 'error',
                        });

                        setHasRequestedReview(false);
                      }
                    });
                  }}
                >
                  Assign
                </Button>
              )}
            </Tooltip>
          </Flex>
        </Flex>
      </Box>
    );
  };

  const ProjectQueue = () => {
    const mentorableCourses = getMentorableCourses(courses, mentor);

    return (
      <SimpleGrid columns={[1, null, 2, null, 3]} spacing={6} width="full">
        {mentorableCourses.map(ProjectQueueCourse)}
      </SimpleGrid>
    );
  };

  const MyActivity = () => {
    const {
      reviews,
      isLoading,
      nextPage,
      hasMoreReviews,
    } = useMentorLoadReviews();

    const reviewHistory = reviews.map((r) => {
      const courseIndex = courses.findIndex(({ slug }) => slug === r.course);

      if (courseIndex !== -1) return { ...r, course: courses[courseIndex] };
      return null;
    });

    const numReviewed = mentor.numCompleted || 0;
    const numResigned = mentor.numResigned || 0;

    if (reviewHistory.length === 0) {
      return (
        <NullSetTabPanel>
          You have no history of reviews at this time.
        </NullSetTabPanel>
      );
    }

    return (
      <Box>
        {numReviewed && numResigned && (
          <SimpleGrid
            columns={[1, null, 2]}
            spacing={0}
            width="full"
            bg="gray.800"
            color="white"
            borderRadius="md"
            mb={8}
            p={12}
          >
            <Flex
              direction="column"
              justify="center"
              align="center"
              textAlign="center"
              borderRight="1px solid"
              borderRightColor="gray.900"
            >
              <Heading as="p" size="3xl">
                {numReviewed}
              </Heading>
              <Text color="gray.200">Reviews Completed</Text>
            </Flex>
            <Flex
              direction="column"
              justify="center"
              align="center"
              textAlign="center"
            >
              <Heading as="p" size="3xl">
                {numResigned}
              </Heading>
              <Text color="magenta.200">Reviews Resigned</Text>
            </Flex>
          </SimpleGrid>
        )}
        <Heading as="p" size="md" color="gray.700" mb={3}>
          History
        </Heading>
        {reviewHistory.map((review, index) => (
          <Flex
            direction={['column', null, 'row']}
            justify="space-between"
            align="center"
            borderRadius="md"
            boxShadow="md"
            mb={3}
            p={4}
            key={index}
          >
            <Box>
              <Heading as="p" size="sm" mb={2}>
                {review.course.title}
              </Heading>
              <Text color="gray.700">
                {review.course.project
                  ? review.course.project.parts[
                      review.course.project.parts.findIndex(
                        (p) => p._key === review.part
                      )
                    ].title
                  : 'Upcoming project'}
              </Text>
            </Box>
            {review.completed_at && (
              <Text color="gray.700">
                {review.status === 'resigned' ? 'Resigned' : 'Reviewed'}{' '}
                {dayjs(review.completed_at.toDate()).fromNow()}
              </Text>
            )}
            {!review.completed_at && (
              <Text color="gray.700">
                Started {dayjs(review.started_at.toDate()).fromNow()}
              </Text>
            )}
            <Flex justify="center" align="center" width={200} mt={[3, null, 0]}>
              {review.status === 'resigned' && (
                <Text color="gray.700" fontStyle="italic">
                  Resigned
                </Text>
              )}
              {review.status === 'reviewed' && (
                <Button
                  variant="outline"
                  colorScheme="black"
                  // TODO: https://github.com/OpenMined/courses-app/issues/53
                  // as={RRDLink}
                  // to={`/courses/${review.course.slug}/project/${review.part}/${review.attempt}/?student=${review.student.id}`}
                  as="a"
                  href={`/courses/${review.course.slug}/project/${review.part}/${review.attempt}/?student=${review.student.id}`}
                  target="_self"
                >
                  See Review
                </Button>
              )}
              {review.status === 'pending' && (
                <Button
                  colorScheme="black"
                  // TODO: https://github.com/OpenMined/courses-app/issues/53
                  // as={RRDLink}
                  // to={`/courses/${review.course.slug}/project/${review.part}/${review.attempt}/?student=${review.student.id}`}
                  as="a"
                  href={`/courses/${review.course.slug}/project/${review.part}/${review.attempt}/?student=${review.student.id}`}
                  target="_self"
                >
                  Finish Review
                </Button>
              )}
            </Flex>
          </Flex>
        ))}
        {hasMoreReviews && (
          <Flex justify="center" mt={3}>
            <Button
              isLoading={isLoading}
              onClick={nextPage}
              colorScheme="black"
            >
              Load More Reviews
            </Button>
          </Flex>
        )}
      </Box>
    );
  };

  return (
    <ColoredTabs
      content={[
        {
          title: 'Project Queue',
          panel: ProjectQueue,
          px: [8, null, null, 16],
          py: [8, null, null, 12],
        },
        {
          title: 'My Activity',
          panel: MyActivity,
          px: [8, null, null, 16],
          py: [8, null, null, 12],
        },
      ]}
    />
  );
};

export const mentorResources = [
  {
    title: 'Discussion Board',
    icon: faCommentAlt,
    link: discussionLink,
  },
  {
    title: 'Rates',
    icon: faPiggyBank,
    link: mentorratesLink,
  },
  {
    title: 'FAQ',
    icon: faQuestionCircle,
    link: mentorfaqLink,
  },
  {
    title: 'Code of Conduct',
    icon: faUsers,
    link: codeofconductLink,
  },
];
