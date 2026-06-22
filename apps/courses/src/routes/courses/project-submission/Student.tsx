import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Circle,
  Divider,
  Flex,
  Grid,
  GridItem,
  Heading,
  Image,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  SimpleGrid,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { Link as RRDLink, useNavigate } from 'react-router-dom';
import { useFirestore } from 'reactfire';
import { faCommentAlt } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { PROJECT_PART_SUBMISSIONS, getProjectPartNumber } from '../_helpers';
import { handleAttemptSubmission } from '../_firebase';
import { Content } from '../concept/content';
import { handleErrors } from '../../../helpers';
import SubmissionInline from '../../../components/SubmissionInline';
import Icon from '../../../components/Icon';
import RichTextEditor, {
  EDITOR_STORAGE_STRING,
  resetEditor,
} from '../../../components/RichTextEditor';
import ColoredTabs from '../../../components/ColoredTabs';
import useToast from '../../../components/Toast';
import { discussionLink } from '../../../content/links';

dayjs.extend(relativeTime);

const genTabsContent = (
  part,
  attemptData,
  hasPendingSubmission,
  setHasStartedSubmission
) => {
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
        <>
          {!attemptData && !hasPendingSubmission && (
            <RichTextEditor
              onChange={(value, { empty }) => setHasStartedSubmission(!empty)}
            />
          )}
          {attemptData && (
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
          )}
        </>
      ),
      p: 0,
      minHeight: 400,
    },
  ];

  if (attemptData && attemptData.review_content) {
    content.push({
      title: '4. Feedback',
      panel: () => (
        <>
          <Heading as="p" mb={2} size="lg">
            Feedback
          </Heading>
          <Divider />
          <RichTextEditor
            mt={8}
            content={JSON.parse(attemptData.review_content)}
            readOnly
          />
        </>
      ),
      px: [8, null, null, 24],
      py: [8, null, null, 16],
    });
  }

  return content;
};

const ReviewStatus = ({ status }) => {
  const passed = status === 'passed';
  const image = passed
    ? 'https://emojis.slackmojis.com/emojis/images/1572027739/6832/blob_cheer.png?1572027739'
    : 'https://emojis.slackmojis.com/emojis/images/1578406259/7444/sadblob.gif?1578406259';
  const message = passed
    ? 'Congratulations! You have passed this part of the project. Read below for more in-depth feedback from our mentors.'
    : 'Sorry you did not pass this part of the project. Read below for more in-depth feedback from our mentors.';

  return (
    <Flex width="full" p={6} bg="gray.800" borderRadius="md" align="center">
      <Image src={image} boxSize={12} mr={4} />
      <Box>
        <Text
          color={passed ? 'green.200' : 'magenta.200'}
          fontWeight="bold"
          fontSize="xl"
          mb={2}
        >
          {passed ? 'Success' : 'Fail'}
        </Text>
        <Text color="gray.400">{message}</Text>
      </Box>
    </Flex>
  );
};

const SubmissionBoxes = ({ submissions, ...props }) => (
  <SimpleGrid columns={3} spacing={2} width="full" {...props}>
    {submissions.map(({ status }, index) => {
      const props: { bg?: string } = {};

      if (status === 'passed') props.bg = 'green.500';
      else if (status === 'failed') props.bg = 'magenta.500';
      else if (status === 'pending') props.bg = 'gray.500';
      else if (status === 'none') props.bg = 'gray.400';

      return (
        <Box key={index} borderRadius="md" width="full" height={1} {...props} />
      );
    })}
  </SimpleGrid>
);

export default ({
  page,
  progress,
  course,
  part,
  user,
  content,
  attemptData,
}) => {
  const db = useFirestore();
  const toast = useToast();
  const [hasClickedButton, setHasClickedButton] = useState(false);
  // TODO: https://github.com/OpenMined/courses-app/issues/53
  // const navigate = useNavigate();

  const {
    project: { title: projectTitle, parts },
  } = page;

  const { _key, title, submissions } = content;
  const number = getProjectPartNumber(parts, part);

  const hasPendingSubmission =
    submissions.findIndex(({ status }) => status === 'pending') !== -1;

  const [hasStartedSubmission, setHasStartedSubmission] = useState(false);
  const preSubmitModal = useDisclosure();

  const tabsContent = useMemo(
    () =>
      genTabsContent(
        content,
        attemptData,
        hasPendingSubmission,
        setHasStartedSubmission
      ),
    [content, attemptData, hasPendingSubmission]
  );

  useEffect(() => {
    if (
      submissions.filter(
        ({ status }) => status === 'passed' || status === 'failed'
      ).length === 3 &&
      !attemptData
    ) {
      // TODO: https://github.com/OpenMined/courses-app/issues/53
      // navigate(`/courses/${course}/project/${part}/3`);
      window.location.href = `/courses/${course}/project/${part}/3`;
    }
  }, [submissions, attemptData, course, part]);

  // Save the arrayUnion function so that we can push items into a Firestore array
  const arrayUnion = useFirestore.FieldValue.arrayUnion;

  // Apparently, you cannot use SererTimestamp (ts()) inside of arrayUnion, so this is needed
  // https://stackoverflow.com/questions/52324505/function-fieldvalue-arrayunion-called-with-invalid-data-fieldvalue-servertime
  const currentTime = useFirestore.Timestamp.now;

  // When the user attempts a submission
  const onAttemptSubmission = async (part, content) => {
    setHasClickedButton(true);
    // And clear the editor's cache
    resetEditor();

    handleAttemptSubmission(
      db,
      user.uid,
      course,
      arrayUnion,
      currentTime,
      progress,
      part,
      content
    )
      .then(() => {
        // And close the modal
        preSubmitModal.onClose();

        // Once that's done, reload the projects in the default viewing state
        // TODO: https://github.com/OpenMined/courses-app/issues/53
        // navigate(`/courses/${course}/project`);
        window.location.href = `/courses/${course}/project`;
      })
      .catch((error) => handleErrors(toast, error))
      .finally(() => setHasClickedButton(false));
  };

  return (
    <Box>
      <Flex
        direction={['column', null, 'row']}
        justify="space-between"
        align="center"
      >
        <Breadcrumb spacing={2} color="gray.700">
          <BreadcrumbItem>
            {/* TODO: https://github.com/OpenMined/courses-app/issues/53 */}
            <BreadcrumbLink href={`/courses/${course}/project`} target="_self">
              {/* <BreadcrumbLink as={RRDLink} to={`/courses/${course}/project`}> */}
              {projectTitle}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>{title}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <Link
          as="a"
          href={discussionLink}
          target="_blank"
          rel="noopener noreferrer"
          color="gray.600"
          _hover={{ color: 'gray.800' }}
          variant="flat"
          mt={[2, null, 0]}
        >
          <Flex align="center">
            <Icon icon={faCommentAlt} mr={2} />
            <Text>Get Help</Text>
          </Flex>
        </Link>
      </Flex>
      <Grid templateColumns="repeat(12, 1fr)" mt={8}>
        <GridItem colSpan={1} mb={[4, null, null, 0]}>
          <Circle bg="gray.800" color="white" fontWeight="bold" size={8}>
            {number}
          </Circle>
        </GridItem>
        <GridItem colSpan={[12, null, null, 10]}>
          <Heading as="h1" size="xl" mt={-1} mb={4}>
            {title}
          </Heading>
          <Flex
            direction={['column', null, 'row']}
            justify="space-between"
            align="center"
            mb={8}
          >
            <SubmissionBoxes submissions={submissions} flex={1} />
            <Text
              fontSize="sm"
              fontStyle="italic"
              color="gray.700"
              ml={4}
              mt={[2, null, 0]}
            >
              {submissions.filter(({ status }) => status !== 'none').length ||
                0}{' '}
              of {PROJECT_PART_SUBMISSIONS} attempts
            </Text>
          </Flex>
          {submissions.length > 0 && (
            <Box mb={6}>
              {submissions.map((submission, index) => (
                <SubmissionInline
                  key={index}
                  link={`/courses/${course}/project/${part}/${index + 1}`}
                  {...submission}
                />
              ))}
            </Box>
          )}
          {attemptData && attemptData.review_content && (
            <Box mb={6}>
              <Flex align="center" mb={3} color="gray.700">
                <Text>
                  Submitted {dayjs(attemptData.submitted_at.toDate()).fromNow()}
                </Text>
                <Text mx={4}>|</Text>
                <Text>
                  Reviewed{' '}
                  {dayjs(attemptData.review_ended_at.toDate()).fromNow()}
                </Text>
              </Flex>
              <ReviewStatus status={attemptData.status} />
            </Box>
          )}
          <ColoredTabs mb={8} content={tabsContent} />
          <Flex justify="space-between" align="center">
            <Button
              // TODO: https://github.com/OpenMined/courses-app/issues/53
              // as={RRDLink}
              // to={`/courses/${course}/project`}
              as="a"
              href={`/courses/${course}/project`}
              target="_self"
              variant="outline"
              colorScheme="black"
            >
              Back to Project
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
                      src="https://emojis.slackmojis.com/emojis/images/1605478401/10874/cool_cowboy.png?1605478401"
                      boxSize={12}
                      mb={6}
                    />
                    <Heading as="p" size="xl" mb={6}>
                      Woah there, cowboy!
                    </Heading>
                    <SubmissionBoxes submissions={submissions} mb={6} />
                    <Text color="gray.400" mb={6}>
                      You have a total of 3 attempts on this part of the
                      project, before you submit make sure you check the rubric.
                      If you’re ready click submit, if not click cancel.
                    </Text>
                  </Flex>
                </ModalBody>
                <ModalFooter>
                  <Button
                    colorScheme="blue"
                    mr={3}
                    onClick={() => {
                      // Submit the attempt with the _key of the part and the content of the editor
                      onAttemptSubmission(
                        _key,
                        localStorage.getItem(EDITOR_STORAGE_STRING)
                      );
                    }}
                    isLoading={hasClickedButton}
                  >
                    Continue
                  </Button>
                  <Button
                    variant="ghost"
                    colorScheme="white"
                    onClick={preSubmitModal.onClose}
                    isDisabled={hasClickedButton}
                  >
                    Cancel
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
            {!attemptData && hasStartedSubmission && (
              <Button onClick={preSubmitModal.onOpen} colorScheme="black">
                Submit
              </Button>
            )}
          </Flex>
        </GridItem>
      </Grid>
    </Box>
  );
};
