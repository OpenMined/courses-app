import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RRDLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { useFirestore, useFunctions } from 'reactfire';
import dayjs from 'dayjs';

import {
  getSubmissionReviewEndTime,
  SUBMISSION_REVIEW_HOURS,
} from '../_helpers';
import { handleReviewSubmission } from '../_firebase';
import { Content } from '../concept/content';
import RichTextEditor, {
  EDITOR_STORAGE_STRING,
  resetEditor,
} from '../../../components/RichTextEditor';
import ColoredTabs from '../../../components/ColoredTabs';
import Countdown from '../../../components/Countdown';
import useToast, { toastConfig } from '../../../components/Toast';
import SubmissionInline from '../../../components/SubmissionInline';
import { handleErrors, analytics } from '../../../helpers';

const genTabsContent = (part, attemptData, setHasStartedSubmission) => {
  const content = [
    {
      title: '1. Instructions',
      panel: () => (
        <>
          <Heading as="p" mb={2} size="lg">
            Instructions
          </Heading>
          <Divider />
          <Content content={part.instructions} />
        </>
      ),
      px: [8, null, null, 24],
      py: [8, null, null, 16],
    },
    {
      title: '2. Rubric',
      panel: () => (
        <>
          <Heading as="p" mb={2} size="lg">
            Rubric
          </Heading>
          <Divider />
          <Content content={part.rubric} />
        </>
      ),
      px: [8, null, null, 24],
      py: [8, null, null, 16],
    },
    {
      title: '3. Submission',
      panel: () => (
        <Box px={[8, null, null, 24]} py={[8, null, null, 16]}>
          <Heading as="p" mb={2} size="lg">
            Submission
          </Heading>
          <Divider />
          <RichTextEditor
            mt={8}
            content={JSON.parse(attemptData.submission_content)}
            readOnly
          />
        </Box>
      ),
      p: 0,
      minHeight: 400,
    },
    {
      title: '4. Feedback',
      panel: () => (
        <>
          {!attemptData.review_content && (
            <RichTextEditor
              onChange={(value, { empty }) => setHasStartedSubmission(!empty)}
            />
          )}
          {attemptData.review_content && (
            <Box px={[8, null, null, 24]} py={[8, null, null, 16]}>
              <Heading as="p" mb={2} size="lg">
                Submission
              </Heading>
              <Divider />
              <RichTextEditor
                mt={8}
                content={JSON.parse(attemptData.review_content)}
                readOnly
              />
            </Box>
          )}
        </>
      ),
      p: 0,
      minHeight: 400,
    },
  ];

  return content;
};

export default ({
  progress,
  attemptData,
  content,
  course,
  part,
  attempt,
  student,
}) => {
  // TODO: https://github.com/OpenMined/courses-app/issues/53
  // const navigate = useNavigate();
  const toast = useToast();
  const db = useFirestore();
  const functions: firebase.functions.Functions = useFunctions();
  // @ts-ignore
  functions.region = 'europe-west1';

  const requestResignation = functions.httpsCallable('resignReview');

  const hasAlreadyReviewed = !!attemptData.review_content;

  const [hasStartedSubmission, setHasStartedSubmission] = useState(false);
  const [hasClickedButton, setHasClickedButton] = useState(false);
  const [passFail, setPassFail] = useState(null);
  const preSubmitModal = useDisclosure();

  const tabsContent = useMemo(
    () => genTabsContent(content, attemptData, setHasStartedSubmission),
    [content, attemptData]
  );

  const isBeforeDeadline = useCallback(() => {
    const now = dayjs();

    // if review_started_at is null, always return false
    if (!attemptData.review_started_at) return false;

    const reviewStarted = dayjs(attemptData.review_started_at.toDate());

    return now.diff(reviewStarted, 'hour', true) <= SUBMISSION_REVIEW_HOURS;
  }, [attemptData]);

  // Apparently, you cannot use SererTimestamp (ts()) inside of arrayUnion, so this is needed
  // https://stackoverflow.com/questions/52324505/function-fieldvalue-arrayunion-called-with-invalid-data-fieldvalue-servertime
  const currentTime = useFirestore.Timestamp.now;

  useEffect(() => {
    if (!isBeforeDeadline()) {
      // TODO: https://github.com/OpenMined/courses-app/issues/53
      // navigate('/users/dashboard');
      window.location.href = '/users/dashboard';
    }
  }, [isBeforeDeadline]);

  // When the user attempts a submission
  const onReviewSubmission = async (content, status: 'passed' | 'failed') => {
    if (isBeforeDeadline()) {
      setHasClickedButton(true);

      // And clear the editor's cache
      resetEditor();

      handleReviewSubmission(
        db,
        currentTime,
        attemptData.student.id,
        attemptData.mentor.id,
        course,
        part,
        attempt,
        attemptData.id,
        status,
        progress,
        content
      )
        .then(() => {
          // And close the modal
          preSubmitModal.onClose();

          setHasClickedButton(false);

          // Once that's done, go back to the dashboard
          // TODO: https://github.com/OpenMined/courses-app/issues/53
          // navigate(`/users/dashboard`);
          window.location.href = '/users/dashboard';
        })
        .catch((error) => handleErrors(toast, error));
    } else {
      onRequestResignation(attemptData.id, attemptData.mentor.id);
    }
  };

  const onRequestResignation = async (submission, mentor) => {
    setHasClickedButton(true);

    analytics.logEvent('Project Submission Resigned', {
      course,
      part,
      attempt,
    });

    requestResignation({
      submission,
      mentor,
    }).then(({ data }) => {
      setHasClickedButton(false);

      if (data && !data.error) {
        toast({
          ...toastConfig,
          title: 'Resigned from review',
          description: 'You have resigned from this review',
          status: 'success',
        });

        // TODO: https://github.com/OpenMined/courses-app/issues/53
        // navigate('/users/dashboard');
        window.location.href = '/users/dashboard';
      } else {
        toast({
          ...toastConfig,
          title: 'Error resigning from review',
          description: data.error,
          status: 'error',
        });
      }
    });
  };

  return (
    <Box>
      {!hasAlreadyReviewed && (
        <Flex justify="space-between" align="center" mb={6}>
          <Text fontFamily="mono" color="gray.700" mr={6}>
            Time Remaining:{' '}
            {attemptData.review_started_at && (
              <Countdown
                time={getSubmissionReviewEndTime(
                  dayjs(attemptData.review_started_at.toDate())
                )}
              />
            )}
          </Text>
          <Button
            colorScheme="gray"
            isDisabled={hasClickedButton}
            isLoading={hasClickedButton}
            onClick={() => {
              onRequestResignation(attemptData.id, attemptData.mentor.id);
            }}
          >
            Resign
          </Button>
        </Flex>
      )}
      {content.submissions.length > 0 && (
        <Box mb={6}>
          {content.submissions.map((submission, index) => (
            <SubmissionInline
              key={index}
              link={`/courses/${course}/project/${part}/${
                index + 1
              }/?student=${student}`}
              {...submission}
            />
          ))}
        </Box>
      )}
      <ColoredTabs mb={8} content={tabsContent} />
      {!hasAlreadyReviewed && (
        <Flex
          mb={8}
          p={[8, null, null, 12]}
          bg="gray.800"
          color="white"
          borderRadius="md"
          textAlign="center"
          direction="column"
          align="center"
        >
          <Heading as="p" size="lg" mb={8}>
            Did the student pass?
          </Heading>
          <Flex
            direction="row"
            justify="space-between"
            align="center"
            width="full"
            maxW={400}
          >
            <Flex
              direction="column"
              align="center"
              opacity={passFail !== 'failed' ? 0.5 : 1}
              cursor="pointer"
              width={1 / 2}
              onClick={() => setPassFail('failed')}
            >
              <Image
                src="https://emojis.slackmojis.com/emojis/images/1572027748/6848/blob_eyes.png?1572027748"
                alt="Yes"
                boxSize={12}
                mb={3}
              />
              <Text color="gray.700">No, they failed</Text>
            </Flex>
            <Flex
              direction="column"
              align="center"
              opacity={passFail !== 'passed' ? 0.5 : 1}
              cursor="pointer"
              width={1 / 2}
              onClick={() => setPassFail('passed')}
            >
              <Image
                src="https://emojis.slackmojis.com/emojis/images/1572027739/6832/blob_cheer.png?1572027739"
                alt="Yes"
                boxSize={12}
                mb={3}
              />
              <Text color="gray.700">Yes, they passed</Text>
            </Flex>
          </Flex>
        </Flex>
      )}
      <Flex justify="space-between" align="center">
        <Button
          // TODO: https://github.com/OpenMined/courses-app/issues/53
          // as={RRDLink}
          // to={`/users/dashboard`}
          as="a"
          href={`/users/dashboard`}
          target="_self"
          variant="outline"
          colorScheme="black"
        >
          Back to Dashboard
        </Button>
        <Modal
          isOpen={preSubmitModal.isOpen}
          onClose={preSubmitModal.onClose}
          size="xl"
        >
          <ModalOverlay />
          <ModalContent
            bg="gray.800"
            color="white"
            textAlign="center"
            px={8}
            py={6}
          >
            <ModalCloseButton />
            <ModalBody>
              <Flex direction="column" align="center">
                <Image
                  src="https://emojis.slackmojis.com/emojis/images/1572027841/6924/blob_stop.png?1572027841"
                  boxSize={12}
                  mb={6}
                />
                <Heading as="p" size="xl" mb={6}>
                  Before you submit, make sure you double check!
                </Heading>
                <Text color="gray.400" mb={6}>
                  Before you submit make sure your feedback make sure that it is
                  thorough, constructive, and represents project rubric fairly.
                  If you're ready, go ahead and click "Continue".
                </Text>
              </Flex>
            </ModalBody>
            <ModalFooter>
              <Button
                colorScheme="blue"
                mr={3}
                isDisabled={hasClickedButton}
                isLoading={hasClickedButton}
                onClick={() => {
                  // Submit the attempt with the _key of the part and the content of the editor
                  onReviewSubmission(
                    localStorage.getItem(EDITOR_STORAGE_STRING),
                    passFail
                  );
                }}
              >
                Continue
              </Button>
              <Button
                variant="ghost"
                colorScheme="white"
                isDisabled={hasClickedButton}
                isLoading={hasClickedButton}
                onClick={preSubmitModal.onClose}
              >
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        <Button
          isDisabled={
            !hasStartedSubmission || passFail === null || hasClickedButton
          }
          isLoading={hasClickedButton}
          onClick={preSubmitModal.onOpen}
          colorScheme="black"
        >
          Submit
        </Button>
      </Flex>
    </Box>
  );
};
