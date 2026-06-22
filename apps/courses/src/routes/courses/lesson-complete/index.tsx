import React, { useState } from 'react';
import { useFirestore } from 'reactfire';
import {
  Box,
  Button,
  CloseButton,
  Divider,
  Flex,
  Heading,
  Link,
  Text,
  Textarea,
  Image,
  Badge,
} from '@chakra-ui/react';
import {
  faArrowRight,
  faBookOpen,
  faBullhorn,
  faCheckCircle,
  faCommentAlt,
  faShapes,
} from '@fortawesome/free-solid-svg-icons';
import { CoursePagesProp } from '@openmined/shared/types';

import { getLessonIndex } from '../_helpers';
import { handleLessonComplete, handleProvideFeedback } from '../_firebase';
import useToast, { toastConfig } from '../../../components/Toast';
import GridContainer from '../../../components/GridContainer';
import Icon from '../../../components/Icon';
import { handleErrors } from '../../../helpers';
import { useNavigate } from 'react-router-dom';
import { discussionLink } from '../../../content/links';
import dayjs from 'dayjs';

const DetailLink = ({ icon, children, ...props }) => (
  <Box
    width={{ base: 'full', md: '35%' }}
    color="gray.400"
    textAlign="center"
    {...props}
  >
    <Icon icon={icon} boxSize={8} mb={4} />
    <Text>{children}</Text>
  </Box>
);

const LessonLine = ({ status, title, type, simulcastReleaseDate = '' }) => {
  let color, icon, iconColor;

  if (status === 'current') {
    color = 'white';
    icon = faCheckCircle;
    iconColor = 'green.400';
  } else if (status === 'next') {
    color = 'white';
    icon = faArrowRight;
    iconColor = 'cyan.500';
  } else if (status === 'later') {
    color = 'gray.700';
    iconColor = 'gray.700';

    if (type === 'lesson') {
      icon = faBookOpen;
    } else if (type === 'project') {
      icon = faShapes;
    }
  } else if (status === 'simulcast') {
    color = 'white';
    icon = faArrowRight;
    iconColor = 'cyan.500';
  }

  return (
    <Flex
      bg="gray.800"
      borderTop={status === 'current' ? 'none' : '1px solid'}
      borderTopColor="gray.700"
      justify="space-between"
      align="center"
      width="full"
      p={6}
    >
      <Flex align="center">
        <Icon icon={icon} color={iconColor} boxSize={5} mr={6} />
        <Text fontSize="lg" color={color}>
          {title}
        </Text>
      </Flex>
      {status === 'next' && (
        <Text color="gray.400" fontStyle="italic" ml={6}>
          Up Next
        </Text>
      )}
      {status === 'simulcast' && (
        <Badge color="white" bgColor="blue.700">
          Coming {dayjs(simulcastReleaseDate).fromNow() ?? 'soon'}
        </Badge>
      )}
    </Flex>
  );
};

export default ({
  progress,
  page,
  user,
  ts,
  course,
  lesson,
}: CoursePagesProp) => {
  const db = useFirestore();
  const navigate = useNavigate();

  const {
    course: { lessons, projectTitle, simulcast, simulcast_release_date },
    title,
  } = page;

  // Be able to push a toast message
  const toast = useToast();

  // Allow this component to capture the user's feedback
  const [isFeedbackActive, setFeedbackActive] = useState(false);
  const [vote, setVote] = useState(null);
  const [feedback, setFeedback] = useState('');

  // Get the current lesson index, the lesson number, and (if applicable) the next lesson or final project
  const lessonIndex = getLessonIndex(lessons, lesson);
  const lessonNum = lessonIndex + 1;
  let nextLesson;

  if (lessons.length > lessonNum) {
    nextLesson = lessons[lessonNum];
  } else if (projectTitle) {
    nextLesson = 'project';
  } else {
    nextLesson = null;
  }

  // Create a function that is triggered when the lesson is completed
  // This is triggered by clicking the "Next" button in the <ConceptFooter />
  const onCompleteLesson = () =>
    handleLessonComplete(
      db,
      user.uid,
      course,
      ts,
      progress,
      lesson
    ).catch((error) => handleErrors(toast, error));

  // We need a function to be able to provide feedback for this lesson
  const onProvideFeedback = (value, feedback = null) =>
    handleProvideFeedback(
      db,
      user.uid,
      course,
      lesson,
      value,
      feedback,
      'lesson'
    ).catch((error) => handleErrors(toast, error));

  const votes = [
    { text: '👎', val: -1 },
    { text: '👌', val: 0 },
    { text: '👍', val: 1 },
  ];

  const simulcastEnd =
    simulcast && lessons[lessonIndex + 1]?.concepts === undefined;

  return (
    <Box bg="gray.900" color="white">
      <GridContainer py={[8, null, null, 16]}>
        {!isFeedbackActive && (
          <Flex direction="column" align="center" maxW={600} mx="auto">
            {simulcastEnd ? (
              <Image
                src="https://emojis.slackmojis.com/emojis/images/1572027878/6937/blob_thumbs_up.png?1572027878"
                alt="Yes"
                boxSize={12}
                mb={3}
              />
            ) : (
              <Icon icon={faCheckCircle} color="cyan.300" boxSize={12} mb={4} />
            )}
            <Heading as="p" size="xl" textAlign="center" mb={4}>
              {simulcastEnd ? 'Keep up the good work!' : 'Congratulations!'}
            </Heading>
            <Heading
              as="p"
              size="md"
              textAlign="center"
              color="gray.400"
              mb={12}
            >
              You just finished the{' '}
              <Text as="span" color="white">
                "{title}"
              </Text>{' '}
              lesson.
            </Heading>
            <Flex align="center" width="full" mb={8}>
              <Divider />
              <Text
                color="gray.400"
                fontStyle="italic"
                textAlign="center"
                mx={4}
                flexShrink={0}
              >
                {simulcastEnd ? 'Continue learning' : 'Up Next'}
              </Text>
              <Divider />
            </Flex>
            <Box borderRadius="md" overflow="hidden" width="full" mb={8}>
              <LessonLine status="current" type="lesson" title={title} />
              {lessons.length > lessonIndex + 1 && (
                <LessonLine
                  status={
                    lessons[lessonIndex + 1].concepts?.length
                      ? 'next'
                      : 'simulcast'
                  }
                  type="lesson"
                  title={lessons[lessonIndex + 1].title}
                  simulcastReleaseDate={simulcast_release_date}
                />
              )}
              {lessons.length === lessonIndex + 1 && (
                <LessonLine
                  status={projectTitle ? 'next' : 'simulcast'}
                  type="project"
                  title={projectTitle ?? 'New content'}
                  simulcastReleaseDate={simulcast_release_date}
                />
              )}
              {lessons.length > lessonIndex + 2 && (
                <LessonLine
                  status="later"
                  type="lesson"
                  title={lessons[lessonIndex + 2].title}
                />
              )}
              {lessons.length === lessonIndex + 2 && projectTitle && (
                <LessonLine
                  status="later"
                  type="project"
                  title={projectTitle}
                />
              )}
            </Box>
            {simulcastEnd ? (
              <>
                <Text
                  mb={12}
                  align="center"
                  color="gray.400"
                  display={['block', 'none']}
                >
                  You will be notified via email when the next lesson is
                  released. Until then check out some of our other learning
                  resources below
                </Text>
                <Text
                  mb={12}
                  align="center"
                  color="gray.400"
                  display={['none', 'block']}
                >
                  You will be notified via email when the next lesson is
                  released.
                  <br />
                  Until then check out some of our other learning resources
                  below
                </Text>
              </>
            ) : (
              <Button
                mb={12}
                colorScheme="cyan"
                size="lg"
                onClick={() =>
                  onCompleteLesson().then(() => {
                    // TODO: https://github.com/OpenMined/courses-app/issues/53
                    // navigate(
                    //   `/courses/${course}/${
                    //     typeof nextLesson === 'string'
                    //       ? nextLesson
                    //       : nextLesson._id
                    //   }`
                    // );
                    window.location.href = `/courses/${course}/${
                      typeof nextLesson === 'string'
                        ? nextLesson
                        : nextLesson._id
                    }`;
                  })
                }
              >
                Continue
              </Button>
            )}
            <Flex
              direction={{ base: 'column', md: 'row' }}
              justify="space-between"
            >
              <DetailLink icon={faCommentAlt}>
                Talk about this topic further in our{' '}
                <Link
                  href={discussionLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="gray.400"
                  _hover={{ color: 'gray.600' }}
                >
                  discussion board
                </Link>
                .
              </DetailLink>
              <DetailLink icon={faBullhorn} mt={[8, null, 0]}>
                Tell us how we're doing! Make sure to{' '}
                <Link
                  onClick={() => setFeedbackActive(true)}
                  color="gray.400"
                  _hover={{ color: 'gray.600' }}
                >
                  give feedback
                </Link>
                .
              </DetailLink>
            </Flex>
          </Flex>
        )}
        {isFeedbackActive && (
          <Box
            position="relative"
            bg="gray.800"
            borderRadius="md"
            p={8}
            textAlign="center"
            maxW={600}
            mx="auto"
          >
            <Flex justify={['center', null, 'flex-end']} mb={4} mt={-2}>
              <CloseButton onClick={() => setFeedbackActive(false)} />
            </Flex>
            <Heading as="p" size="lg" mb={4}>
              Send us your feedback!
            </Heading>
            <Text color="gray.400" mb={8}>
              Tell us about your experience on this lesson. Was it helpful? Full
              of bugs? Is the material no longer accurate?
            </Text>
            <Box maxW={480} mx="auto">
              <Flex justify="space-around" align="center" mb={4}>
                {votes.map(({ text, val }) => (
                  <Text
                    fontSize="5xl"
                    key={val}
                    cursor="pointer"
                    onClick={() => setVote(val)}
                    opacity={vote !== null && vote !== val ? 0.5 : 1}
                  >
                    {text}
                  </Text>
                ))}
              </Flex>
              <Textarea
                placeholder="Type whatever you'd like..."
                onChange={({ target }) => setFeedback(target.value)}
                resize="vertical"
                variant="filled"
                bg="white"
                _hover={{ bg: 'white' }}
                _focus={{ bg: 'white' }}
                color="gray.800"
                py={3}
                mb={4}
              />
              <Button
                onClick={() => {
                  onProvideFeedback(vote, feedback).then(() => {
                    setFeedbackActive(false);
                    toast({
                      ...toastConfig,
                      title: 'Feedback sent',
                      description:
                        "We appreciate you telling us how we're doing!",
                      status: 'success',
                    });
                  });
                }}
                disabled={vote === null}
                colorScheme="cyan"
                size="lg"
              >
                Submit
              </Button>
            </Box>
          </Box>
        )}
      </GridContainer>
    </Box>
  );
};
