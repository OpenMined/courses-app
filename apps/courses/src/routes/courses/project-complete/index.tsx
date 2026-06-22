import React, { useState } from 'react';
import { useFirestore, useFunctions } from 'reactfire';
import {
  Box,
  Button,
  CloseButton,
  Flex,
  Heading,
  Image,
  Link,
  Text,
  Textarea,
} from '@chakra-ui/react';
import {
  faBullhorn,
  faCheckCircle,
  faCommentAlt,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';
import { CoursePagesProp } from '@openmined/shared/types';

import { getProjectPartStatus } from '../_helpers';
import { handleProvideFeedback } from '../_firebase';
import useToast, { toastConfig } from '../../../components/Toast';
import Icon from '../../../components/Icon';
import GridContainer from '../../../components/GridContainer';
import { handleErrors, analytics } from '../../../helpers';
import { useNavigate } from 'react-router-dom';
import { discussionLink } from '../../../content/links';

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

export default ({ progress, page, user, course }: CoursePagesProp) => {
  const db = useFirestore();
  // TODO: https://github.com/OpenMined/courses-app/issues/53
  // const navigate = useNavigate();

  const {
    project: { title, parts },
    title: courseTitle,
  } = page;

  // Be able to push a toast message
  const toast = useToast();

  const functions: firebase.functions.Functions = useFunctions();
  // @ts-ignore
  functions.region = 'europe-west1';

  const [clickedContinue, setClickedContinue] = useState(false);
  const handleCourseComplete = functions.httpsCallable('completeCourse');

  // Allow this component to capture the user's feedback
  const [isFeedbackActive, setFeedbackActive] = useState(false);
  const [vote, setVote] = useState(null);
  const [feedback, setFeedback] = useState('');

  let status = null;

  parts.forEach(({ _key }) => {
    if (getProjectPartStatus(progress, _key) !== 'passed') {
      status = 'failed';
    }
  });

  if (!status) status = 'passed';

  // Create a function that is triggered when the project is completed
  const onCompleteCourse = () => {
    setClickedContinue(true);

    analytics.logEvent('Course Completed', { course, status });

    return handleCourseComplete({
      course,
    })
      .then(({ data }) => {
        setClickedContinue(false);

        if (data && !data.error) {
          // TODO: https://github.com/OpenMined/courses-app/issues/53
          // navigate(`/courses/${course}/complete`);
          window.location.href = `/courses/${course}/complete`;
        } else {
          handleErrors(toast, data.error);
        }
      })
      .catch((error) => handleErrors(toast, error));
  };

  // We need a function to be able to provide feedback for this project
  const onProvideFeedback = (value, feedback = null) =>
    handleProvideFeedback(
      db,
      user.uid,
      course,
      course,
      value,
      feedback,
      'project'
    ).catch((error) => handleErrors(toast, error));

  const votes = [
    { text: '👎', val: -1 },
    { text: '👌', val: 0 },
    { text: '👍', val: 1 },
  ];

  return (
    <Box bg="gray.900" color="white">
      <GridContainer py={[8, null, null, 16]}>
        {!isFeedbackActive && (
          <Flex direction="column" align="center" maxW={600} mx="auto">
            <Image
              src="https://emojis.slackmojis.com/emojis/images/1572027878/6937/blob_thumbs_up.png?1572027878"
              mb={4}
              boxSize={12}
            />
            <Heading as="p" size="xl" textAlign="center" mb={4}>
              Congratulations!
            </Heading>
            <Heading
              as="p"
              size="md"
              textAlign="center"
              color="gray.400"
              mb={12}
            >
              You just finished the project{' '}
              <Text as="span" color="white">
                "{title}"
              </Text>{' '}
              for the{' '}
              <Text as="span" color="white">
                "{courseTitle}"
              </Text>{' '}
              course.
            </Heading>
            <Flex
              bg="gray.800"
              borderRadius="md"
              align="center"
              width="full"
              p={6}
              mb={8}
            >
              <Icon
                icon={status === 'passed' ? faCheckCircle : faTimesCircle}
                color={status === 'passed' ? 'green.400' : 'magenta.400'}
                boxSize={5}
                mr={6}
              />
              <Text fontSize="lg">{title}</Text>
            </Flex>
            <Button
              size="lg"
              mb={12}
              colorScheme="cyan"
              onClick={onCompleteCourse}
              isDisabled={clickedContinue}
              isLoading={clickedContinue}
            >
              Continue
            </Button>
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
              Tell us about your experience on this project. Was it helpful?
              Full of bugs? Is the material no longer accurate?
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
