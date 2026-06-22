import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Link,
  Progress,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@chakra-ui/react';
import {
  faBug,
  faBullhorn,
  faCommentAlt,
} from '@fortawesome/free-solid-svg-icons';
import useScrollPosition from '@react-hook/window-scroll';

import useToast, { toastConfig } from '../../../components/Toast';
import { Popover } from '../../../components/Popover';
import Icon from '../../../components/Icon';
import { COURSE_FOOTER_ID, getLinkPropsFromLink } from '../../../helpers';
import { useNavigate } from 'react-router-dom';
import { discussionLink, issuesLink } from '../../../content/links';

const BREAK = 'md';

const Feedback = ({
  feedbackOpen,
  setFeedbackOpen,
  vote,
  setVote,
  feedback,
  setFeedback,
  onProvideFeedback,
  setHelpOpen,
}) => {
  const toast = useToast();

  const votes = [
    { text: '👎', val: -1 },
    { text: '👌', val: 0 },
    { text: '👍', val: 1 },
  ];

  return (
    <Popover
      isOpen={feedbackOpen}
      onOpen={setFeedbackOpen}
      trigger={() => (
        <Link color="gray.400" _hover={{ color: 'gray.200' }} variant="flat">
          <Flex align="center">
            <Icon icon={faBullhorn} />
            <Text display={{ base: 'none', [BREAK]: 'block' }} ml={4}>
              Give Feedback
            </Text>
          </Flex>
        </Link>
      )}
      position="top"
      alignment="start"
    >
      <Flex justify="space-around" align="center" mb={3}>
        {votes.map(({ text, val }) => (
          <Text
            fontSize="3xl"
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
        mb={2}
      />
      <Flex justify="flex-end">
        <Button
          colorScheme="blue"
          onClick={() => {
            onProvideFeedback(vote, feedback).then(() => {
              setFeedbackOpen(false);

              if (vote === 1) {
                toast({
                  ...toastConfig,
                  title: 'Feedback sent',
                  description: "We appreciate you telling us how we're doing!",
                  status: 'success',
                });
              } else {
                toast({
                  ...toastConfig,
                  title: 'Feedback sent',
                  description:
                    "Thanks for the note - if you've found something wrong, would you like to file a bug report?",
                  status: 'success',
                });

                setTimeout(() => {
                  setHelpOpen(true);
                }, 1000);
              }
            });
          }}
          disabled={vote === null}
        >
          Submit
        </Button>
      </Flex>
    </Popover>
  );
};

const Help = ({ helpOpen, setHelpOpen }) => {
  const helpLinks = [
    {
      title: 'Report a Bug',
      link: issuesLink,
      icon: faBug,
    },
    {
      title: 'Discussion Board',
      link: discussionLink,
      icon: faCommentAlt,
    },
  ];

  return (
    <Popover
      isOpen={helpOpen}
      onOpen={setHelpOpen}
      trigger={() => (
        <Link color="gray.400" _hover={{ color: 'gray.200' }} variant="flat">
          <Flex align="center">
            <Icon icon={faCommentAlt} />
            <Text display={{ base: 'none', [BREAK]: 'block' }} ml={4}>
              Get Help
            </Text>
          </Flex>
        </Link>
      )}
      position="top"
      alignment="end"
      clickShouldCloseContent
    >
      <Stack spacing={3}>
        {helpLinks.map(({ title, link, icon }, index) => {
          return (
            <Flex align="center" key={index} {...getLinkPropsFromLink(link)}>
              {icon && <Icon icon={icon} boxSize={5} color="gray.400" mr={4} />}
              <Text color="gray.700">{title}</Text>
            </Flex>
          );
        })}
      </Stack>
    </Popover>
  );
};

const Controls = ({
  isBackAvailable,
  backLink,
  isNextAvailable,
  nextLink,
  current,
  total,
  onCompleteConcept,
}) => {
  // TODO: https://github.com/OpenMined/courses-app/issues/53
  // const navigate = useNavigate();

  return (
    <Flex align="center">
      <Button
        onClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });

          setTimeout(() => {
            // TODO: https://github.com/OpenMined/courses-app/issues/53
            // navigate(backLink);
            window.location.href = backLink;
          }, 500);
        }}
        colorScheme={isBackAvailable ? 'cyan' : 'black'}
        disabled={!isBackAvailable}
      >
        Back
      </Button>
      <Text mx={[6, null, 8, 12]} color="gray.400">
        {current} of {total}
      </Text>
      <Button
        onClick={() => {
          onCompleteConcept().then(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(() => {
              // TODO: https://github.com/OpenMined/courses-app/issues/53
              // navigate(nextLink);
              window.location.href = nextLink;
            }, 500);
          });
        }}
        colorScheme="cyan"
      >
        Next
      </Button>
    </Flex>
  );
};

export default ({
  current,
  total,
  isBackAvailable,
  backLink,
  isNextAvailable,
  nextLink,
  onCompleteConcept,
  scrollProgress,
  onProvideFeedback,
  hasScrolledToBottom,
  setScrollProgress,
  setHasScrolledToBottom,
  parentRef,
}) => {
  const [vote, setVote] = useState(null);
  const [feedback, setFeedback] = useState('');

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const scrollY = useScrollPosition();

  // This is the logic to track their scroll progress and so on
  useEffect(() => {
    if (
      parentRef.current &&
      parentRef.current.scrollHeight !== 0 &&
      parentRef.current.clientHeight !== 0
    ) {
      const conceptHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      const progress =
        conceptHeight <= 0 ? 100 : (scrollY / conceptHeight) * 100 || 0;

      setScrollProgress(progress > 100 ? 100 : progress);

      if (scrollProgress === 100 && !hasScrolledToBottom) {
        setHasScrolledToBottom(true);
      }
    }
  }, [
    parentRef,
    scrollY,
    scrollProgress,
    setScrollProgress,
    hasScrolledToBottom,
    setHasScrolledToBottom,
  ]);

  return (
    <Box
      position="fixed"
      width="100%"
      bottom={0}
      left={0}
      py={{ base: 6, [BREAK]: 4 }}
      bg="gray.900"
      boxShadow="md"
      zIndex={2}
      id={COURSE_FOOTER_ID}
    >
      <Box position="absolute" top={-2} left={0} width="full">
        <Progress value={scrollProgress || 0} size="sm" colorScheme="cyan" />
      </Box>
      <Box px={8}>
        <Flex justify="space-between" align="center">
          <Flex width={{ base: 6, [BREAK]: 1 / 4 }}>
            <Feedback
              feedbackOpen={feedbackOpen}
              setFeedbackOpen={setFeedbackOpen}
              vote={vote}
              setVote={setVote}
              feedback={feedback}
              setFeedback={setFeedback}
              onProvideFeedback={onProvideFeedback}
              setHelpOpen={setHelpOpen}
            />
          </Flex>
          <Flex
            width={{ base: 'full', [BREAK]: 1 / 2 }}
            justify="center"
            mx={4}
          >
            <Controls
              isBackAvailable={isBackAvailable}
              backLink={backLink}
              isNextAvailable={isNextAvailable}
              nextLink={nextLink}
              current={current}
              total={total}
              onCompleteConcept={onCompleteConcept}
            />
          </Flex>
          <Flex width={{ base: 6, [BREAK]: 1 / 4 }} justify="flex-end">
            <Help helpOpen={helpOpen} setHelpOpen={setHelpOpen} />
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
};
